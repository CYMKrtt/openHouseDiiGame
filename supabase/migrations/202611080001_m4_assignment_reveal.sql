-- M4: one durable start and immutable balanced assignments.
alter table public.m3_session
 add column committed_at timestamptz,
 add column reveal_start_at timestamptz,
 add column start_source text,
 add constraint m4_commit_metadata check (
  (status='waiting' and committed_at is null and reveal_start_at is null and start_source is null)
  or (status='committed' and committed_at is not null and reveal_start_at is not null and start_source in ('host','auto'))
 );

create table public.m4_assignments (
 player_id uuid primary key references public.m3_players(id),
 company_id text not null check (company_id in ('tech','design','ecommerce')),
 committed_at timestamptz not null
);
alter table public.m4_assignments enable row level security;
revoke all on public.m4_assignments from public,anon,authenticated;
create function public.m4_assignment_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' and (select status from public.m3_session where singleton)='waiting' then return new; end if;
 raise exception 'ASSIGNMENTS_IMMUTABLE';
end $$;
create trigger m4_assignment_guard before insert or update or delete on public.m4_assignments
for each row execute function public.m4_assignment_guard();
revoke all on function public.m4_assignment_guard() from public,anon,authenticated;

-- gen_random_uuid uses a cryptographic generator. The first four UUID bytes are
-- random; rejection sampling removes modulo bias for a one-based index.
create function public.m4_random_index(p_max integer) returns integer
language plpgsql volatile security definer set search_path='' as $$
declare bytes bytea; value bigint; ceiling bigint;
begin
 if p_max < 1 or p_max > 15 then raise exception 'INVALID_INPUT'; end if;
 ceiling := 4294967296::bigint - (4294967296::bigint % p_max);
 loop
  bytes := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  value := pg_catalog.get_byte(bytes,0)::bigint*16777216
         + pg_catalog.get_byte(bytes,1)::bigint*65536
         + pg_catalog.get_byte(bytes,2)::bigint*256
         + pg_catalog.get_byte(bytes,3)::bigint;
  exit when value < ceiling;
 end loop;
 return (value % p_max)::integer + 1;
end $$;

create function public.m4_start(p_source text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare current_state public.m3_session%rowtype; online_count integer; ids uuid[];
        teams text[] := array['tech','design','ecommerce']; n integer;
        i integer; j integer; swap_id uuid; swap_team text; committed_time timestamptz;
begin
 if p_source not in ('host','auto') or p_source is null then raise exception 'INVALID_INPUT'; end if;
 select * into current_state from public.m3_session where singleton for update;
 if current_state.status='committed' then
  return public.m3_public_state() || jsonb_build_object('alreadyCommitted',true,'startSource',current_state.start_source);
 end if;
 select count(distinct player_id)::integer into online_count
 from public.m3_connections where revoked_at is null and lease_expires_at > clock_timestamp();
 if (p_source='host' and online_count<1) or (p_source='auto' and online_count<>15) then
  raise exception 'START_CONDITION_NOT_MET';
 end if;
 select array_agg(id order by reserved_at,id) into ids from public.m3_players;
 n:=coalesce(array_length(ids,1),0);
 if n<online_count or n>15 then raise exception 'START_CONDITION_NOT_MET'; end if;
 for i in reverse n..2 loop
  j:=public.m4_random_index(i);swap_id:=ids[i];ids[i]:=ids[j];ids[j]:=swap_id;
 end loop;
 for i in reverse 3..2 loop
  j:=public.m4_random_index(i);swap_team:=teams[i];teams[i]:=teams[j];teams[j]:=swap_team;
 end loop;
 committed_time:=clock_timestamp();
 for i in 1..n loop
  insert into public.m4_assignments(player_id,company_id,committed_at)
  values(ids[i],teams[((i-1)%3)+1],committed_time);
 end loop;
 update public.m3_session set status='committed',committed_at=committed_time,
  reveal_start_at=committed_time+interval '5 seconds',start_source=p_source where singleton;
 perform public.m3_bump_revision();
 return public.m3_public_state() || jsonb_build_object('alreadyCommitted',false,'startSource',p_source);
end $$;

create or replace function public.m3_public_state() returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('phase',s.status,'revision',s.revision,'onlineCount',
  (select count(distinct player_id) from public.m3_connections where revoked_at is null and lease_expires_at > clock_timestamp()),
  'capacity',15,'serverTime',clock_timestamp(),'revealStartAt',s.reveal_start_at)
 from public.m3_session s where singleton
$$;
create or replace function public.m3_player_state(p_hash text) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('playerId',p.id,'displayName',p.display_name,'phase',s.status,
  'companyId',case when s.status='committed' then a.company_id else null end,
  'revealStartAt',s.reveal_start_at,'serverTime',clock_timestamp())
 from public.m3_players p cross join public.m3_session s
 left join public.m4_assignments a on a.player_id=p.id
 where p.identity_hash=p_hash and s.singleton
$$;
create or replace function public.m3_host_state() returns jsonb
language sql security definer set search_path='' as $$
 select public.m3_public_state() || jsonb_build_object('reservedCount',(select count(*) from public.m3_players),'players',coalesce((
  select jsonb_agg(jsonb_build_object('id',p.id,'displayName',p.display_name,'isOnline',exists(
   select 1 from public.m3_connections c where c.player_id=p.id and c.revoked_at is null and c.lease_expires_at > clock_timestamp()),
   'companyId',case when s.status='committed' then a.company_id else null end) order by p.reserved_at,p.id)
  from public.m3_players p left join public.m4_assignments a on a.player_id=p.id),'[]'::jsonb))
 from public.m3_session s where s.singleton
$$;

create or replace function public.m3_heartbeat(p_hash text,p_connection uuid,p_generation uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pid uuid; was_online boolean; matched uuid; now_at timestamptz:=clock_timestamp();
begin
 perform 1 from public.m3_session where singleton for update;
 select id into pid from public.m3_players where identity_hash=p_hash;
 if pid is null then raise exception 'PLAYER_REQUIRED'; end if;
 select exists(select 1 from public.m3_connections where player_id=pid and revoked_at is null and lease_expires_at>now_at) into was_online;
 insert into public.m3_connections(id,player_id,generation,lease_expires_at,revoked_at)
 values(p_connection,pid,p_generation,now_at+interval '45 seconds',null)
 on conflict(id) do update set generation=excluded.generation,lease_expires_at=excluded.lease_expires_at,revoked_at=null
 where public.m3_connections.player_id=excluded.player_id and public.m3_connections.generation=excluded.generation and public.m3_connections.revoked_at is null
 returning id into matched;
 if matched is null then raise exception 'CONNECTION_CONFLICT'; end if;
 if not was_online then perform public.m3_bump_revision(); end if;
 if (select status from public.m3_session where singleton)='waiting' and
    (select count(distinct player_id) from public.m3_connections where revoked_at is null and lease_expires_at>clock_timestamp())=15 then
  perform public.m4_start('auto');
 end if;
 return public.m3_public_state();
end $$;

revoke all on function public.m4_random_index(integer),public.m4_start(text) from public,anon,authenticated;
grant execute on function public.m4_start(text) to service_role;
