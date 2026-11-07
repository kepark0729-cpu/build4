-- 삭제는 지우지 않고 「삭제 표시」만 한다(되돌릴 수 있고 변경 기록도 남는다). 목록에는 삭제 표시가 없는 업무만 나온다.
alter table public.tasks
  add column deleted_at timestamptz,
  add column deleted_by text;

alter table public.tasks
  add constraint tasks_deleted_pair check ((deleted_at is null) = (deleted_by is null));

create index tasks_active_idx on public.tasks (id) where deleted_at is null;
