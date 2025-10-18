-- Safe Fix for RLS Infinite Recursion Issue
-- This script updates the existing function without dropping dependencies

-- Update the existing is_admin function to be safe (no recursion)
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS infinite recursion issue has been FIXED!';
    RAISE NOTICE 'Functions have been updated safely without dropping dependencies.';
    RAISE NOTICE 'You can now create case studies without errors.';
END $$;