-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE (Extends Supabase Auth or Standalone)
-- Note: In a real Supabase app, we link this to auth.users. 
-- For this simplified demo, we use a custom table but assume ID comes from auth.
create table public.users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  full_name text not null,
  role text check (role in ('admin', 'dosen', 'mahasiswa')) not null,
  npm text unique, -- Nullable for admin/dosen
  created_at timestamp with time zone default now()
);

-- 2. COURSES (Mata Kuliah)
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  name text not null,
  dosen_id uuid references public.users(id) not null,
  created_at timestamp with time zone default now()
);

-- 3. COURSE_ENROLLMENTS (Mahasiswa takes Course)
create table public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) not null,
  student_id uuid references public.users(id) not null,
  created_at timestamp with time zone default now(),
  unique(course_id, student_id)
);

-- 4. ATTENDANCE_SESSIONS (Sesi Absensi created by Dosen)
create table public.attendance_sessions (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) not null,
  session_token text not null, -- Dynamic token for QR
  expires_at timestamp with time zone not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 5. ATTENDANCE_LOGS (Log Kehadiran Mahasiswa)
create table public.attendance_logs (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.attendance_sessions(id) not null,
  student_id uuid references public.users(id) not null,
  scanned_at timestamp with time zone default now(),
  status text default 'present',
  unique(session_id, student_id) -- Prevent double scan
);

-- 6. TASKS (Tugas)
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  title text not null,
  description text,
  deadline timestamp with time zone,
  priority text check (priority in ('low', 'medium', 'high')),
  status text check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  ai_summary text, -- Field for AI insight
  created_at timestamp with time zone default now()
);

-- RLS POLICIES (Simplified for Demo - In production, enable RLS)
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.tasks enable row level security;

-- Create policy allowing public access for this demo (DO NOT USE IN PROD)
create policy "Public Access" on public.users for all using (true);
create policy "Public Access" on public.courses for all using (true);
create policy "Public Access" on public.enrollments for all using (true);
create policy "Public Access" on public.attendance_sessions for all using (true);
create policy "Public Access" on public.attendance_logs for all using (true);
create policy "Public Access" on public.tasks for all using (true);
