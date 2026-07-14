create table if not exists orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_line_id text,
  pickup text not null,
  destination text not null,
  ride_time text,
  passengers integer,
  distance_km numeric,
  duration_min numeric,
  base_fare integer not null default 60,
  mileage_fare integer not null default 0,
  time_fare integer not null default 0,
  toll integer not null default 0,
  night_surcharge integer not null default 0,
  estimated_fare integer,
  final_fare integer,
  in_service_area boolean not null default true,
  status text not null default 'awaiting_customer'
    check (status in ('awaiting_customer','pending','accepted','completed','cancelled')),
  driver_name text,
  driver_phone text,
  driver_plate text,
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();
