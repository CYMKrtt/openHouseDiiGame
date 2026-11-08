-- M3 Host sessions and persistent login throttling, server-only.
create table public.m3_host_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create table public.m3_login_limit (
  singleton boolean primary key default true check(singleton),
  window_start timestamptz not null,
  attempts integer not null
);
insert into public.m3_login_limit values(true,clock_timestamp(),0);
alter table public.m3_host_sessions enable row level security;
alter table public.m3_login_limit enable row level security;
revoke all on public.m3_host_sessions,public.m3_login_limit from public,anon,authenticated;

create function public.m3_reserve_login_attempt() returns boolean language plpgsql security definer set search_path='' as $$
declare row_data public.m3_login_limit%rowtype; now_at timestamptz:=clock_timestamp();
begin
 select * into row_data from public.m3_login_limit where singleton for update;
 if row_data.window_start <= now_at - interval '60 seconds' then
   update public.m3_login_limit set window_start=now_at,attempts=1 where singleton; return true;
 end if;
 if row_data.attempts>=5 then return false; end if;
 update public.m3_login_limit set attempts=attempts+1 where singleton; return true;
end $$;
create function public.m3_create_host_session(p_hash text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INPUT'; end if;
 insert into public.m3_host_sessions(token_hash,expires_at) values(p_hash,clock_timestamp()+interval '8 hours');
end $$;
create function public.m3_host_authenticated(p_hash text) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.m3_host_sessions where token_hash=p_hash and revoked_at is null and expires_at>clock_timestamp())
$$;
create function public.m3_revoke_host_session(p_hash text) returns void language sql security definer set search_path='' as $$
 update public.m3_host_sessions set revoked_at=clock_timestamp() where token_hash=p_hash and revoked_at is null
$$;
revoke all on function public.m3_reserve_login_attempt(), public.m3_create_host_session(text), public.m3_host_authenticated(text), public.m3_revoke_host_session(text) from public,anon,authenticated;
grant execute on function public.m3_reserve_login_attempt(), public.m3_create_host_session(text), public.m3_host_authenticated(text), public.m3_revoke_host_session(text) to service_role;
