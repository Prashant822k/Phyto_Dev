-- Admin Account Creation Script
-- Run this in Supabase SQL Editor to create admin accounts

-- IMPORTANT: First create the user in Supabase Dashboard (Authentication > Users)
-- Then run this script to set their role to admin

-- Example: Create admin account for admin@phytomaps.com
-- Replace the email below with your desired admin email

-- Method 1: Update existing user to admin role
UPDATE public.users 
SET 
    role = 'admin',
    full_name = COALESCE(full_name, 'System Administrator'),
    organization = COALESCE(organization, 'PhytoMaps')
WHERE email = 'admin@phytomaps.com';

-- Method 2: If user doesn't exist in public.users table, insert them
-- (This should only happen if the trigger failed)
INSERT INTO public.users (id, email, full_name, role, organization)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', 'System Administrator'),
    'admin',
    'PhytoMaps'
FROM auth.users au
WHERE au.email = 'admin@phytomaps.com'
AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Verify the admin account was created/updated
SELECT 
    u.email,
    u.full_name,
    u.role,
    u.organization,
    u.created_at,
    u.updated_at
FROM public.users u
WHERE u.email = 'admin@phytomaps.com';

-- Test the admin function
SELECT 
    'Admin function test' as test_name,
    public.is_admin() as is_current_user_admin;

-- Create multiple admin accounts (uncomment and modify as needed)
/*
-- Admin 2
UPDATE public.users 
SET role = 'admin', full_name = 'Admin User 2', organization = 'PhytoMaps'
WHERE email = 'admin2@phytomaps.com';

-- Admin 3  
UPDATE public.users 
SET role = 'admin', full_name = 'Admin User 3', organization = 'PhytoMaps'
WHERE email = 'admin3@phytomaps.com';
*/

-- View all current admin users
SELECT 
    'Current Admin Users' as info,
    email,
    full_name,
    role,
    organization,
    created_at
FROM public.users 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Create some sample golf clubs for testing (optional)
INSERT INTO public.golf_clubs (name) 
VALUES 
    ('Pine Valley Golf Club'),
    ('Augusta National Golf Club'),
    ('St. Andrews Golf Club')
ON CONFLICT (name) DO NOTHING;

-- View all golf clubs
SELECT 'Golf Clubs' as info, id, name, created_at FROM public.golf_clubs ORDER BY name;
