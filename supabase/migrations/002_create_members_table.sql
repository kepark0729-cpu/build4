-- 담당자 (이름 대신 역할 표시). 팀장이 화면에서 추가한다.
create table public.members (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now(),
  constraint members_name_not_blank check (length(btrim(name)) > 0),
  constraint members_name_not_manager check (btrim(name) <> '팀장'),
  constraint members_name_unique unique (name)
);
create unique index members_name_lower_key on public.members (lower(name));

insert into public.members (name) values ('채용 담당자 A'), ('급여 담당자 B'), ('복리후생 담당자 C');

-- 업무의 담당자는 담당자 표에 있는 이름이어야 한다.
alter table public.tasks
  add constraint tasks_owner_fkey foreign key (owner) references public.members (name);

-- 접근 규칙: 로그인 전이라 공개 키로 읽고 추가한다. 수정 · 삭제는 열지 않는다.
alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;
grant select, insert on public.members to anon, authenticated;
create policy members_read on public.members for select to anon, authenticated using (true);
create policy members_add on public.members for insert to anon, authenticated with check (true);
