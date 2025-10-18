-- Supabase Schema Diagnostic Script
-- Run this to check current database state and identify issues

-- Check if tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('projects', 'case_studies', 'carousel_images', 'user_profiles', 'site_settings')
ORDER BY tablename;

-- Check table columns for carousel_images specifically
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'carousel_images'
ORDER BY ordinal_position;

-- Check existing indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN ('projects', 'case_studies', 'carousel_images')
ORDER BY tablename, indexname;

-- Check for any existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check current extensions
SELECT 
    extname,
    extversion
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- Test basic functionality
SELECT 'Database diagnostic complete. Check results above.' as status;