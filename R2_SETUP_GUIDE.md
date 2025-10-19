# Cloudflare R2 Setup Guide

This guide will help you migrate from Supabase Storage to Cloudflare R2 for your map-stats application.

## 1. Create Cloudflare R2 Bucket

1. **Log into Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Navigate to **R2 Object Storage** in the left sidebar

2. **Create a New Bucket**
   - Click **"Create bucket"**
   - Choose a unique bucket name (e.g., `map-stats-tiles-prod`)
   - Select a location close to your users
   - Click **"Create bucket"**

3. **Configure Bucket Settings**
   - Keep the bucket **PRIVATE** (no public access)
   - Enable **CORS** if needed for direct browser uploads
   - Set appropriate **retention policies** if required

## 2. Create R2 API Tokens

### Admin Token (Full Access)
1. Go to **R2 Object Storage** → **Manage R2 API tokens**
2. Click **"Create API token"**
3. **Token name**: `map-stats-admin`
4. **Permissions**: 
   - ✅ **Object Read**
   - ✅ **Object Write** 
   - ✅ **Object Delete**
   - ✅ **Object List**
5. **Bucket access**: Select your bucket
6. Click **"Create API token"**
7. **Save the credentials** - you'll need:
   - `Access Key ID`
   - `Secret Access Key`

### Client Token (Read-Only) - Optional
1. Create another token with name `map-stats-client`
2. **Permissions**: 
   - ✅ **Object Read**
   - ❌ Object Write/Delete/List
3. **Bucket access**: Select your bucket
4. Save the credentials

## 3. Configure Supabase Edge Functions

### Environment Variables
Add these to your Supabase project's Edge Functions environment:

1. Go to **Supabase Dashboard** → **Edge Functions** → **Settings**
2. Add these environment variables:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_R2_ACCESS_KEY_ID=your_admin_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_admin_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name_here
```

**To find your Account ID:**
- Go to Cloudflare Dashboard → **R2 Object Storage**
- Your Account ID is shown in the right sidebar

## 4. Update Database Schema

Run the updated `supabase-schema.sql` in your Supabase SQL Editor:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `supabase-schema.sql`
3. Click **"Run"**

This will:
- Add `golf_clubs` table
- Add `role` and `club_id` columns to `users` table
- Set up RLS policies for club-based access control
- Create helper functions for admin checks

## 5. Deploy Edge Functions

Run the deployment script:

```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

This deploys:
- `process-image` - Updated to use R2 signed URLs
- `analyze-image` - Updated to use R2 signed URLs  
- `r2-sign` - New function for generating signed URLs

## 6. Test the Migration

### Admin Testing
1. Go to `/login-admin`
2. Sign in with an admin account
3. Go to `/admin` → **Upload Files** tab
4. Upload a PNG tile
5. Check **Manage Files** tab to see the file in R2
6. Test **Manage Clubs** and **Manage Users** tabs

### Client Testing
1. Go to `/login-client`
2. Sign in with a client account
3. Go to `/client` to view accessible outputs
4. Verify you can only see files from your club

## 7. Key Features Implemented

### Admin Privileges
- ✅ Upload files to R2 (PUT signed URLs)
- ✅ Delete any file from R2
- ✅ List all files in R2
- ✅ Create and manage golf clubs
- ✅ Assign users to clubs
- ✅ View all users and their roles

### Client Privileges  
- ✅ View processed outputs from their own club only
- ✅ Generate signed GET URLs for viewing images
- ❌ Cannot upload files (admin-only)
- ❌ Cannot delete files (admin-only)
- ❌ Cannot access other clubs' data

### Security Features
- ✅ R2 bucket is private (no public URLs)
- ✅ All access via signed URLs with expiration
- ✅ Club-based RLS policies in database
- ✅ Edge function enforces admin/client permissions
- ✅ File paths organized by club: `club/{club_id}/user/{user_id}/...`

## 8. File Organization in R2

Files are stored with this structure:
```
your-bucket/
├── club/
│   ├── {club-id-1}/
│   │   └── user/
│   │       └── {user-id}/
│   │           └── {timestamp}_{filename}.png
│   └── {club-id-2}/
│       └── user/
│           └── {user-id}/
│               └── {timestamp}_{filename}.png
└── user/
    └── {user-id}/  # For users without club assignment
        └── {timestamp}_{filename}.png
```

## 9. Troubleshooting

### Common Issues

**"Edge function error: 401 Unauthorized"**
- Check that R2 credentials are correctly set in Supabase Edge Functions environment
- Verify the user has proper role (admin/client) in the database

**"Edge function error: 403 Forbidden"**  
- Client trying to access admin-only operations
- Check user role in database: `SELECT role FROM users WHERE id = 'user-id'`

**"Failed to delete from R2"**
- Only admins can delete files
- Check user role and R2 permissions

**Images not showing in client dashboard**
- Verify user has `club_id` assigned
- Check RLS policies are working: `SELECT * FROM images WHERE user_id = 'user-id'`

### Debug Steps
1. Check Supabase logs: **Dashboard** → **Logs** → **Edge Functions**
2. Verify R2 credentials in Supabase environment variables
3. Test R2 access directly with AWS CLI or S3-compatible tools
4. Check database RLS policies in **Dashboard** → **Authentication** → **Policies**

## 10. Next Steps

After successful migration:
1. **Remove Supabase Storage buckets** (raw-images, processed-images) if no longer needed
2. **Update any remaining Supabase Storage references** in your codebase
3. **Set up monitoring** for R2 usage and costs
4. **Configure backup policies** for R2 if required
5. **Test Mapbox integration** with R2 signed URLs for tile visualization

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase Edge Function logs
3. Verify R2 bucket permissions and credentials
4. Test with a simple file upload first before complex operations
