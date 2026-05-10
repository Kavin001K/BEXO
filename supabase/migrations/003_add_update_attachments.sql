-- Add columns to updates table to support media and links
alter table public.updates 
add column if not exists media_url text,
add column if not exists media_type text check (media_type in ('image', 'pdf')),
add column if not exists link_url text;

-- Create updates storage bucket
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Set storage policies for attachments
create policy "attachments_public_read" on storage.objects
  for select using (bucket_id = 'attachments');

create policy "attachments_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'attachments' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "attachments_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'attachments' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
