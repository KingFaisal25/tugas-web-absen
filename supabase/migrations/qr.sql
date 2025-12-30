-- USERS: extend with fields needed for QR system
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists program_studi text;
alter table public.users add column if not exists photo_url text;
alter table public.users add column if not exists nidn text unique;
alter table public.users add column if not exists face_descriptor text;
alter table public.users add column if not exists is_verified boolean default false;

-- QR Codes table
create table if not exists public.qr_codes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  type text check (type in ('personal','class')) not null,
  encrypted_data text not null,
  image_url text,
  is_private boolean default false,
  password_hash text,
  expiry_date timestamp with time zone,
  scan_limit int default 1000 check (scan_limit between 1 and 1000),
  scan_count int default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Verifications table
create table if not exists public.verifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  otp_code text,
  otp_expiry timestamp with time zone,
  otp_attempts int default 0,
  face_verified boolean default false,
  face_similarity numeric,
  verified_at timestamp with time zone
);

-- Activity logs
create table if not exists public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) not null,
  action text not null,
  details text,
  ip_address text,
  timestamp timestamp with time zone default now()
);

-- Scan history
create table if not exists public.scan_history (
  id uuid default uuid_generate_v4() primary key,
  qr_code_id uuid references public.qr_codes(id) not null,
  scanner_info text,
  location text,
  timestamp timestamp with time zone default now()
);

-- RLS policies (demo openness)
alter table public.qr_codes enable row level security;
alter table public.verifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.scan_history enable row level security;

drop policy if exists "Public Access" on public.qr_codes;
drop policy if exists "Public Access" on public.verifications;
drop policy if exists "Public Access" on public.activity_logs;
drop policy if exists "Public Access" on public.scan_history;

create policy "Public Access" on public.qr_codes for all using (true);
create policy "Public Access" on public.verifications for all using (true);
create policy "Public Access" on public.activity_logs for all using (true);
create policy "Public Access" on public.scan_history for all using (true);
