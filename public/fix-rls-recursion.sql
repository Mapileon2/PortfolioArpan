-- Quick Fix for RLS Infinite Recursion Issue
-- Run this script to fix the existing database without recreating everything

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage case studies" ON case_studies;
DROP POLICY IF EXISTS "Admins can manage carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admins can manage skills" ON skills;
DROP POLICY IF EXISTS "Admins can manage testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admins can manage timeline" ON timeline;
DROP POLICY IF EXISTS "Admins can manage contact info" ON contact_info;
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can manage API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can view analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Admins can view security logs" ON security_logs;
DROP POLICY IF EXISTS "Admins can manage backups" ON backups;
DROP POLICY IF EXISTS "Admins can manage integrations" ON integrations;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON subscriptions;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.is_admin();

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

-- Recreate all admin policies using the safe function
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage projects" ON projects
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage case studies" ON case_studies
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage carousel images" ON carousel_images
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage skills" ON skills
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage testimonials" ON testimonials
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage timeline" ON timeline
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage contact info" ON contact_info
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage site settings" ON site_settings
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage API keys" ON api_keys
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can view analytics events" ON analytics_events
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view security logs" ON security_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage backups" ON backups
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage integrations" ON integrations
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage all tickets" ON support_tickets
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admins can manage subscriptions" ON subscriptions
    FOR ALL USING (public.is_admin());

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS infinite recursion issue has been FIXED!';
    RAISE NOTICE 'All policies have been recreated safely.';
    RAISE NOTICE 'You can now create case studies without errors.';
END $$;