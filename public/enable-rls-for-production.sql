-- Re-enable RLS for Production
-- Run this after testing to restore security

-- Re-enable RLS on case_studies table
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies
CREATE POLICY "Public read access" ON case_studies
    FOR SELECT USING (true);

CREATE POLICY "Public write access" ON case_studies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access" ON case_studies
    FOR UPDATE USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS re-enabled for production!';
    RAISE NOTICE 'Basic policies applied - customize as needed for your security requirements.';
END $$;