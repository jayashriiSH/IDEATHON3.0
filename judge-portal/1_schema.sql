-- IDEATHON 3.0 judge portal schema. Run once in Supabase > SQL Editor.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.teams(
  id int primary key, name text not null, members text not null);
create table if not exists public.judges(
  id serial primary key, username text unique not null, display_name text not null,
  pass_hash text not null, is_admin boolean not null default false);
create table if not exists public.scores(
  judge_id int references public.judges(id) on delete cascade,
  team_id int references public.teams(id) on delete cascade,
  c1 numeric check (c1 between 0 and 25),
  c2 numeric check (c2 between 0 and 20),
  c3 numeric check (c3 between 0 and 20),
  c4 numeric check (c4 between 0 and 15),
  c5 numeric check (c5 between 0 and 10),
  c6 numeric check (c6 between 0 and 10),
  remarks text, updated_at timestamptz default now(),
  primary key(judge_id, team_id));

-- No direct table access from the browser; everything goes through the functions below.
alter table public.teams enable row level security;
alter table public.judges enable row level security;
alter table public.scores enable row level security;

create or replace function public._auth(u text, p text) returns public.judges
language plpgsql security definer set search_path = public, extensions as $$
declare j public.judges;
begin
  select * into j from public.judges where username = lower(trim(u));
  if j.id is null or j.pass_hash <> crypt(p, j.pass_hash) then
    raise exception 'Invalid username or passcode';
  end if;
  return j;
end $$;

create or replace function public.portal_login(u text, p text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare j public.judges;
begin
  j := public._auth(u,p);
  return json_build_object('username', j.username, 'name', j.display_name, 'is_admin', j.is_admin);
end $$;

create or replace function public.portal_get_teams(u text, p text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare j public.judges;
begin
  j := public._auth(u,p);
  return (select coalesce(json_agg(json_build_object(
      'id', t.id, 'name', t.name, 'members', t.members,
      'c1', s.c1, 'c2', s.c2, 'c3', s.c3, 'c4', s.c4, 'c5', s.c5, 'c6', s.c6,
      'remarks', s.remarks) order by t.id), '[]'::json)
    from public.teams t
    left join public.scores s on s.team_id = t.id and s.judge_id = j.id);
end $$;

create or replace function public.portal_save_score(u text, p text, team int,
  v1 numeric, v2 numeric, v3 numeric, v4 numeric, v5 numeric, v6 numeric, note text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare j public.judges;
begin
  j := public._auth(u,p);
  insert into public.scores(judge_id, team_id, c1, c2, c3, c4, c5, c6, remarks, updated_at)
  values (j.id, team, v1, v2, v3, v4, v5, v6, note, now())
  on conflict (judge_id, team_id) do update set
    c1=excluded.c1, c2=excluded.c2, c3=excluded.c3, c4=excluded.c4, c5=excluded.c5, c6=excluded.c6,
    remarks=excluded.remarks, updated_at=now();
  return json_build_object('ok', true);
end $$;

create or replace function public.portal_admin_results(u text, p text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare j public.judges;
begin
  j := public._auth(u,p);
  if not j.is_admin then raise exception 'Admin only'; end if;
  return (select coalesce(json_agg(json_build_object(
      'team_id', s.team_id, 'judge', jd.display_name, 'judge_username', jd.username,
      'c1', s.c1, 'c2', s.c2, 'c3', s.c3, 'c4', s.c4, 'c5', s.c5, 'c6', s.c6,
      'remarks', s.remarks, 'updated_at', s.updated_at)), '[]'::json)
    from public.scores s join public.judges jd on jd.id = s.judge_id);
end $$;

revoke all on function public._auth(text,text) from public, anon, authenticated;
grant execute on function public.portal_login(text,text),
  public.portal_get_teams(text,text),
  public.portal_save_score(text,text,int,numeric,numeric,numeric,numeric,numeric,numeric,text),
  public.portal_admin_results(text,text) to anon, authenticated;

truncate public.teams cascade;
insert into public.teams(id,name,members) values
(1,'420','Hari Balamurugan, MohanRaja J, Sam Jerry'),
(2,'NeuroNova','Kiran Dev, Girinath V, Tharun B, Nishok R S'),
(3,'CtrlPray','Mokshit Vasistta M, Hatim Kausar, Prathmesh Thadkar, Abhigyan Dutta'),
(4,'California Burrito','Mayank Yadav, Nikhil Solanki, Rehaan Ajani, Debadrita Halder'),
(5,'ACE','Aaron Anish, Vijval Parakkat, Rishi Pradeep, Balaram Raju Radhakrishnan'),
(6,'HomeTeam','Jeyanth S, Arnav Tiwari, Shazur Rahman'),
(7,'ORBIT','Shyantika Saha Roy, Ranvijay Singh, Manasij Nayak, Samraggi Datta'),
(8,'CMG','Premkumar Adesh Mali, Druv Mishra'),
(9,'Ingenuity','Jaswanth Babu Reddi, Hemendra Reddy Indukuru, Vishal Ganesan'),
(10,'Sher-e-Punjab','Samanvay Agrawal, Jaivardhan Goyal, Kumar Pranav'),
(11,'NEXA','Abhinauya Varadharajan, K Nandhini, Shivani Eswarkumar'),
(12,'Visionary Vixens','Mohitha M, Kashithra Janarthanam, Mugila B, Ashwin Kalaimani'),
(13,'MENTES','Manisha Rajesh, Sahana, Preetham, Khanjan Devadhara'),
(14,'PopCode','Sriram Harigesh, Prathik .R.K, Komala priyan T, Yugesh'),
(15,'Thunderbolts','Aravind, Aaditya N.A, Souparna Baidya, K Afsal Ahamed'),
(16,'Starla','Akshansh Sharma, Ananta Singh'),
(17,'Mission: Possible','Vikraman .V, Prithiviraj GR, C H Mithun, S Darshan'),
(18,'jugadu_coderz','Ashmit Sharma, Ramswaroop Patel, Khushi Purohit'),
(19,'Godspeed','Shreyansh Kanojia, Brahmini Jasty, Muhammed Hafid Riyaz'),
(20,'HackGenesis','Ayaan Ahmad, John E Paul, Gnaneshwar GK, Advaith AK'),
(21,'Gawar','Eshanshuman Singh, Garima Singh, Neeti Soni, Avin Shrivastava'),
(22,'Das and Co','Kotta Charan Ram Sai, Alamuru Sai Priyanka, Kulluru Hariharanath, Gadamsetty Sreenivasa Varun Tej'),
(23,'Syntax Error','Chaarmitha Senthilmurugan, Sriv'),
(24,'Deadline Developers','Aarush Gupta, Drishtant Swarnkar, Jayant Singh'),
(25,'BINARY CRZ','Sistla Sai Haripriya, Alankrit Pandey'),
(26,'PAFOS','Rithvik Veeramaneni, Aryansh');
