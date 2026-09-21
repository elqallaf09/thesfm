create table public.sfm_team_tasks (
 id uuid primary key default gen_random_uuid(),team_id uuid not null references public.sfm_teams(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 assignee_id uuid references auth.users(id) on delete set null,
 title text not null check(length(trim(title)) between 1 and 240),
 status text not null default 'todo' check(status in ('todo','doing','done')),
 due_date date,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.sfm_team_tasks enable row level security;
revoke all on public.sfm_team_tasks from anon,authenticated;
grant select on public.sfm_team_tasks to authenticated;
create policy team_task_read on public.sfm_team_tasks for select to authenticated using(sfm_private.is_team_member(team_id));
create index team_task_team_date on public.sfm_team_tasks(team_id,created_at desc);
create function public.sfm_team_task(p_team uuid,p_action text,p_id uuid default null,p_title text default null,p_assignee uuid default null,p_due date default null,p_status text default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();owner_id uuid;task public.sfm_team_tasks;
begin
 if actor is null then raise exception 'AUTH_REQUIRED';end if;
 select t.owner_id into owner_id from public.sfm_teams t where t.id=p_team for update;
 if owner_id is null or not sfm_private.is_team_member(p_team) then raise exception 'TEAM_UNAVAILABLE';end if;
 if p_assignee is not null and not exists(select 1 from public.sfm_team_members m where m.team_id=p_team and m.user_id=p_assignee) then raise exception 'ASSIGNEE_UNAVAILABLE';end if;
 if p_action='create' then
  if (select count(*) from public.sfm_team_tasks where team_id=p_team)>=1000 then raise exception 'TASK_LIMIT';end if;
  insert into public.sfm_team_tasks(team_id,author_id,assignee_id,title,due_date) values(p_team,actor,p_assignee,trim(p_title),p_due);
  return;
 end if;
 select * into task from public.sfm_team_tasks where id=p_id and team_id=p_team for update;
 if task.id is null or (actor<>owner_id and actor<>task.author_id and actor is distinct from task.assignee_id) then raise exception 'TASK_UNAVAILABLE';end if;
 if p_action='status' then update public.sfm_team_tasks set status=p_status,updated_at=now() where id=p_id;
 elsif p_action='delete' and (actor=owner_id or actor=task.author_id) then delete from public.sfm_team_tasks where id=p_id;
 else raise exception 'INVALID_ACTION';end if;
end $$;
revoke all on function public.sfm_team_task(uuid,text,uuid,text,uuid,date,text) from public,anon;
grant execute on function public.sfm_team_task(uuid,text,uuid,text,uuid,date,text) to authenticated;

-- Public within the signed-in community only; this is an alias, never verified identity.
create table public.sfmer_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 handle text not null unique check(handle~'^[a-z][a-z0-9_]{2,29}$'),
 display_name text not null check(length(trim(display_name)) between 2 and 60),
 bio text not null default '' check(length(bio)<=500),updated_at timestamptz not null default now()
);
alter table public.sfmer_profiles enable row level security;
revoke all on public.sfmer_profiles from anon,authenticated;
grant select on public.sfmer_profiles to authenticated;
create policy community_profile_read on public.sfmer_profiles for select to authenticated using(true);
create function public.sfmer_save_profile(p_handle text,p_name text,p_bio text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 insert into public.sfmer_profiles(user_id,handle,display_name,bio) values(auth.uid(),lower(trim(p_handle)),trim(p_name),trim(p_bio))
 on conflict(user_id) do update set handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,updated_at=now();
end $$;
revoke all on function public.sfmer_save_profile(text,text,text) from public,anon;
grant execute on function public.sfmer_save_profile(text,text,text) to authenticated;
