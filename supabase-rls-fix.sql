-- Fix Row Level Security for Skyler
-- Run this in Supabase SQL Editor

-- Disable RLS on all tables (for personal use app)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled, add these policies:
-- CREATE POLICY "Allow all" ON events FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all" ON periods FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
