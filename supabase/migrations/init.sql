-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  full_name text not null,
  role text check (role in ('admin', 'dosen', 'mahasiswa')) not null,
  npm text unique,
  created_at timestamp with time zone default now()
);

-- 2. COURSES
create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  name text not null,
  dosen_id uuid references public.users(id) not null,
  created_at timestamp with time zone default now()
);

-- 3. ENROLLMENTS
create table if not exists public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) not null,
  student_id uuid references public.users(id) not null,
  created_at timestamp with time zone default now(),
  unique(course_id, student_id)
);

-- 4. ATTENDANCE_SESSIONS
create table if not exists public.attendance_sessions (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) not null,
  session_token text not null,
  expires_at timestamp with time zone not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 5. ATTENDANCE_LOGS
create table if not exists public.attendance_logs (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.attendance_sessions(id) not null,
  student_id uuid references public.users(id) not null,
  scanned_at timestamp with time zone default now(),
  status text default 'present',
  unique(session_id, student_id)
);

-- 6. TASKS
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  title text not null,
  description text,
  deadline timestamp with time zone,
  priority text check (priority in ('low', 'medium', 'high')),
  status text check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  ai_summary text,
  created_at timestamp with time zone default now()
);

-- RLS POLICIES (Demo)
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Public Access" on public.users;
drop policy if exists "Public Access" on public.courses;
drop policy if exists "Public Access" on public.enrollments;
drop policy if exists "Public Access" on public.attendance_sessions;
drop policy if exists "Public Access" on public.attendance_logs;
drop policy if exists "Public Access" on public.tasks;

create policy "Public Access" on public.users for all using (true);
create policy "Public Access" on public.courses for all using (true);
create policy "Public Access" on public.enrollments for all using (true);
create policy "Public Access" on public.attendance_sessions for all using (true);
create policy "Public Access" on public.attendance_logs for all using (true);
create policy "Public Access" on public.tasks for all using (true);
