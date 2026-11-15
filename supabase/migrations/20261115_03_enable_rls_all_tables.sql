-- Migration: Enable Row Level Security on all private application tables
-- IMPORTANT: Ensure the FastAPI backend has SUPABASE_SERVICE_ROLE_KEY configured
-- before applying, so that server operations continue uninterrupted while blocking public anon access.

-- 1. Enable RLS on all user data tables
ALTER TABLE public.dm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_shared_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_shared_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_informal_lending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_lending_repayments ENABLE ROW LEVEL SECURITY;

-- Notice: Because no permissive policies are granted to 'anon', any untrusted
-- external requests sent to PostgREST using the public anon key are completely blocked.
-- The FastAPI backend connects using the service_role key, which has 'rolbypassrls = true'
-- in PostgreSQL and bypasses RLS safely.
