-- M6: assign companies from the five-question quiz, the moment each player submits.
-- Apply after M5 on a disposable test/staging database only.
-- Scoring runs in the app (src/lib/quizScoring.ts); the database stores the answers and the
-- resulting candidate companies, then picks the company (mirrors pickCompany / assignCompanies).
-- Host "start" (m5_start) now means "close round": stop new joins and give players who did not
-- finish the least-filled companies. The round also closes by itself once all 15 seats have a result.

create table public.m6_quiz_answers (
  player_id uuid primary key references public.m3_players(id),
  answers text[] not null check (
    array_ndims(answers) = 1 and coalesce(array_length(answers, 1), 0) = 5
    and array_position(answers, null) is null and answers <@ array['dev','design','biznet']::text[]),
  candidates text[] not null check (
    array_ndims(candidates) = 1 and coalesce(array_length(candidates, 1), 0) between 1 and 3
    and array_position(candidates, null) is null and candidates <@ array['tech','design','ecommerce']::text[]),
  submitted_at timestamptz not null default clock_timestamp()
);
alter table public.m6_quiz_answers enable row level security;
revoke all on public.m6_quiz_answers from public, anon, authenticated;

-- Answers can change only while the player's round is still open.
create function public.m6_quiz_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid := case when tg_op = 'DELETE' then old.player_id else new.player_id end;
begin
  if tg_op <> 'DELETE' and exists (
    select 1 from public.m3_players p join public.m3_session s on s.round_id = p.round_id
    where p.id = target and s.singleton and s.status = 'waiting'
  ) then return new; end if;
  raise exception 'QUIZ_LOCKED';
end $$;
create trigger m6_quiz_guard before insert or update or delete on public.m6_quiz_answers
for each row execute function public.m6_quiz_guard();
revoke all on function public.m6_quiz_guard() from public, anon, authenticated;

create function public.m6_company_count(p_round uuid, p_company text) returns integer
language sql stable set search_path = '' as $$
  select count(*)::integer from public.m4_assignments a join public.m3_players p on p.id = a.player_id
  where p.round_id = p_round and a.company_id = p_company
$$;

-- One candidate: that company. Tied candidates: the one with fewer members now; equal counts keep candidates[1].
create function public.m6_pick_company(p_round uuid, p_candidates text[]) returns text
language plpgsql stable set search_path = '' as $$
declare pick text := p_candidates[1]; company text;
begin
  foreach company in array p_candidates loop
    if public.m6_company_count(p_round, company) < public.m6_company_count(p_round, pick) then pick := company; end if;
  end loop;
  return pick;
end $$;

create function public.m6_submit_quiz(p_round uuid, p_hash text, p_answers text[], p_candidates text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare active_round public.m3_session%rowtype; player uuid;
begin
  active_round := public.m5_lock_round(p_round);
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
     or p_answers is null or array_ndims(p_answers) <> 1 or array_length(p_answers, 1) <> 5
     or array_position(p_answers, null) is not null or not (p_answers <@ array['dev','design','biznet']::text[])
     or p_candidates is null or array_ndims(p_candidates) <> 1 or array_length(p_candidates, 1) not between 1 and 3
     or array_position(p_candidates, null) is not null or not (p_candidates <@ array['tech','design','ecommerce']::text[])
  then raise exception 'INVALID_INPUT'; end if;
  select id into player from public.m3_players where round_id = p_round and identity_hash = p_hash;
  if player is null then raise exception 'PLAYER_REQUIRED'; end if;
  -- A result is final: a repeated submit returns the existing company unchanged.
  if exists (select 1 from public.m4_assignments where player_id = player) then
    return public.m3_player_state(p_hash);
  end if;
  if active_round.status <> 'waiting' then raise exception 'SESSION_STARTED'; end if;
  insert into public.m6_quiz_answers(player_id, answers, candidates, submitted_at)
  values (player, p_answers, p_candidates, clock_timestamp())
  on conflict (player_id) do update set answers = excluded.answers, candidates = excluded.candidates,
    submitted_at = excluded.submitted_at;
  insert into public.m4_assignments(player_id, company_id, committed_at)
  values (player, public.m6_pick_company(p_round, p_candidates), clock_timestamp());
  perform public.m3_bump_revision();
  -- Close the round automatically once all 15 seats have a result.
  if (select count(*) from public.m3_players where round_id = p_round) = 15 and not exists (
    select 1 from public.m3_players p where p.round_id = p_round
      and not exists (select 1 from public.m4_assignments a where a.player_id = p.id)
  ) then perform public.m5_start(p_round, 'auto'); end if;
  return public.m3_player_state(p_hash);
end $$;

-- Same name and arguments as M5, so the Host route and the presence auto-start keep working.
-- 'host' closes the round with at least one reserved player (online or not).
-- 'auto' closes only when all 15 seats have a result; otherwise it returns without changing anything.
create or replace function public.m5_start(p_round uuid, p_source text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  active_round public.m3_session%rowtype;
  ids uuid[];
  teams text[] := array['tech','design','ecommerce'];
  open_teams text[];
  n integer;
  i integer;
  j integer;
  fewest integer;
  pick text;
  swap_id uuid;
  late record;
  committed_time timestamptz;
begin
  active_round := public.m5_lock_round(p_round);
  if p_source is null or p_source not in ('host', 'auto') then raise exception 'INVALID_INPUT'; end if;
  if active_round.status = 'committed' then
    return public.m3_public_state() || jsonb_build_object('alreadyCommitted', true, 'startSource', active_round.start_source);
  end if;
  select count(*)::integer into n from public.m3_players where round_id = p_round;
  if p_source = 'host' and n < 1 then raise exception 'START_CONDITION_NOT_MET'; end if;
  if p_source = 'auto' and (n <> 15 or exists (
    select 1 from public.m3_players p where p.round_id = p_round
      and not exists (select 1 from public.m4_assignments a where a.player_id = p.id)
  )) then
    return public.m3_public_state() || jsonb_build_object('alreadyCommitted', false, 'startSource', null);
  end if;
  committed_time := clock_timestamp();

  -- Answered but not yet placed (only rows from before instant results): same pick as a submit.
  for late in
    select p.id, q.candidates
    from public.m3_players p join public.m6_quiz_answers q on q.player_id = p.id
    where p.round_id = p_round and not exists (select 1 from public.m4_assignments a where a.player_id = p.id)
    order by p.reserved_at, p.id
  loop
    insert into public.m4_assignments(player_id, company_id, committed_at)
    values (late.id, public.m6_pick_company(p_round, late.candidates), committed_time);
  end loop;

  -- No answers: a least-filled company, chosen at random among equals.
  select array_agg(p.id order by p.reserved_at, p.id) into ids
  from public.m3_players p
  where p.round_id = p_round and not exists (select 1 from public.m4_assignments a where a.player_id = p.id);
  n := coalesce(array_length(ids, 1), 0);
  for i in reverse n..2 loop
    j := public.m4_random_index(i);
    swap_id := ids[i]; ids[i] := ids[j]; ids[j] := swap_id;
  end loop;
  for i in 1..n loop
    fewest := least(public.m6_company_count(p_round, 'tech'), public.m6_company_count(p_round, 'design'),
      public.m6_company_count(p_round, 'ecommerce'));
    open_teams := array(select t from unnest(teams) with ordinality as u(t, ord)
      where public.m6_company_count(p_round, t) = fewest order by ord);
    pick := open_teams[public.m4_random_index(array_length(open_teams, 1))];
    insert into public.m4_assignments(player_id, company_id, committed_at) values (ids[i], pick, committed_time);
  end loop;

  update public.m3_session set status = 'committed', committed_at = committed_time,
    reveal_start_at = committed_time + interval '5 seconds', start_source = p_source where round_id = p_round;
  perform public.m3_bump_revision();
  return public.m3_public_state() || jsonb_build_object('alreadyCommitted', false, 'startSource', p_source);
end $$;

-- Return the player's own answers so the result page can show the analysis. Host state is unchanged.
create or replace function public.m3_player_state(p_hash text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'roundId', s.round_id, 'playerId', p.id, 'displayName', p.display_name,
    'phase', s.status, 'companyId', a.company_id,
    'revealStartAt', s.reveal_start_at, 'serverTime', statement_timestamp(),
    'quizAnswers', to_jsonb(q.answers))
  from public.m3_session s join public.m3_players p on p.round_id = s.round_id
  left join public.m4_assignments a on a.player_id = p.id
  left join public.m6_quiz_answers q on q.player_id = p.id
  where s.singleton and p.identity_hash = p_hash
$$;

revoke all on function public.m6_submit_quiz(uuid, text, text[], text[]), public.m6_company_count(uuid, text),
  public.m6_pick_company(uuid, text[]), public.m5_start(uuid, text), public.m3_player_state(text)
  from public, anon, authenticated;
grant execute on function public.m6_submit_quiz(uuid, text, text[], text[]), public.m5_start(uuid, text)
  to service_role;
