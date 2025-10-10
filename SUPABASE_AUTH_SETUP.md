# Supabase Authentication Setup Guide

This guide will walk you through setting up authentication and user management in your Supabase project for PhytoMaps.

## Step 1: Create Required Tables in Supabase

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project
3. Go to the SQL Editor
4. Copy and paste the SQL from the `supabase-users-setup.sql` file in this project
5. Run the SQL to create the necessary tables and policies

## Step 2: Configure Authentication Settings

1. In your Supabase dashboard, go to Authentication → Settings
2. Under "Email Auth", ensure "Enable Email Signup" is turned ON
3. Configure any additional authentication providers as needed

## Step 3: Set Up Environment Variables

Ensure your `.env` file contains the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Test User Registration and Login

1. Start your development server with `npm run dev`
2. Navigate to the registration page
3. Create a new user account
4. Verify the user is created in Supabase (check Authentication → Users)
5. Test logging in with the new account

## Troubleshooting

### Registration Error: "Database error saving new user"

This error occurs when:
1. The `users` table doesn't exist
2. The required fields in the `users` table don't match what's being sent
3. The database trigger for user creation isn't set up correctly

Solution:
- Verify the SQL in `supabase-users-setup.sql` has been executed
- Check that the `users` table has all required fields
- Ensure the database trigger is properly configured

### Login Error

If users can register but not log in:
1. Check that the user exists in the Auth section of Supabase
2. Verify the user has a corresponding entry in the `users` table
3. Ensure your application is using the correct Supabase credentials

## Database Schema

### Users Table
```sql
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  golf_club_id UUID REFERENCES public.golf_clubs(id),
  organization TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

### Golf Clubs Table
```sql
CREATE TABLE IF NOT EXISTS public.golf_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```