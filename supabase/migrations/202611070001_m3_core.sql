-- M3 development schema. No assignment/start implementation is included.
create table public.m3_session (
  singleton boolean primary key default true check (singleton),
  status text not null default 'waiting' check (status in ('waiting', 'committed')),
  revision bigint not null default 0
);
insert into public.m3_session(singleton) values (true);

create table public.m3_players (
  id uuid primary key default gen_random_uuid(),
  identity_hash text not null unique check (identity_hash ~ '^[0-9a-f]{64}$'),
  display_name text not null,
  reserved_at timestamptz not null default clock_timestamp()
);
create table public.m3_connections (
  id uuid primary key,
  player_id uuid not null references public.m3_players(id),
  generation uuid not null,
  lease_expires_at timestamptz not null,
  revoked_at timestamptz
);
create index m3_connections_player_lease on public.m3_connections(player_id, lease_expires_at) where revoked_at is null;
-- This is the only public Realtime payload: no player identities, names or roster.
create table public.m3_revision_notice (
  singleton boolean primary key default true check(singleton),
  revision bigint not null default 0
);
insert into public.m3_revision_notice(singleton) values (true);

alter table public.m3_session enable row level security;
alter table public.m3_players enable row level security;
alter table public.m3_connections enable row level security;
alter table public.m3_revision_notice enable row level security;
revoke all on public.m3_session, public.m3_players, public.m3_connections, public.m3_revision_notice from public, anon, authenticated;
grant select on public.m3_revision_notice to anon, authenticated;
create policy m3_public_revision on public.m3_revision_notice for select to anon, authenticated using (true);

create function public.m3_bump_revision() returns void language plpgsql security definer set search_path = '' as $$
declare r bigint;
begin
  update public.m3_session set revision = revision + 1 where singleton returning revision into r;
  update public.m3_revision_notice set revision = r where singleton;
end $$;

create function public.m3_join(p_hash text, p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare player public.m3_players%rowtype; state text; n integer;
begin
  if p_hash !~ '^[0-9a-f]{64}$' or p_name is null or length(p_name) = 0 or length(p_name) > 1024 then raise exception 'INVALID_INPUT'; end if;
  select status into state from public.m3_session where singleton for update;
  select * into player from public.m3_players where identity_hash = p_hash;
  if found then return jsonb_build_object('playerId', player.id, 'displayName', player.display_name, 'phase', state); end if;
  if state <> 'waiting' then raise exception 'SESSION_STARTED'; end if;
  select count(*) into n from public.m3_players;
  if n >= 15 then raise exception 'CAPACITY_FULL'; end if;
  insert into public.m3_players(identity_hash, display_name) values(p_hash, p_name) returning * into player;
  perform public.m3_bump_revision();
  return jsonb_build_object('playerId',player.id,'displayName',player.display_name,'phase',state);
end $$;

create function public.m3_heartbeat(p_hash text, p_connection uuid, p_generation uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare pid uuid; was_online boolean; matched uuid; now_at timestamptz := clock_timestamp();
begin
  perform 1 from public.m3_session where singleton for update;
  select id into pid from public.m3_players where identity_hash = p_hash;
  if pid is null then raise exception 'PLAYER_REQUIRED'; end if;
  select exists(select 1 from public.m3_connections where player_id=pid and revoked_at is null and lease_expires_at > now_at) into was_online;
  insert into public.m3_connections(id,player_id,generation,lease_expires_at,revoked_at)
    values(p_connection,pid,p_generation,now_at+interval '45 seconds',null)
    on conflict(id) do update set generation=excluded.generation, lease_expires_at=excluded.lease_expires_at, revoked_at=null
    where public.m3_connections.player_id=excluded.player_id and public.m3_connections.generation=excluded.generation and public.m3_connections.revoked_at is null
    returning id into matched;
  if matched is null then raise exception 'CONNECTION_CONFLICT'; end if;
  if not was_online then perform public.m3_bump_revision(); end if;
  return public.m3_public_state();
end $$;

create function public.m3_disconnect(p_hash text, p_connection uuid, p_generation uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare pid uuid; had_live boolean; has_live boolean; now_at timestamptz := clock_timestamp();
begin
  perform 1 from public.m3_session where singleton for update;
  select id into pid from public.m3_players where identity_hash=p_hash;
  if pid is null then raise exception 'PLAYER_REQUIRED'; end if;
  select exists(select 1 from public.m3_connections where player_id=pid and revoked_at is null and lease_expires_at>now_at) into had_live;
  update public.m3_connections set revoked_at=now_at where id=p_connection and player_id=pid and generation=p_generation and revoked_at is null;
  select exists(select 1 from public.m3_connections where player_id=pid and revoked_at is null and lease_expires_at>now_at) into has_live;
  if had_live and not has_live then perform public.m3_bump_revision(); end if;
  return public.m3_public_state();
end $$;

create function public.m3_public_state() returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object('phase', s.status, 'revision', s.revision, 'onlineCount',
    (select count(distinct player_id) from public.m3_connections where revoked_at is null and lease_expires_at > clock_timestamp()),
    'capacity',15,'serverTime',clock_timestamp()) from public.m3_session s where singleton
$$;
create function public.m3_player_state(p_hash text) returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object('playerId',p.id,'displayName',p.display_name,'phase',s.status)
  from public.m3_players p cross join public.m3_session s where p.identity_hash=p_hash and s.singleton
$$;
create function public.m3_host_state() returns jsonb language sql security definer set search_path = '' as $$
  select public.m3_public_state() || jsonb_build_object('reservedCount',(select count(*) from public.m3_players),'players',coalesce((
    select jsonb_agg(jsonb_build_object('id',p.id,'displayName',p.display_name,'isOnline',exists(
      select 1 from public.m3_connections c where c.player_id=p.id and c.revoked_at is null and c.lease_expires_at > clock_timestamp())) order by p.reserved_at,p.id)
    from public.m3_players p),'[]'::jsonb))
$$;

revoke all on function public.m3_bump_revision(), public.m3_join(text,text), public.m3_heartbeat(text,uuid,uuid), public.m3_disconnect(text,uuid,uuid), public.m3_public_state(), public.m3_player_state(text), public.m3_host_state() from public, anon, authenticated;
grant execute on function public.m3_join(text,text), public.m3_heartbeat(text,uuid,uuid), public.m3_disconnect(text,uuid,uuid), public.m3_public_state(), public.m3_player_state(text), public.m3_host_state() to service_role;
-- Supabase uses this publication for the non-sensitive revision notification.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.m3_revision_notice;
  end if;
end $$;
