-- 1. Create exec_sql function to allow running SQL from client (Optional, for scripts)
create or replace function public.exec_sql(sql text)
returns jsonb
language plpgsql
security definer
as $$
begin
  execute sql;
  return '{"status": "success"}'::jsonb;
exception when others then
  return format('{"status": "error", "message": "%s"}', SQLERRM)::jsonb;
end;
$$;

-- 2. Fix Infinite Recursion by resetting policies
-- We drop policies to clear any bad state
do $$
begin
  -- Courses
  execute 'drop policy if exists "Public Access" on public.courses';
  execute 'drop policy if exists "Enable read access for all users" on public.courses';
  execute 'drop policy if exists "Enable insert for authenticated users only" on public.courses';
  
  -- Sessions
  execute 'drop policy if exists "Public Access" on public.attendance_sessions';
  execute 'drop policy if exists "Public Access" on public.attendance_logs';
  execute 'drop policy if exists "Public Access" on public.enrollments';
end $$;

-- Disable and Re-enable RLS to reset
alter table public.courses disable row level security;
alter table public.attendance_sessions disable row level security;
alter table public.attendance_logs disable row level security;
alter table public.enrollments disable row level security;

-- Create simple, safe policies
alter table public.courses enable row level security;
create policy "Public Read Courses" on public.courses for select using (true);
create policy "Auth Insert Courses" on public.courses for insert with check (auth.role() = 'authenticated');
create policy "Auth Update Courses" on public.courses for update using (auth.role() = 'authenticated');

alter table public.attendance_sessions enable row level security;
create policy "Public Read Sessions" on public.attendance_sessions for select using (true);
create policy "Auth Insert Sessions" on public.attendance_sessions for insert with check (auth.role() = 'authenticated');

alter table public.attendance_logs enable row level security;
create policy "Public Read Logs" on public.attendance_logs for select using (true);
create policy "Auth Insert Logs" on public.attendance_logs for insert with check (auth.role() = 'authenticated');

-- 3. Create missing 'materials' table
create table if not exists public.materials (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  url text not null,
  file_path text,
  created_at timestamp with time zone default now()
);

alter table public.materials enable row level security;
drop policy if exists "Public Read Materials" on public.materials;
create policy "Public Read Materials" on public.materials for select using (true);
drop policy if exists "Auth Insert Materials" on public.materials;
create policy "Auth Insert Materials" on public.materials for insert with check (auth.role() = 'authenticated');

-- 4. Create Storage Buckets (Direct SQL injection into storage schema)
insert into storage.buckets (id, name, public)
values 
  ('qr', 'qr', true),
  ('faces', 'faces', false),
  ('profiles', 'profiles', true),
  ('materials', 'materials', true)
on conflict (id) do update set public = excluded.public;

-- Fix Storage Policies (Allow public access for demo)
create policy "Public Access Buckets" on storage.buckets for all using (true);
create policy "Public Access Objects" on storage.objects for all using (true);
