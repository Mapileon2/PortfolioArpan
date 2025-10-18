-- Simple Fix for RLS Infinite Recursion Issue
-- Run this script to fix the existing database without recreating everything

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any project" ON projects;
DROP POLICY IF EXISTS "Editors can create projects" ON projects;
DROP POLICY IF EXISTS "Editors can create case studies" ON case_studies;
DROP POLICY IF EXISTS "Editors can manage carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Admins can view analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Admins can view security logs" ON security_logs;

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

-- Create a security definer function to check editor role safely
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users u
        JOIN user_profiles p ON u.id = p.id
        WHERE u.id = auth.uid() 
        AND p.role IN ('editor', 'admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate all admin policies using the safe functions
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update user profiles" ON user_profiles
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Editors can create projects" ON projects
    FOR INSERT WITH CHECK (public.is_editor());

CREATE POLICY "Admins can update any project" ON projects
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Editors can create case studies" ON case_studies
    FOR INSERT WITH CHECK (public.is_editor());

CREATE POLICY "Editors can manage carousel images" ON carousel_images
    FOR ALL USING (public.is_editor());

CREATE POLICY "Admins can view analytics events" ON analytics_events
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view security logs" ON security_logs
    FOR SELECT USING (public.is_admin());

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS infinite recursion issue has been FIXED!';
    RAISE NOTICE 'All policies have been recreated safely.';
    RAISE NOTICE 'You can now create case studies without errors.';
END $$;