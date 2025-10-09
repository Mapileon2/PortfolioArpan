-- Complete SaaS Database Schema for Portfolio System
-- Senior Software Engineer Implementation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with comprehensive fields
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case studies table with comprehensive structure
CREATE TABLE case_studies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_title VARCHAR(255) NOT NULL,
    project_description TEXT,
    project_image_url TEXT,
    slug VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    sections JSONB NOT NULL DEFAULT '{}',
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT[],
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uploaded files table for Cloudinary integration
CREATE TABLE uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    cloudinary_public_id VARCHAR(255) NOT NULL,
    cloudinary_url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    folder VARCHAR(100) DEFAULT 'general',
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User storage usage tracking
CREATE TABLE user_storage_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_size_mb DECIMAL(10,2) DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh tokens for JWT authentication
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs for audit trail
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_id UUID,
    resource_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case study views tracking
CREATE TABLE case_study_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_study_id UUID NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
    viewer_ip INET,
    viewer_user_agent TEXT,
    referrer TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case study likes/reactions
CREATE TABLE case_study_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_study_id UUID NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reaction_type VARCHAR(50) DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'wow', 'insightful')),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(case_study_id, user_id, ip_address)
);

-- Comments system
CREATE TABLE case_study_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_study_id UUID NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES case_study_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions and billing
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    plan_name VARCHAR(100) NOT NULL,
    plan_price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics data
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_case_studies_user_id ON case_studies(user_id);
CREATE INDEX idx_case_studies_status ON case_studies(status);
CREATE INDEX idx_case_studies_featured ON case_studies(featured);
CREATE INDEX idx_case_studies_slug ON case_studies(slug);
CREATE INDEX idx_case_studies_published_at ON case_studies(published_at);
CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_folder ON uploaded_files(folder);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_case_study_views_case_study_id ON case_study_views(case_study_id);
CREATE INDEX idx_case_study_reactions_case_study_id ON case_study_reactions(case_study_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own_data ON users FOR ALL USING (auth.uid() = id);

-- Case studies policies
CREATE POLICY case_studies_owner ON case_studies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY case_studies_public_read ON case_studies FOR SELECT USING (status = 'published');

-- Uploaded files policies
CREATE POLICY uploaded_files_owner ON uploaded_files FOR ALL USING (auth.uid() = user_id);

-- Storage usage policies
CREATE POLICY storage_usage_owner ON user_storage_usage FOR ALL USING (auth.uid() = user_id);

-- Refresh tokens policies
CREATE POLICY refresh_tokens_owner ON refresh_tokens FOR ALL USING (auth.uid() = user_id);

-- Activity logs policies
CREATE POLICY activity_logs_owner ON activity_logs FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY subscriptions_owner ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_case_studies_updated_at BEFORE UPDATE ON case_studies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_storage_usage_updated_at BEFORE UPDATE ON user_storage_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_user_storage_usage(p_user_id UUID, p_size_change DECIMAL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_storage_usage (user_id, total_size_mb, file_count)
    VALUES (p_user_id, GREATEST(0, p_size_change), CASE WHEN p_size_change > 0 THEN 1 ELSE 0 END)
    ON CONFLICT (user_id) DO UPDATE SET
        total_size_mb = GREATEST(0, user_storage_usage.total_size_mb + p_size_change),
        file_count = user_storage_usage.file_count + CASE WHEN p_size_change > 0 THEN 1 ELSE -1 END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_unique_slug(title TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base slug from title
    base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- Ensure slug is not empty
    IF base_slug = '' THEN
        base_slug := 'case-study';
    END IF;
    
    final_slug := base_slug;
    
    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (SELECT 1 FROM case_studies WHERE slug = final_slug AND case_studies.user_id = generate_unique_slug.user_id) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_case_study_views(p_case_study_id UUID, p_ip INET, p_user_agent TEXT)
RETURNS VOID AS $$
BEGIN
    -- Insert view record
    INSERT INTO case_study_views (case_study_id, viewer_ip, viewer_user_agent, viewed_at)
    VALUES (p_case_study_id, p_ip, p_user_agent, NOW());
    
    -- Update view count (only count unique IPs per day)
    UPDATE case_studies 
    SET view_count = (
        SELECT COUNT(DISTINCT viewer_ip) 
        FROM case_study_views 
        WHERE case_study_id = p_case_study_id
        AND viewed_at >= CURRENT_DATE
    )
    WHERE id = p_case_study_id;
END;
$$ LANGUAGE plpgsql;

-- Create initial storage usage records for existing users
INSERT INTO user_storage_usage (user_id, total_size_mb, file_count)
SELECT id, 0, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Sample data for development (remove in production)
-- INSERT INTO users (email, password_hash, full_name, role, subscription_tier) VALUES
-- ('admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Admin User', 'admin', 'enterprise'),
-- ('user@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'Test User', 'user', 'free');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
-- =====
=============== CAROUSEL SLIDES TABLE ====================

-- Create carousel_slides table for homepage carousel management
CREATE TABLE IF NOT EXISTS carousel_slides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_carousel_slides_order ON carousel_slides(order_index);
CREATE INDEX IF NOT EXISTS idx_carousel_slides_active ON carousel_slides(is_active);
CREATE INDEX IF NOT EXISTS idx_carousel_slides_created ON carousel_slides(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_carousel_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_carousel_slides_updated_at
    BEFORE UPDATE ON carousel_slides
    FOR EACH ROW
    EXECUTE FUNCTION update_carousel_slides_updated_at();

-- Insert sample carousel slides
INSERT INTO carousel_slides (title, description, image_url, link_url, order_index, is_active) VALUES
('Welcome to My Portfolio', 'Discover my journey in product management and consulting', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200', '#about', 0, true),
('Featured Case Study', 'Explore my latest project and its impact', 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200', '#case-studies', 1, true),
('My Expertise', 'Learn about my skills and experience', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200', '#expertise', 2, true)
ON CONFLICT DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE carousel_slides ENABLE ROW LEVEL SECURITY;

-- Create policies for carousel_slides
CREATE POLICY "Allow public read access to active carousel slides" ON carousel_slides
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated users full access to carousel slides" ON carousel_slides
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON carousel_slides TO authenticated;
GRANT SELECT ON carousel_slides TO anon;

-- Add comments for documentation
COMMENT ON TABLE carousel_slides IS 'Stores carousel slides for the homepage with ordering and activation controls';
COMMENT ON COLUMN carousel_slides.title IS 'Display title for the carousel slide';
COMMENT ON COLUMN carousel_slides.description IS 'Optional description text for the slide';
COMMENT ON COLUMN carousel_slides.image_url IS 'URL of the slide image (typically from Cloudinary)';
COMMENT ON COLUMN carousel_slides.link_url IS 'Optional URL to navigate to when slide is clicked';
COMMENT ON COLUMN carousel_slides.order_index IS 'Display order of the slide (0-based)';
COMMENT ON COLUMN carousel_slides.is_active IS 'Whether the slide is currently active and should be displayed';