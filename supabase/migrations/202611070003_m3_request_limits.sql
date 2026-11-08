-- Shared, database-backed request throttling for M3. No background process is required.
create table public.m3_request_limits (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table public.m3_request_limits enable row level security;
revoke all on public.m3_request_limits from public,anon,authenticated;
create function public.m3_allow_request(p_key text) returns boolean language plpgsql security definer set search_path='' as $$
declare now_at timestamptz:=clock_timestamp(); global_count integer; client_count integer;
begin
 if p_key !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_INPUT'; end if;
 insert into public.m3_request_limits(bucket,window_start,attempts) values('global',now_at,1)
 on conflict(bucket) do update set
   window_start=case when public.m3_request_limits.window_start<=now_at-interval '60 seconds' then now_at else public.m3_request_limits.window_start end,
   attempts=case when public.m3_request_limits.window_start<=now_at-interval '60 seconds' then 1 else public.m3_request_limits.attempts+1 end
 returning attempts into global_count;
 if global_count>1200 then return false; end if;
 insert into public.m3_request_limits(bucket,window_start,attempts) values('id:'||p_key,now_at,1)
 on conflict(bucket) do update set
   window_start=case when public.m3_request_limits.window_start<=now_at-interval '60 seconds' then now_at else public.m3_request_limits.window_start end,
   attempts=case when public.m3_request_limits.window_start<=now_at-interval '60 seconds' then 1 else public.m3_request_limits.attempts+1 end
 returning attempts into client_count;
 delete from public.m3_request_limits where bucket in (
   select bucket from public.m3_request_limits where bucket<>'global' and window_start<now_at-interval '2 minutes' limit 32
 );
 return client_count<=120;
end $$;
revoke all on function public.m3_allow_request(text) from public,anon,authenticated;
grant execute on function public.m3_allow_request(text) to service_role;
