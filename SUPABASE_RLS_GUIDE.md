# Supabase Storage RLS Policy Guide

This guide explains how to set up proper Row Level Security (RLS) policies for your Supabase Storage buckets to fix authentication issues with file uploads.

## Quick Fix Steps

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL from `setup-storage-policies.sql` file
4. Run the SQL to apply the policies

## Understanding Storage Policies

Supabase Storage uses RLS policies to control access to your buckets. For the `raw-images` bucket, we need:

1. **Public Read Access**: Allow anyone to read files (for displaying images)
2. **Authenticated Upload**: Only authenticated users can upload files
3. **Owner-based Access Control**: Users can only modify/delete their own files

## Manual Policy Setup

If you prefer to set up policies manually through the Supabase dashboard:

1. Go to Storage → Policies
2. For the `raw-images` bucket, create these policies:

### Read Policy (SELECT)
- Policy name: "Allow public read access for raw-images"
- Target roles: public (or authenticated if you want to restrict viewing)
- Using expression: `bucket_id = 'raw-images'`

### Insert Policy (INSERT)
- Policy name: "Allow authenticated uploads to raw-images"
- Target roles: authenticated
- Using expression: `bucket_id = 'raw-images'`

### Update Policy (UPDATE)
- Policy name: "Allow authenticated updates to raw-images"
- Target roles: authenticated
- Using expression: `bucket_id = 'raw-images' AND auth.uid() = owner`

### Delete Policy (DELETE)
- Policy name: "Allow authenticated deletes from raw-images"
- Target roles: authenticated
- Using expression: `bucket_id = 'raw-images' AND auth.uid() = owner`

## Troubleshooting

If you still encounter authentication issues:

1. Check browser console for specific error messages
2. Verify that your Supabase URL and anon key are correct in your environment variables
3. Make sure the `raw-images` bucket exists in your Supabase project
4. Test with a fresh login session
5. Clear browser cache and cookies if needed

## Development Mode

For development, we've implemented a fallback authentication that automatically creates and signs in with a demo account. This ensures uploads work even during development.