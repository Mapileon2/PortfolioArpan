-- Portfolio SaaS Database Schema - RLS Infinite Recursion Fix
-- This schema fixes the infinite recursion issue in RLS policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    bio TEXT,
    website TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    long_description TEXT,
    image_url TEXT,
    technologies TEXT[],
    github_url TEXT,
    live_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
    featured BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CASE STUDIES TABLE
CREATE TABLE IF NOT EXISTS case_studies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_title TEXT NOT NULL,
    project_description TEXT,
    project_image_url TEXT,
    sections JSONB DEFAULT '{}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    tags TEXT[],
    reading_time INTEGER,
    views_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CAROUSEL IMAGES TABLE
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

-- SKILLS TABLE
CREATE TABLE IF NOT EXISTS skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    proficiency INTEGER CHECK (proficiency >= 0 AND proficiency <= 100),
    icon TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TESTIMONIALS TABLE
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    company TEXT,
    content TEXT NOT NULL,
    avatar_url TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    featured BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TIMELINE TABLE
CREATE TABLE IF NOT EXISTS timeline (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT,
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONTACT INFO TABLE
CREATE TABLE IF NOT EXISTS contact_info (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT,
    phone TEXT,
    location TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    twitter_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER DEFAULT 1 PRIMARY KEY CHECK (id = 1),
    site_title TEXT DEFAULT 'My Portfolio',
    site_description TEXT DEFAULT 'Professional portfolio website',
    site_logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#10B981',
    font_family TEXT DEFAULT 'Inter',
    analytics_id TEXT,
    seo_keywords TEXT[],
    social_sharing_image TEXT,
    maintenance_mode BOOLEAN DEFAULT false,
    time_zone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API KEYS TABLE
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    permissions TEXT[],
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ANALYTICS EVENTS TABLE
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id TEXT,
    user_agent TEXT,
    ip_address INET,
    page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SECURITY LOGS TABLE
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BACKUPS TABLE
CREATE TABLE IF NOT EXISTS backups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'scheduled', 'pre_update')),
    file_path TEXT NOT NULL,
    file_size BIGINT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- INTEGRATIONS TABLE
CREATE TABLE IF NOT EXISTS integrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- SUBSCRIPTION INFO TABLE
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    plan_type TEXT DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'yearly', 'lifetime')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DATABASE INDEXES
-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_order_index ON projects(order_index);

-- Case studies indexes
CREATE INDEX IF NOT EXISTS idx_case_studies_status ON case_studies(status);
CREATE INDEX IF NOT EXISTS idx_case_studies_featured ON case_studies(featured);
CREATE INDEX IF NOT EXISTS idx_case_studies_created_by ON case_studies(created_by);

-- Carousel images indexes
CREATE INDEX IF NOT EXISTS idx_carousel_images_status ON carousel_images(status);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order_index ON carousel_images(order_index);

-- Skills indexes
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_order_index ON skills(order_index);

-- Testimonials indexes
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_order_index ON testimonials(order_index);

-- Timeline indexes
CREATE INDEX IF NOT EXISTS idx_timeline_is_current ON timeline(is_current);
CREATE INDEX IF NOT EXISTS idx_timeline_start_date ON timeline(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_order_index ON timeline(order_index);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

-- Security logs indexes
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ROW LEVEL SECURITY (RLS) SETUP
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- FIXED RLS POLICIES - NO INFINITE RECURSION
-- User profiles policies - FIXED to avoid recursion
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create a security definer function to check admin role safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users u
        JOIN user_profiles p ON u.id = p.id
        WHERE u.id = auth.uid() 
        AND p.role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin view policy using the safe function
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (public.is_admin());

-- Projects policies (public read, admin write)
CREATE POLICY "Anyone can view published projects" ON projects
    FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage projects" ON projects
    FOR ALL USING (public.is_admin());

-- Case studies policies (public read, admin write)
CREATE POLICY "Anyone can view published case studies" ON case_studies
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage case studies" ON case_studies
    FOR ALL USING (public.is_admin());

-- Carousel images policies (public read, admin write)
CREATE POLICY "Anyone can view active carousel images" ON carousel_images
    FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage carousel images" ON carousel_images
    FOR ALL USING (public.is_admin());

-- Skills policies (public read, admin write)
CREATE POLICY "Anyone can view skills" ON skills
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage skills" ON skills
    FOR ALL USING (public.is_admin());

-- Testimonials policies (public read, admin write)
CREATE POLICY "Anyone can view testimonials" ON testimonials
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage testimonials" ON testimonials
    FOR ALL USING (public.is_admin());

-- Timeline policies (public read, admin write)
CREATE POLICY "Anyone can view timeline" ON timeline
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage timeline" ON timeline
    FOR ALL USING (public.is_admin());

-- Contact info policies (public read, admin write)
CREATE POLICY "Anyone can view contact info" ON contact_info
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage contact info" ON contact_info
    FOR ALL USING (public.is_admin());

-- Site settings policies (public read, admin write)
CREATE POLICY "Anyone can view site settings" ON site_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage site settings" ON site_settings
    FOR ALL USING (public.is_admin());

-- API keys policies (admin only)
CREATE POLICY "Admins can manage API keys" ON api_keys
    FOR ALL USING (public.is_admin());

-- Analytics events policies (admin only)
CREATE POLICY "Anyone can insert analytics events" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view analytics events" ON analytics_events
    FOR SELECT USING (public.is_admin());

-- Security logs policies (admin only)
CREATE POLICY "Admins can view security logs" ON security_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "System can insert security logs" ON security_logs
    FOR INSERT WITH CHECK (true);

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON user_sessions
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions" ON user_sessions
    FOR INSERT WITH CHECK (true);

-- Backups policies (admin only)
CREATE POLICY "Admins can manage backups" ON backups
    FOR ALL USING (public.is_admin());

-- Integrations policies (admin only)
CREATE POLICY "Admins can manage integrations" ON integrations
    FOR ALL USING (public.is_admin());

-- Support tickets policies
CREATE POLICY "Users can view their own tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage all tickets" ON support_tickets
    FOR ALL USING (public.is_admin());

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions" ON subscriptions
    FOR ALL USING (public.is_admin());

-- DATABASE FUNCTIONS
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON case_studies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON carousel_images
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON testimonials
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON timeline
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON contact_info
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- INITIAL DATA SETUP
-- Insert default site settings
INSERT INTO site_settings (
    site_title,
    site_description,
    primary_color,
    secondary_color
) VALUES (
    'My Portfolio',
    'Professional portfolio website',
    '#3B82F6',
    '#10B981'
)
ON CONFLICT DO NOTHING;

-- DATABASE VIEWS
-- View for public portfolio data
CREATE OR REPLACE VIEW public_portfolio AS
SELECT 
    p.id,
    p.title,
    p.description,
    p.image_url,
    p.technologies,
    p.github_url,
    p.live_url,
    p.featured,
    p.order_index,
    p.created_at,
    p.updated_at
FROM projects p
WHERE p.status = 'active'
ORDER BY p.order_index, p.created_at DESC;

-- View for public case studies
CREATE OR REPLACE VIEW public_case_studies AS
SELECT 
    cs.id,
    cs.project_title,
    cs.project_description,
    cs.project_image_url,
    cs.sections,
    cs.featured,
    cs.tags,
    cs.reading_time,
    cs.views_count,
    cs.created_at,
    cs.updated_at
FROM case_studies cs
WHERE cs.status = 'published'
ORDER BY cs.order_index, cs.created_at DESC;

-- View for active carousel images
CREATE OR REPLACE VIEW active_carousel AS
SELECT 
    ci.id,
    ci.title,
    ci.description,
    ci.image_url,
    ci.link_url,
    ci.button_text,
    ci.order_index
FROM carousel_images ci
WHERE ci.status = 'active'
ORDER BY ci.order_index;

-- COMPLETION MESSAGE
DO $$
BEGIN
    RAISE NOTICE 'Portfolio SaaS database schema has been successfully created!';
    RAISE NOTICE 'RLS infinite recursion issue has been FIXED!';
    RAISE NOTICE 'All tables, indexes, RLS policies, and functions are now ready.';
    RAISE NOTICE 'You can now start using your portfolio management system.';
END $$;