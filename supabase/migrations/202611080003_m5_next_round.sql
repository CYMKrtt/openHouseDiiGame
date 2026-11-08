-- Keep the original session and participants as the first round.
alter table public.m3_session
  drop constraint m3_session_pkey,
  drop constraint m3_session_singleton_check,
  add column round_id uuid primary key default gen_random_uuid(),
  add column previous_round_id uuid unique references public.m3_session(round_id),
  add column ended_at timestamptz,
  add constraint m5_round_lifecycle check (
    (singleton and ended_at is null) or
    (not singleton and status = 'committed' and ended_at is not null)
  );
create unique index m5_one_active_round on public.m3_session(singleton) where singleton;

alter table public.m3_players add column round_id uuid references public.m3_session(round_id);
update public.m3_players set round_id = (select round_id from public.m3_session where singleton);
alter table public.m3_players
  alter column round_id set not null,
  drop constraint m3_players_identity_hash_key,
  add constraint m5_round_identity unique (round_id, identity_hash);

-- Every round mutation locks the permanent revision row before reading the active round.
create function public.m5_lock_round(p_round uuid) returns public.m3_session
language plpgsql set search_path = '' as $$
declare active_round public.m3_session%rowtype;
begin
  perform 1 from public.m3_revision_notice where singleton for update;
  select * into strict active_round from public.m3_session where singleton;
  if p_round is distinct from active_round.round_id then raise exception 'ROUND_CHANGED'; end if;
  return active_round;
end $$;

create or replace function public.m3_bump_revision() returns void
language plpgsql security definer set search_path = '' as $$
declare next_revision bigint;
begin
  update public.m3_revision_notice set revision = revision + 1 where singleton returning revision into next_revision;
  update public.m3_session set revision = next_revision where singleton;
end $$;

create function public.m5_online_count(p_round uuid, p_at timestamptz) returns integer
language sql stable set search_path = '' as $$
  select count(distinct c.player_id)::integer
  from public.m3_connections c join public.m3_players p on p.id = c.player_id
  where p.round_id = p_round and c.revoked_at is null and c.lease_expires_at > p_at
$$;

create or replace function public.m3_public_state() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'roundId', s.round_id, 'phase', s.status, 'revision', s.revision,
    'onlineCount', public.m5_online_count(s.round_id, statement_timestamp()),
    'capacity', 15, 'serverTime', statement_timestamp(), 'revealStartAt', s.reveal_start_at)
  from public.m3_session s where s.singleton
$$;

create or replace function public.m3_player_state(p_hash text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'roundId', s.round_id, 'playerId', p.id, 'displayName', p.display_name,
    'phase', s.status, 'companyId', a.company_id,
    'revealStartAt', s.reveal_start_at, 'serverTime', statement_timestamp())
  from public.m3_session s join public.m3_players p on p.round_id = s.round_id
  left join public.m4_assignments a on a.player_id = p.id
  where s.singleton and p.identity_hash = p_hash
$$;

create function public.m5_bootstrap(p_hash text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('own', public.m3_player_state(p_hash), 'state', public.m3_public_state())
$$;

create or replace function public.m3_host_state() returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.m3_public_state() || jsonb_build_object(
    'reservedCount', count(p.id),
    'canNextRound', coalesce(s.reveal_start_at + interval '4 seconds' <= statement_timestamp(), false),
    'players', coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'displayName', p.display_name, 'companyId', a.company_id,
      'isOnline', exists(select 1 from public.m3_connections c
        where c.player_id = p.id and c.revoked_at is null and c.lease_expires_at > statement_timestamp())
    ) order by p.reserved_at, p.id) filter (where p.id is not null), '[]'::jsonb))
  from public.m3_session s
  left join public.m3_players p on p.round_id = s.round_id
  left join public.m4_assignments a on a.player_id = p.id
  where s.singleton group by s.round_id
$$;

create or replace function public.m4_assignment_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and exists (
    select 1 from public.m3_players p join public.m3_session s on s.round_id = p.round_id
    where p.id = new.player_id and s.singleton and s.status = 'waiting'
  ) then return new; end if;
  raise exception 'ASSIGNMENTS_IMMUTABLE';
end $$;

create function public.m5_join(p_round uuid, p_hash text, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare active_round public.m3_session%rowtype;
begin
  active_round := public.m5_lock_round(p_round);
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or
     p_name is null or length(p_name) not between 1 and 1024 then raise exception 'INVALID_INPUT'; end if;
  if exists (select 1 from public.m3_players where round_id = p_round and identity_hash = p_hash) then
    return public.m3_player_state(p_hash);
  end if;
  if active_round.status <> 'waiting' then raise exception 'SESSION_STARTED'; end if;
  if (select count(*) from public.m3_players where round_id = p_round) >= 15 then
    raise exception 'CAPACITY_FULL';
  end if;
  insert into public.m3_players(round_id, identity_hash, display_name) values (p_round, p_hash, p_name);
  perform public.m3_bump_revision();
  return public.m3_player_state(p_hash);
end $$;

-- The assignment draw is the M4 algorithm, restricted to the locked round.
create function public.m5_start(p_round uuid, p_source text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  active_round public.m3_session%rowtype;
  online_count integer;
  ids uuid[];
  teams text[] := array['tech','design','ecommerce'];
  n integer;
  i integer;
  j integer;
  swap_id uuid;
  swap_team text;
  committed_time timestamptz;
begin
  active_round := public.m5_lock_round(p_round);
  if p_source is null or p_source not in ('host', 'auto') then raise exception 'INVALID_INPUT'; end if;
  if active_round.status = 'committed' then
    return public.m3_public_state() || jsonb_build_object('alreadyCommitted', true, 'startSource', active_round.start_source);
  end if;
  online_count := public.m5_online_count(p_round, clock_timestamp());
  if (p_source = 'host' and online_count < 1) or (p_source = 'auto' and online_count <> 15) then
    raise exception 'START_CONDITION_NOT_MET';
  end if;
  select array_agg(id order by reserved_at, id) into ids from public.m3_players where round_id = p_round;
  n := coalesce(array_length(ids, 1), 0);
  if n < online_count or n > 15 then raise exception 'START_CONDITION_NOT_MET'; end if;
  for i in reverse n..2 loop
    j := public.m4_random_index(i);
    swap_id := ids[i]; ids[i] := ids[j]; ids[j] := swap_id;
  end loop;
  for i in reverse 3..2 loop
    j := public.m4_random_index(i);
    swap_team := teams[i]; teams[i] := teams[j]; teams[j] := swap_team;
  end loop;
  committed_time := clock_timestamp();
  for i in 1..n loop
    insert into public.m4_assignments(player_id, company_id, committed_at)
    values (ids[i], teams[((i - 1) % 3) + 1], committed_time);
  end loop;
  update public.m3_session set status = 'committed', committed_at = committed_time,
    reveal_start_at = committed_time + interval '5 seconds', start_source = p_source where round_id = p_round;
  perform public.m3_bump_revision();
  return public.m3_public_state() || jsonb_build_object('alreadyCommitted', false, 'startSource', p_source);
end $$;

create function public.m5_presence(p_round uuid, p_hash text, p_connection uuid, p_generation uuid, p_disconnect boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  active_round public.m3_session%rowtype;
  player uuid;
  matched uuid;
  had_live boolean;
  has_live boolean;
  now_at timestamptz;
begin
  active_round := public.m5_lock_round(p_round);
  now_at := clock_timestamp();
  select id into player from public.m3_players where round_id = p_round and identity_hash = p_hash;
  if player is null then raise exception 'PLAYER_REQUIRED'; end if;
  select exists(select 1 from public.m3_connections
    where player_id = player and revoked_at is null and lease_expires_at > now_at) into had_live;
  if p_disconnect then
    update public.m3_connections set revoked_at = now_at
    where id = p_connection and player_id = player and generation = p_generation and revoked_at is null;
  else
    insert into public.m3_connections(id, player_id, generation, lease_expires_at)
    values (p_connection, player, p_generation, now_at + interval '45 seconds')
    on conflict (id) do update set lease_expires_at = excluded.lease_expires_at
    where public.m3_connections.player_id = player and public.m3_connections.generation = p_generation
      and public.m3_connections.revoked_at is null
    returning id into matched;
    if matched is null then raise exception 'CONNECTION_CONFLICT'; end if;
  end if;
  select exists(select 1 from public.m3_connections
    where player_id = player and revoked_at is null and lease_expires_at > now_at) into has_live;
  if had_live <> has_live then perform public.m3_bump_revision(); end if;
  if not p_disconnect and active_round.status = 'waiting' and public.m5_online_count(p_round, clock_timestamp()) = 15 then
    perform public.m5_start(p_round, 'auto');
  end if;
  return public.m3_public_state();
end $$;

create function public.m5_next_round(p_round uuid, p_host_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  active_round public.m3_session%rowtype;
  successor uuid;
  ended timestamptz;
begin
  perform 1 from public.m3_revision_notice where singleton for update;
  if not public.m3_host_authenticated(p_host_hash) then raise exception 'HOST_AUTH_REQUIRED'; end if;
  select round_id into successor from public.m3_session where previous_round_id = p_round;
  if found then return jsonb_build_object('roundId', successor, 'alreadyRotated', true); end if;
  select * into active_round from public.m3_session where singleton;
  if active_round.round_id is distinct from p_round then raise exception 'ROUND_CHANGED'; end if;
  ended := clock_timestamp();
  if active_round.status <> 'committed' or active_round.reveal_start_at + interval '4 seconds' > ended then
    raise exception 'REVEAL_IN_PROGRESS';
  end if;

  update public.m3_connections c set revoked_at = ended
  from public.m3_players p where c.player_id = p.id and p.round_id = p_round and c.revoked_at is null;
  update public.m3_session set singleton = false, ended_at = ended where round_id = p_round;
  insert into public.m3_session(previous_round_id) values (p_round) returning round_id into successor;
  perform public.m3_bump_revision();
  return jsonb_build_object('roundId', successor, 'alreadyRotated', false);
end $$;

-- Retire unscoped writes so a client from a previous deployment cannot mutate the new round.
drop function public.m3_join(text, text), public.m3_heartbeat(text, uuid, uuid),
  public.m3_disconnect(text, uuid, uuid), public.m4_start(text);
revoke all on function public.m5_lock_round(uuid), public.m5_online_count(uuid, timestamptz),
  public.m5_bootstrap(text), public.m5_join(uuid, text, text), public.m5_start(uuid, text),
  public.m5_presence(uuid, text, uuid, uuid, boolean), public.m5_next_round(uuid, text)
  from public, anon, authenticated;
grant execute on function public.m5_bootstrap(text), public.m5_join(uuid, text, text),
  public.m5_start(uuid, text), public.m5_presence(uuid, text, uuid, uuid, boolean),
  public.m5_next_round(uuid, text) to service_role;
