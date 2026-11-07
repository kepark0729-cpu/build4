-- 업무
create table public.tasks (
  id bigint generated always as identity primary key,
  title text not null check (length(btrim(title)) > 0),
  category text not null check (length(btrim(category)) > 0),
  owner text not null check (length(btrim(owner)) > 0),
  status text not null default '진행 중' check (status in ('진행 중', '멈춤', '완료')),
  start_date date not null,
  end_date date not null,
  important boolean not null default false,
  start_hour smallint check (start_hour between 8 and 21),
  end_hour smallint check (end_hour between 9 and 22),
  last_changed date not null,
  last_editor text not null check (length(btrim(last_editor)) > 0),
  created_at timestamptz not null default now(),
  constraint tasks_end_not_before_start check (end_date >= start_date),
  constraint tasks_hours_pair check (
    (start_hour is null and end_hour is null)
    or (start_hour is not null and end_hour is not null and end_hour > start_hour)
  )
);

-- 구분 버튼
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);
create unique index categories_name_lower_key on public.categories (lower(name));

-- 상태 변경 기록
create table public.task_history (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  changed_on date not null,
  new_status text not null check (new_status in ('진행 중', '멈춤', '완료')),
  changed_by text not null,
  created_at timestamptz not null default now()
);
create index task_history_task_id_idx on public.task_history (task_id);
create index task_history_changed_on_idx on public.task_history (changed_on);

-- 상태가 바뀔 때마다 변경 기록 한 줄 (화면이 빼먹을 수 없게 DB 에서 한다)
create function public.log_task_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_history (task_id, changed_on, new_status, changed_by)
  values (new.id, new.last_changed, new.status, new.last_editor);
  return new;
end;
$$;
revoke all on function public.log_task_status_change() from public, anon, authenticated;

create trigger tasks_log_status_change
after update of status on public.tasks
for each row
when (old.status is distinct from new.status)
execute function public.log_task_status_change();

-- 처음 구분 12개 (일반적인 인사 업무 구분. 회사 기준 아님)
insert into public.categories (name) values
  ('채용'), ('급여 및 4대보험'), ('복리후생'), ('노무'), ('인사기획'), ('평가 · 보상'),
  ('교육 · 인재개발'), ('조직문화'), ('근태 · 휴가'), ('입퇴사 관리'), ('퇴직 · 퇴직연금'), ('기타');

-- 접근 규칙: 로그인 전이라 공개 키로 읽고 쓴다. 삭제는 열지 않는다.
alter table public.tasks enable row level security;
alter table public.categories enable row level security;
alter table public.task_history enable row level security;

revoke all on public.tasks, public.categories, public.task_history from anon, authenticated;
grant select, insert, update on public.tasks to anon, authenticated;
grant select, insert on public.categories to anon, authenticated;
grant select on public.task_history to anon, authenticated;

create policy tasks_read on public.tasks for select to anon, authenticated using (true);
create policy tasks_add on public.tasks for insert to anon, authenticated with check (true);
create policy tasks_edit on public.tasks for update to anon, authenticated using (true) with check (true);
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_add on public.categories for insert to anon, authenticated with check (true);
create policy history_read on public.task_history for select to anon, authenticated using (true);
