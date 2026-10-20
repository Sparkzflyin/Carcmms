-- GarageLog initial schema.
-- Every table is owned by a single user (auth.users) and protected by RLS,
-- so the app can query with the user's session and only ever see their rows.

-- ---------------------------------------------------------------------------
-- Custom field definitions: user-defined extra fields for vehicles.
-- ---------------------------------------------------------------------------
create table public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  field_type text not null check (field_type in ('text', 'number', 'date', 'select', 'boolean')),
  options text[] not null default '{}',
  applies_to text not null default 'all' check (applies_to in ('all', 'car', 'motorcycle')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.custom_field_definitions (user_id, sort_order);

-- ---------------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_type text not null default 'car' check (vehicle_type in ('car', 'motorcycle')),
  nickname text,
  year int check (year between 1885 and 2100),
  make text not null,
  model text not null,
  trim text,
  vin text,
  body_style text,
  engine text,
  transmission text,
  drivetrain text,
  fuel_type text,
  color text,
  license_plate text,
  odometer int not null default 0 check (odometer >= 0),
  odometer_unit text not null default 'mi' check (odometer_unit in ('mi', 'km', 'hr')),
  purchase_date date,
  purchase_price numeric(12, 2),
  notes text,
  photo_path text,
  -- Values for custom_field_definitions, keyed by definition id.
  custom_fields jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.vehicles (user_id, archived);

-- ---------------------------------------------------------------------------
-- Maintenance schedules: recurring service by distance and/or time.
-- ---------------------------------------------------------------------------
create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  title text not null,
  description text,
  interval_distance int check (interval_distance > 0),
  interval_months int check (interval_months > 0),
  last_done_odometer int,
  last_done_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (interval_distance is not null or interval_months is not null)
);
create index on public.maintenance_schedules (vehicle_id);

-- ---------------------------------------------------------------------------
-- Work orders
-- ---------------------------------------------------------------------------
create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  maintenance_schedule_id uuid references public.maintenance_schedules (id) on delete set null,
  -- Human-friendly per-user number, e.g. WO-0042.
  number int not null,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_parts', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  odometer int,
  labor_hours numeric(8, 2) not null default 0,
  labor_rate numeric(10, 2) not null default 0,
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);
create index on public.work_orders (vehicle_id, status);
create index on public.work_orders (user_id, status);

create table public.work_order_parts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  name text not null,
  part_number text,
  vendor text,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  status text not null default 'needed' check (status in ('needed', 'ordered', 'received', 'installed')),
  created_at timestamptz not null default now()
);
create index on public.work_order_parts (work_order_id);

create table public.work_order_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  body text,
  photo_paths text[] not null default '{}',
  -- System entries (status changes) vs. user-written notes.
  kind text not null default 'note' check (kind in ('note', 'status')),
  created_at timestamptz not null default now(),
  check (body is not null or cardinality(photo_paths) > 0)
);
create index on public.work_order_notes (work_order_id, created_at);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger vehicles_touch before update on public.vehicles
  for each row execute function public.touch_updated_at();
create trigger work_orders_touch before update on public.work_orders
  for each row execute function public.touch_updated_at();

-- Assign the next per-user work order number.
create or replace function public.assign_work_order_number() returns trigger
language plpgsql as $$
begin
  if new.number is null then
    perform pg_advisory_xact_lock(hashtext('wo_number:' || new.user_id::text));
    select coalesce(max(number), 0) + 1 into new.number
      from public.work_orders where user_id = new.user_id;
  end if;
  return new;
end $$;

create trigger work_orders_number before insert on public.work_orders
  for each row execute function public.assign_work_order_number();

-- Keep started/completed timestamps in step with status, and when a
-- maintenance work order is finished, roll its schedule forward.
create or replace function public.work_order_status_change() returns trigger
language plpgsql as $$
begin
  if new.status = 'in_progress' and new.started_at is null then
    new.started_at := now();
  end if;

  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := coalesce(new.completed_at, now());
    if new.maintenance_schedule_id is not null then
      update public.maintenance_schedules s
         set last_done_date = (new.completed_at at time zone 'utc')::date,
             last_done_odometer = coalesce(
               new.odometer,
               (select v.odometer from public.vehicles v where v.id = new.vehicle_id))
       where s.id = new.maintenance_schedule_id;
    end if;
    -- A reading taken during the job can only move the odometer forward.
    if new.odometer is not null then
      update public.vehicles v set odometer = greatest(v.odometer, new.odometer)
       where v.id = new.vehicle_id;
    end if;
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;

  return new;
end $$;

create trigger work_orders_status before insert or update of status on public.work_orders
  for each row execute function public.work_order_status_change();

-- Never let a child row point at another user's parent row. RLS covers the
-- child itself; this covers the foreign key it references.
create or replace function public.check_owner_matches() returns trigger
language plpgsql as $$
declare
  parent_owner uuid;
begin
  if tg_table_name in ('work_orders', 'maintenance_schedules') then
    select user_id into parent_owner from public.vehicles where id = new.vehicle_id;
  else
    select user_id into parent_owner from public.work_orders where id = new.work_order_id;
  end if;
  if parent_owner is distinct from new.user_id then
    raise exception 'parent row does not belong to this user';
  end if;
  return new;
end $$;

create trigger work_orders_owner before insert or update on public.work_orders
  for each row execute function public.check_owner_matches();
create trigger maintenance_schedules_owner before insert or update on public.maintenance_schedules
  for each row execute function public.check_owner_matches();
create trigger work_order_parts_owner before insert or update on public.work_order_parts
  for each row execute function public.check_owner_matches();
create trigger work_order_notes_owner before insert or update on public.work_order_notes
  for each row execute function public.check_owner_matches();

-- ---------------------------------------------------------------------------
-- Maintenance: open a work order for every due schedule that doesn't
-- already have one in progress. Idempotent; runs as the calling user.
-- ---------------------------------------------------------------------------
create or replace function public.create_due_maintenance_work_orders()
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  created int := 0;
  s record;
begin
  for s in
    select ms.*, v.odometer as current_odometer
      from maintenance_schedules ms
      join vehicles v on v.id = ms.vehicle_id
     where ms.user_id = auth.uid()
       and ms.active
       and not v.archived
       and (
         (ms.interval_distance is not null
           and v.odometer >= coalesce(ms.last_done_odometer, 0) + ms.interval_distance)
         or
         (ms.interval_months is not null
           and current_date >= coalesce(ms.last_done_date, ms.created_at::date)
                               + make_interval(months => ms.interval_months))
       )
       and not exists (
         select 1 from work_orders wo
          where wo.maintenance_schedule_id = ms.id
            and wo.status not in ('done', 'cancelled')
       )
  loop
    insert into work_orders (user_id, vehicle_id, maintenance_schedule_id, title, description, priority, odometer)
    values (s.user_id, s.vehicle_id, s.id, s.title,
            coalesce(s.description, 'Scheduled maintenance'), 'medium', s.current_odometer);
    created := created + 1;
  end loop;
  return created;
end $$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.custom_field_definitions enable row level security;
alter table public.vehicles enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.work_order_notes enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'custom_field_definitions', 'vehicles', 'maintenance_schedules',
    'work_orders', 'work_order_parts', 'work_order_notes'
  ] loop
    execute format(
      'create policy "owner can do everything" on public.%I
         for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, each user may only touch files under "<uid>/".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "users read own photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users upload own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users update own photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
