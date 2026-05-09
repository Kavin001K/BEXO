-- BEXO Initial Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  handle        text not null unique,
  full_name     text not null default '',
  headline      text not null default '',
  bio           text not null default '',
  avatar_url    text,
  location      text,
  website       text,
  linkedin_url  text,
  github_url    text,
  resume_url    text,
  is_published  boolean not null default false,
  portfolio_theme text not null default 'midnight',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_handle_check check (handle ~ '^[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]$'),
  unique(user_id)
);

-- ============================================================
-- EDUCATION
-- ============================================================
create table public.education (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  institution text not null,
  degree      text not null,
  field       text not null,
  start_year  int  not null,
  end_year    int,
  gpa         text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- EXPERIENCES
-- ============================================================
create table public.experiences (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  company     text not null,
  role        text not null,
  start_date  text not null,
  end_date    text,
  description text not null default '',
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text not null default '',
  tech_stack  text[] not null default '{}',
  live_url    text,
  github_url  text,
  image_url   text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SKILLS
-- ============================================================
create table public.skills (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  category   text not null default 'General',
  level      text not null default 'intermediate'
             check (level in ('beginner','intermediate','advanced','expert')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- SITE BUILDS (portfolio generation pipeline)
-- ============================================================
create table public.site_builds (
  id            uuid primary key default uuid_generate_v4(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'queued'
                check (status in ('queued','building','done','failed')),
  portfolio_url text,
  build_log     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- UPDATES (profile timeline posts)
-- ============================================================
create table public.updates (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  type        text not null default 'achievement'
              check (type in ('project','achievement','role','education')),
  title       text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SITE ANALYTICS
-- ============================================================
create table public.site_analytics (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  event_type  text not null,
  referrer    text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.education       enable row level security;
alter table public.experiences     enable row level security;
alter table public.projects        enable row level security;
alter table public.skills          enable row level security;
alter table public.site_builds     enable row level security;
alter table public.updates         enable row level security;
alter table public.site_analytics  enable row level security;

-- profiles: owner full access, public read for published
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = user_id);
create policy "profiles_public_read" on public.profiles
  for select using (true);

-- education, experiences, projects, skills: owner only
create policy "education_owner" on public.education
  for all using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );
create policy "experiences_owner" on public.experiences
  for all using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );
create policy "projects_owner" on public.projects
  for all using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );
create policy "skills_owner" on public.skills
  for all using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- site_builds: owner only
create policy "site_builds_owner" on public.site_builds
  for all using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- updates: owner write, public read for published profiles
create policy "updates_owner" on public.updates
  for all using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );
create policy "updates_public_read" on public.updates
  for select using (
    profile_id in (select id from public.profiles where is_published = true)
  );

-- analytics: anyone can insert, owner can read
create policy "analytics_insert" on public.site_analytics
  for insert with check (true);
create policy "analytics_owner" on public.site_analytics
  for select using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('projects', 'projects', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('resumes', 'resumes', false)
  on conflict (id) do nothing;

-- Storage policies
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "projects_public_read" on storage.objects
  for select using (bucket_id = 'projects');
create policy "projects_owner_write" on storage.objects
  for insert with check (bucket_id = 'projects' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "resumes_owner_read" on storage.objects
  for select using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_owner_write" on storage.objects
  for insert with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "resumes_service_read" on storage.objects
  for select using (bucket_id = 'resumes' and auth.role() = 'service_role');

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.site_builds;
alter publication supabase_realtime add table public.profiles;
