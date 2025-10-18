-- Simple Carousel Database Fix
-- This script adds test data to the existing carousel_images table

-- Insert test data if table is empty
INSERT INTO carousel_images (
    title, 
    description, 
    url, 
    thumbnail_url,
    alt_text,
    status,
    order_index
) 
SELECT 
    'Beautiful Landscape',
    'A stunning landscape showcasing natural beauty and serenity',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop',
    'Beautiful landscape with mountains and lake',
    'active',
    0
WHERE NOT EXISTS (SELECT 1 FROM carousel_images LIMIT 1);

INSERT INTO carousel_images (
    title, 
    description, 
    url, 
    thumbnail_url,
    alt_text,
    status,
    order_index
) 
SELECT 
    'Modern Technology',
    'Cutting-edge technology solutions for the digital age',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=300&h=200&fit=crop',
    'Modern technology and digital innovation',
    'active',
    1
WHERE (SELECT COUNT(*) FROM carousel_images) < 2;

INSERT INTO carousel_images (
    title, 
    description, 
    url, 
    thumbnail_url,
    alt_text,
    status,
    order_index
) 
SELECT 
    'Creative Design',
    'Innovative design solutions that inspire and engage',
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=300&h=200&fit=crop',
    'Creative design and artistic innovation',
    'active',
    2
WHERE (SELECT COUNT(*) FROM carousel_images) < 3;

-- Verify the data was inserted
SELECT 
    'Carousel test data inserted successfully!' as status,
    COUNT(*) as total_images,
    COUNT(*) FILTER (WHERE status = 'active') as active_images
FROM carousel_images;