-- Run once in Supabase > SQL Editor. Makes each team judged by ONE judge only
-- (first judge to save a score for a team claims it; others see it locked).

create or replace function public.portal_get_teams(u text, p text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare j public.judges;
begin
  j := public._auth(u,p);
  return (select coalesce(json_agg(json_build_object(
      'id', t.id, 'name', t.name, 'members', t.members,
      'c1', s.c1, 'c2', s.c2, 'c3', s.c3, 'c4', s.c4, 'c5', s.c5, 'c6', s.c6,
      'remarks', s.remarks,
      'taken_by', (select jd.display_name from public.scores o
                   join public.judges jd on jd.id = o.judge_id
                   where o.team_id = t.id and o.judge_id <> j.id limit 1)
      ) order by t.id), '[]'::json)
    from public.teams t
    left join public.scores s on s.team_id = t.id and s.judge_id = j.id);
end $$;

create or replace function public.portal_save_score(u text, p text, team int,
  v1 numeric, v2 numeric, v3 numeric, v4 numeric, v5 numeric, v6 numeric, note text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare j public.judges; other text;
begin
  j := public._auth(u,p);
  perform pg_advisory_xact_lock(team);
  select jd.display_name into other from public.scores o
    join public.judges jd on jd.id = o.judge_id
    where o.team_id = team and o.judge_id <> j.id limit 1;
  if other is not null then
    raise exception 'This team is already being judged by %', other;
  end if;
  insert into public.scores(judge_id, team_id, c1, c2, c3, c4, c5, c6, remarks, updated_at)
  values (j.id, team, v1, v2, v3, v4, v5, v6, note, now())
  on conflict (judge_id, team_id) do update set
    c1=excluded.c1, c2=excluded.c2, c3=excluded.c3, c4=excluded.c4, c5=excluded.c5, c6=excluded.c6,
    remarks=excluded.remarks, updated_at=now();
  return json_build_object('ok', true);
end $$;
