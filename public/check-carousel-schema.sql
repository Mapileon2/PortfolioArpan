-- Check Carousel Table Schema
-- This script shows the actual structure of the carousel_images table

-- Check if table exists
SELECT 
    'Checking if carousel_images table exists...' as step,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'carousel_images'
    ) as table_exists;

-- Show all columns in the carousel_images table
SELECT 
    'Carousel table columns:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'carousel_images'
ORDER BY ordinal_position;

-- Count existing data
SELECT 
    'Current data count:' as info,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE status = 'active') as active_rows
FROM carousel_images;

-- Show sample data (if any)
SELECT 
    'Sample data (first 3 rows):' as info,
    id,
    title,
    url,
    status,
    order_index
FROM carousel_images 
ORDER BY order_index 
LIMIT 3;