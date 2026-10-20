-- Shop features (vendors, parts inventory, job checklists), ownership costs,
-- and recall tracking.

-- Odometer when the vehicle was bought, for cost-per-mile.
alter table public.vehicles add column purchase_odometer int check (purchase_odometer >= 0);

-- ---------------------------------------------------------------------------
-- Vendors: parts stores, shops, dealers, online sellers.
-- ---------------------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null default 'parts' check (kind in ('parts', 'online', 'shop', 'dealer', 'other')),
  website text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);
create unique index vendors_user_name_idx on public.vendors (user_id, lower(name));

-- ---------------------------------------------------------------------------
-- Parts inventory: what's on the shelf.
-- ---------------------------------------------------------------------------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  part_number text,
  category text,
  quantity numeric(10, 2) not null default 0,
  unit text not null default 'ea',
  min_quantity numeric(10, 2) not null default 0 check (min_quantity >= 0),
  unit_cost numeric(12, 2) check (unit_cost >= 0),
  location text,
  vendor_id uuid references public.vendors (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.inventory_items (user_id, name);

create trigger inventory_items_touch before update on public.inventory_items
  for each row execute function public.touch_updated_at();

alter table public.work_order_parts
  add column inventory_item_id uuid references public.inventory_items (id) on delete set null,
  add column vendor_id uuid references public.vendors (id) on delete set null;

-- Parts pulled from stock come off the shelf; removing the line puts them back.
create or replace function public.sync_inventory_from_parts() returns trigger
language plpgsql as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.inventory_item_id is not null then
    update public.inventory_items set quantity = quantity + old.quantity
     where id = old.inventory_item_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.inventory_item_id is not null then
    update public.inventory_items set quantity = quantity - new.quantity
     where id = new.inventory_item_id;
  end if;
  return coalesce(new, old);
end $$;

create trigger work_order_parts_inventory
  after insert or delete or update of quantity, inventory_item_id on public.work_order_parts
  for each row execute function public.sync_inventory_from_parts();

-- ---------------------------------------------------------------------------
-- Expenses outside work orders: insurance, registration, tires, etc.
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  date date not null default current_date,
  category text not null default 'other' check (category in (
    'insurance', 'registration', 'fuel', 'parts', 'service', 'tires',
    'accessories', 'parking', 'tolls', 'cleaning', 'other')),
  amount numeric(12, 2) not null check (amount >= 0),
  odometer int check (odometer >= 0),
  vendor_id uuid references public.vendors (id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);
create index on public.expenses (vehicle_id, date desc);

-- ---------------------------------------------------------------------------
-- Job checklists: reusable templates and per-work-order items.
-- ---------------------------------------------------------------------------
create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  applies_to text not null default 'all' check (applies_to in ('all', 'car', 'motorcycle')),
  steps text[] not null default '{}',
  tools text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.checklist_templates (user_id, name);

create table public.work_order_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  kind text not null default 'step' check (kind in ('step', 'tool')),
  text text not null check (char_length(text) between 1 and 300),
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.work_order_checklist_items (work_order_id, kind, sort_order);

-- ---------------------------------------------------------------------------
-- Recalls the owner has dealt with (NHTSA campaign numbers).
-- ---------------------------------------------------------------------------
create table public.recall_dismissals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  campaign text not null,
  created_at timestamptz not null default now(),
  primary key (vehicle_id, campaign)
);

-- ---------------------------------------------------------------------------
-- Ownership checks for the new child tables (RLS covers the rows themselves).
-- ---------------------------------------------------------------------------
create or replace function public.check_owner_matches() returns trigger
language plpgsql as $$
declare
  parent_owner uuid;
begin
  if tg_table_name in ('work_orders', 'maintenance_schedules', 'expenses', 'recall_dismissals') then
    select user_id into parent_owner from public.vehicles where id = new.vehicle_id;
  else
    select user_id into parent_owner from public.work_orders where id = new.work_order_id;
  end if;
  if parent_owner is distinct from new.user_id then
    raise exception 'parent row does not belong to this user';
  end if;
  return new;
end $$;

create trigger expenses_owner before insert or update on public.expenses
  for each row execute function public.check_owner_matches();
create trigger recall_dismissals_owner before insert or update on public.recall_dismissals
  for each row execute function public.check_owner_matches();
create trigger work_order_checklist_items_owner before insert or update on public.work_order_checklist_items
  for each row execute function public.check_owner_matches();

-- Vendor and inventory links must point at the user's own rows.
create or replace function public.check_linked_rows_owned() returns trigger
language plpgsql as $$
begin
  if new.vendor_id is not null and not exists (
    select 1 from public.vendors where id = new.vendor_id and user_id = new.user_id
  ) then
    raise exception 'vendor does not belong to this user';
  end if;
  -- Nested so `new.inventory_item_id` is only read on tables that have it.
  if tg_table_name = 'work_order_parts' then
    if new.inventory_item_id is not null and not exists (
      select 1 from public.inventory_items where id = new.inventory_item_id and user_id = new.user_id
    ) then
      raise exception 'inventory item does not belong to this user';
    end if;
  end if;
  return new;
end $$;

create trigger work_order_parts_links before insert or update on public.work_order_parts
  for each row execute function public.check_linked_rows_owned();
create trigger inventory_items_links before insert or update on public.inventory_items
  for each row execute function public.check_linked_rows_owned();
create trigger expenses_links before insert or update on public.expenses
  for each row execute function public.check_linked_rows_owned();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'vendors', 'inventory_items', 'expenses', 'checklist_templates',
    'work_order_checklist_items', 'recall_dismissals'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner can do everything" on public.%I
         for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
