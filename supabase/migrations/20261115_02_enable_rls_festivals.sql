-- Migration: Enable Row Level Security on dm_festivals with public read access
ALTER TABLE public.dm_festivals ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated users to read static festival calendar data
CREATE POLICY "Allow public read access to festivals" 
ON public.dm_festivals 
FOR SELECT 
TO anon, authenticated 
USING (true);
