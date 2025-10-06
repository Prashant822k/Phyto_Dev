# Supabase Storage Setup Guide

Since you're not using Cloudflare R2, you'll need to set up Supabase Storage buckets for your application.

## Step 1: Create Storage Buckets

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Create the following buckets:

### Bucket 1: `raw-images`
- **Purpose**: Store uploaded PNG tiles
- **Public**: Yes (so images can be accessed via public URLs)
- **File size limit**: 50MB
- **Allowed MIME types**: `image/png`

### Bucket 2: `processed-images` (optional)
- **Purpose**: Store processed/analyzed images
- **Public**: Yes
- **File size limit**: 50MB
- **Allowed MIME types**: `image/png`, `image/jpeg`

## Step 2: Set Up Storage Policies

### For `raw-images` bucket:
```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'raw-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (bucket_id = 'raw-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (bucket_id = 'raw-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### For `processed-images` bucket (if created):
```sql
-- Allow authenticated users to upload processed files
CREATE POLICY "Users can upload processed files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'processed-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view processed files
CREATE POLICY "Users can view processed files" ON storage.objects
FOR SELECT USING (bucket_id = 'processed-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 3: Test the Setup

1. Start your development server: `npm run dev`
2. Try uploading a PNG file
3. Check the `raw-images` bucket in your Supabase dashboard to see if the file was uploaded
4. Verify the file has a public URL that you can access

## Troubleshooting

### If uploads fail:
1. Check that the `raw-images` bucket exists
2. Verify the storage policies are set correctly
3. Make sure your user is authenticated
4. Check the browser console for any error messages

### If you get "bucket not found" errors:
1. Ensure the bucket name is exactly `raw-images` (case-sensitive)
2. Check that the bucket is public
3. Verify the bucket was created successfully in the Supabase dashboard

## File Structure in Storage

Files will be stored with the following structure:
```
raw-images/
  └── {user_id}/
      └── {timestamp}_{filename}.png
```

This ensures each user's files are organized and isolated from other users.
