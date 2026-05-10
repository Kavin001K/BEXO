-- Add unique constraints to enable upsert logic for resume parsing
-- Run this in your Supabase SQL editor

ALTER TABLE public.skills 
ADD CONSTRAINT skills_profile_id_name_key UNIQUE (profile_id, name);

ALTER TABLE public.education 
ADD CONSTRAINT education_profile_id_institution_degree_key UNIQUE (profile_id, institution, degree);

ALTER TABLE public.experiences 
ADD CONSTRAINT experiences_profile_id_company_role_key UNIQUE (profile_id, company, role);

ALTER TABLE public.projects 
ADD CONSTRAINT projects_profile_id_title_key UNIQUE (profile_id, title);
