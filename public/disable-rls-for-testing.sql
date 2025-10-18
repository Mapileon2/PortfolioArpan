-- Temporary RLS Disable for Testing Case Studies
-- WARNING: This disables security - only use for development/testing

-- Disable RLS on case_studies table temporarily
ALTER TABLE case_studies DISABLE ROW LEVEL SECURITY;

-- Also disable on user_profiles to avoid recursion issues
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS disabled for testing!';
    RAISE NOTICE 'Case studies can now be created without any restrictions.';
    RAISE NOTICE 'WARNING: This is for testing only - re-enable RLS for production!';
END $$;