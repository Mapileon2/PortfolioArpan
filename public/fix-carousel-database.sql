-- Fix Carousel Database Issues
-- This script ensures the carousel_images table exists and has test data

-- Step 1: Ensure the carousel_images table exists with correct structure (matching existing schema)
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

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_carousel_images_status ON carousel_images(status);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order_index ON carousel_images(order_index);

-- Step 3: Enable RLS (Row Level Security)
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for public access
DROP POLICY IF EXISTS "Anyone can view active carousel images" ON carousel_images;
CREATE POLICY "Anyone can view active carousel images" ON carousel_images
    FOR SELECT USING (status = 'active');

-- Step 5: Create RLS policy for admin management (if user_profiles table exists)
DROP POLICY IF EXISTS "Admins can manage carousel images" ON carousel_images;
CREATE POLICY "Admins can manage carousel images" ON carousel_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'editor')
        )
    );

-- Step 6: Insert test data if table is empty
INSERT INTO carousel_images (
    title, 
    description, 
    image_url, 
    link_url,
    button_text,
    status,
    order_index
) 
SELECT 
    'Beautiful Landscape',
    'A stunning landscape showcasing natural beauty and serenity',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    '#',
    'Explore Nature',
    'active',
    0
WHERE NOT EXISTS (SELECT 1 FROM carousel_images LIMIT 1);

INSERT INTO carousel_images (
    title, 
    description, 
    image_url, 
    link_url,
    button_text,
    status,
    order_index
) 
SELECT 
    'Modern Technology',
    'Cutting-edge technology solutions for the digital age',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
    '#',
    'Learn More',
    'active',
    1
WHERE (SELECT COUNT(*) FROM carousel_images) < 2;

INSERT INTO carousel_images (
    title, 
    description, 
    image_url, 
    link_url,
    button_text,
    status,
    order_index
) 
SELECT 
    'Creative Design',
    'Innovative design solutions that inspire and engage',
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=600&fit=crop',
    '#',
    'View Portfolio',
    'active',
    2
WHERE (SELECT COUNT(*) FROM carousel_images) < 3;

-- Step 7: Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at ON carousel_images;
CREATE TRIGGER handle_updated_at 
    BEFORE UPDATE ON carousel_images
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Step 8: Verify the setup
SELECT 
    'Carousel table setup complete!' as status,
    COUNT(*) as total_images,
    COUNT(*) FILTER (WHERE status = 'active') as active_images
FROM carousel_images;