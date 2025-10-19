-- Script to add golf courses to the database
-- Run this in the Supabase SQL Editor or using psql

-- Add your golf courses here
INSERT INTO public.golf_clubs (name) 
VALUES 
    ('Pine Valley Golf Club'),
    ('Augusta National Golf Club'),
    ('St. Andrews Golf Club'),
    ('Pebble Beach Golf Links'),
    ('Royal County Down'),
    ('Oakmont Country Club')
ON CONFLICT (name) DO NOTHING;

-- View all golf clubs
SELECT 
    id, 
    name, 
    created_at,
    (SELECT COUNT(*) FROM public.users WHERE club_id = golf_clubs.id) as member_count
FROM public.golf_clubs 
ORDER BY name;

-- Optional: Update a user to be associated with a golf club
-- UPDATE public.users 
-- SET club_id = (SELECT id FROM public.golf_clubs WHERE name = 'Pine Valley Golf Club')
-- WHERE email = 'user@example.com';

