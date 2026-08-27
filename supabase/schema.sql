-- FieldReport production schema (Supabase Postgres + Storage)
-- Run in Supabase SQL editor or via migration tooling.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  company_name text not null default '',
  phone text not null default '',
  logo_url text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'team')),
  reports_used_this_month integer not null default 0,
  reports_month_key text,
  sector_ids jsonb not null default '[]'::jsonb,
  industry_ids jsonb not null default '[]'::jsonb,
  default_job_type_id text,
  onboarding_completed_at timestamptz,
  stripe_customer_id text, -- written by Stripe checkout webhook (TS: stripeCustomerId)
  stripe_subscription_id text, -- written by Stripe checkout webhook (TS: stripeSubscriptionId)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  address text,
  job_type text not null,
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'sent')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists jobs_user_id_idx on public.jobs(user_id);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  transcription text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists photos_job_id_idx on public.photos(job_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content jsonb not null,
  version integer not null default 1,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);

create unique index if not exists reports_job_id_idx on public.reports(job_id);
create index if not exists reports_user_id_idx on public.reports(user_id);

create table if not exists public.job_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  storage_path text not null,
  file_name text not null default 'document.pdf',
  mime_type text not null default 'application/pdf',
  extracted_text text not null default '',
  extraction_source text not null default 'empty' check (extraction_source in ('text', 'ocr', 'empty')),
  created_at timestamptz not null default now()
);

create index if not exists job_documents_job_id_idx on public.job_documents(job_id);

create table if not exists public.public_report_snapshots (
  report_id uuid primary key references public.reports(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.photos enable row level security;
alter table public.job_documents enable row level security;
alter table public.reports enable row level security;
alter table public.public_report_snapshots enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "jobs_all_own" on public.jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "photos_via_job" on public.photos for all using (
  exists (select 1 from public.jobs j where j.id = photos.job_id and j.user_id = auth.uid())
) with check (
  exists (select 1 from public.jobs j where j.id = photos.job_id and j.user_id = auth.uid())
);
create policy "documents_via_job" on public.job_documents for all using (
  exists (select 1 from public.jobs j where j.id = job_documents.job_id and j.user_id = auth.uid())
) with check (
  exists (select 1 from public.jobs j where j.id = job_documents.job_id and j.user_id = auth.uid())
);
create policy "reports_all_own" on public.reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public_snapshots_read" on public.public_report_snapshots for select using (true);
create policy "public_snapshots_write_own" on public.public_report_snapshots for all using (
  exists (select 1 from public.reports r where r.id = public_report_snapshots.report_id and r.user_id = auth.uid())
) with check (
  exists (select 1 from public.reports r where r.id = public_report_snapshots.report_id and r.user_id = auth.uid())
);

-- Storage buckets (create in dashboard; use signed URLs):
--   job-photos     — job site images
--   job-documents  — reference PDFs

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Idempotent upgrades for existing projects
alter table public.profiles add column if not exists reports_month_key text;
alter table public.reports add column if not exists version integer not null default 1;
alter table public.reports add column if not exists history jsonb not null default '[]'::jsonb;
alter table public.reports add column if not exists updated_at timestamptz not null default now();
alter table public.job_documents add column if not exists extraction_source text not null default 'empty';
