-- Migration: Add covering indexes for foreign keys to eliminate table scan overhead and performance warnings
CREATE INDEX IF NOT EXISTS idx_dm_categories_user_id ON public.dm_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_events_user_id ON public.dm_events(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_expenses_category_id ON public.dm_expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_dm_expenses_event_id ON public.dm_expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_dm_expenses_shared_project_id ON public.dm_expenses(shared_project_id);
CREATE INDEX IF NOT EXISTS idx_dm_expenses_user_id ON public.dm_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_informal_lending_user_id ON public.dm_informal_lending(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_lending_repayments_lending_id ON public.dm_lending_repayments(lending_id);
CREATE INDEX IF NOT EXISTS idx_dm_shared_project_members_user_id ON public.dm_shared_project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_shared_projects_created_by ON public.dm_shared_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_dm_shared_projects_event_id ON public.dm_shared_projects(event_id);
