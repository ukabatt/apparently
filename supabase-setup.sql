-- Run this in your Supabase project's SQL Editor (Dashboard > SQL Editor > New query)

create table if not exists stories (
  id bigint generated always as identity primary key,
  text text not null,
  time text,
  position integer not null default 0,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table stories enable row level security;

-- Anyone (including anonymous visitors) can read stories
create policy "Public can read stories"
  on stories for select
  using (true);

-- Only logged-in users (i.e. you, once you create your admin login) can write
create policy "Authenticated users can insert stories"
  on stories for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update stories"
  on stories for update
  to authenticated
  using (true);

create policy "Authenticated users can delete stories"
  on stories for delete
  to authenticated
  using (true);

-- Seed with a couple starter stories (optional, delete/edit anytime from /admin)
insert into stories (text, time, position) values
  ('ok so apparently the Fed is holding rates steady again this month', '8:02 AM', 0),
  ('third meeting in a row. markets basically shrugged', '8:02 AM', 1);
