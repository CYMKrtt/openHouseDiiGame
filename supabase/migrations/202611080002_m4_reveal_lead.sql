-- Allow Realtime and polling clients to fetch the shared start time before the 4-second star.
create or replace function public.m4_start(p_source text) returns jsonb
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
