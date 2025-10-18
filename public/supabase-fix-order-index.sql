-- STEP-BY-STEP FIX for order_index column error
-- Run each section separately in Supabase SQL Editor

-- STEP 1: DIAGNOSTIC - Check current table structure
SELECT 'STEP 1: Checking existing tables...' as step;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('projects', 'case_studies', 'carousel_images', 'user_profiles')
ORDER BY table_name;

-- STEP 2: Check carousel_images table structure specifically
SELECT 'STEP 2: Checking carousel_images columns...' as step;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'carousel_images'
ORDER BY ordinal_position;

-- STEP 3: Check existing indexes that might be causing issues
SELECT 'STEP 3: Checking existing indexes...' as step;

SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexname LIKE '%order%'
ORDER BY tablename, indexname;

-- STEP 4: Drop problematic indexes if they exist
SELECT 'STEP 4: Dropping problematic indexes...' as step;

DROP INDEX IF EXISTS idx_carousel_images_order_index;
DROP INDEX IF EXISTS idx_projects_order_index;
DROP INDEX IF EXISTS idx_case_studies_order_index;
DROP INDEX IF EXISTS idx_carousel_images_order;

-- STEP 5: Ensure carousel_images table exists with correct structure
SELECT 'STEP 5: Creating/fixing carousel_images table...' as step;

CREATE TABLE IF NOT EXISTS carousel_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    button_text TEXT,
    order_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 6: Add order_index column if it doesn't exist
SELECT 'STEP 6: Adding order_index column if missing...' as step;

ALTER TABLE carousel_images ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- STEP 7: Now safely create the indexes
SELECT 'STEP 7: Creating indexes safely...' as step;

CREATE INDEX IF NOT EXISTS idx_carousel_images_status ON carousel_images(status);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order_index ON carousel_images(order_index);
CREATE INDEX IF NOT EXISTS idx_projects_order_index ON projects(order_index);
CREATE INDEX IF NOT EXISTS idx_case_studies_order_index ON case_studies(order_index);

-- STEP 8: Enable RLS if not already enabled
SELECT 'STEP 8: Enabling RLS...' as step;

ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;

-- STEP 9: Create basic RLS policy for carousel_images
SELECT 'STEP 9: Creating RLS policies...' as step;

DROP POLICY IF EXISTS "Anyone can view active carousel images" ON carousel_images;
CREATE POLICY "Anyone can view active carousel images" ON carousel_images
    FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage carousel images" ON carousel_images;
CREATE POLICY "Admins can manage carousel images" ON carousel_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- STEP 10: Verification
SELECT 'STEP 10: Verification complete!' as step;

-- Check final table structure
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'carousel_images'
    AND column_name = 'order_index';

-- Check indexes
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename = 'carousel_images'
ORDER BY indexname;

SELECT 'SUCCESS: carousel_images table is now properly configured!' as result;