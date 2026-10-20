-- Archived work orders: closed jobs moved out of the everyday lists but kept
-- for history and search.

alter table public.work_orders add column archived_at timestamptz;

-- Only finished or cancelled work can be archived, so nothing open hides.
alter table public.work_orders
  add constraint work_orders_archive_closed_only
  check (archived_at is null or status in ('done', 'cancelled'));

create index work_orders_user_archived_idx
  on public.work_orders (user_id, archived_at desc)
  where archived_at is not null;

-- Reopening an archived work order brings it back out of the archive.
create or replace function public.unarchive_on_reopen() returns trigger
language plpgsql as $$
begin
  if new.status not in ('done', 'cancelled') then
    new.archived_at := null;
  end if;
  return new;
end $$;

create trigger work_orders_unarchive_on_reopen before update of status on public.work_orders
  for each row execute function public.unarchive_on_reopen();
