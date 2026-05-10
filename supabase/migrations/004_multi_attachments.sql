-- Create update_attachments table to support multiple files per update
create table if not exists public.update_attachments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid references public.updates(id) on delete cascade not null,
  url text not null,
  type text check (type in ('image', 'pdf')) not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.update_attachments enable row level security;

-- Policies
create policy "update_attachments_public_read" on public.update_attachments
  for select using (true);

create policy "update_attachments_owner_all" on public.update_attachments
  for all using (
    exists (
      select 1 from public.updates
      join public.profiles on updates.profile_id = profiles.id
      where update_attachments.update_id = updates.id
      and profiles.user_id = auth.uid()
    )
  );
