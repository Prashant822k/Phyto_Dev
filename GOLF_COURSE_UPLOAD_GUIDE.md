# Golf Course-Based Upload System Guide

## Overview

Your R2 upload system has been updated to organize files by golf course name. Files are now automatically stored in structured folders based on the selected golf course.

## Folder Structure

Files are now organized as:
```
map-stats-tiles-prod/
├── pine-valley-golf-club/
│   ├── 1697123456789_image1.png
│   └── 1697123456790_image2.png
├── augusta-national-golf-club/
│   ├── 1697123456791_image3.png
│   └── 1697123456792_image4.png
└── st-andrews-golf-club/
    └── 1697123456793_image5.png
```

**Note**: Golf course names are automatically sanitized:
- Converted to lowercase
- Spaces replaced with hyphens
- Special characters removed
- Example: "Pine Valley Golf Club" → "pine-valley-golf-club"

## How It Works

### 1. Frontend (Admin Upload Flow)

When an admin uploads files:

1. **Select Golf Course**: A dropdown appears at the top of the upload form
2. **Choose Files**: Select PNG tiles to upload
3. **Upload**: Files are automatically uploaded to `{sanitized-golf-course-name}/filename.png`

The golf course selector:
- Loads all available golf courses from the database
- Shows the sanitized folder name that will be used
- Required field - upload won't proceed without selection

### 2. Backend Processing

The Supabase Edge Function (`r2-sign`):
- Validates admin permissions (only admins can upload)
- Accepts the full path with golf course folder
- Generates signed URLs for R2 uploads
- No automatic path prefixing (uses path as provided)

### 3. Database

Golf courses are stored in the `golf_clubs` table:
```sql
CREATE TABLE public.golf_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

### 1. Add Golf Courses

Run the provided SQL script in your Supabase SQL Editor:

```bash
# Use the add-golf-courses.sql file
```

Or manually add courses:
```sql
INSERT INTO public.golf_clubs (name) 
VALUES ('Your Golf Course Name')
ON CONFLICT (name) DO NOTHING;
```

### 2. Environment Variables

#### Frontend (.env in project root)
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Backend (supabase/functions/.env)
```env
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=map-stats-tiles-prod
CLOUDFLARE_R2_REGION=auto

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Deploy Edge Functions

```bash
cd Phyto_Dev
supabase functions deploy r2-sign
```

## Usage Examples

### Adding a New Golf Course

**Option 1: SQL Editor**
```sql
INSERT INTO public.golf_clubs (name) 
VALUES ('Pebble Beach Golf Links');
```

**Option 2: Supabase Dashboard**
1. Go to Table Editor
2. Select `golf_clubs` table
3. Click "Insert row"
4. Enter the golf course name

### Uploading Files

1. Log in as admin
2. Navigate to the upload page
3. Select golf course from dropdown
4. Upload PNG files
5. Files are stored in: `{sanitized-course-name}/timestamp_filename.png`

### Retrieving Files

Files are retrieved using signed URLs from R2:
```typescript
const signedUrl = await ImageService.getImageUrl(image);
```

The backend automatically generates time-limited signed URLs (15 minutes by default).

## Security

- **Admins**: Full access to upload and view all golf course folders
- **Clients**: Can only view files from their assigned club (if club_id is set)
- **Folder Creation**: Folders are created automatically when first file is uploaded
- **Path Validation**: Backend validates paths to prevent unauthorized access

## API Reference

### ImageService.uploadTile()

```typescript
await ImageService.uploadTile(file, {
  lat?: number,
  lon?: number,
  zoomLevel?: number,
  tileX?: number,
  tileY?: number,
  golfCourseName: string  // NEW: Golf course name
});
```

### R2Service Methods

- `uploadFile(key, file)`: Upload file to R2
- `getGetUrl(key)`: Get signed URL for reading
- `deleteObject(key)`: Delete file from R2
- `list(prefix)`: List files with prefix

## Troubleshooting

### Golf Courses Not Loading
- Check database connection
- Verify `golf_clubs` table exists
- Check browser console for errors

### Upload Fails
- Verify admin permissions
- Check R2 credentials in backend .env
- Verify Supabase Edge Function is deployed
- Check network tab for error details

### Wrong Folder Structure
- Verify `sanitizeGolfCourseName()` is working
- Check the key being sent to R2
- Look at backend logs in Supabase dashboard

## Testing

### Test File Upload Flow

1. Add a test golf course:
```sql
INSERT INTO public.golf_clubs (name) VALUES ('Test Course');
```

2. Upload a file as admin
3. Verify in R2 bucket: `test-course/timestamp_filename.png`

### Verify Sanitization

```typescript
import { sanitizeGolfCourseName } from '@/lib/utils';

console.log(sanitizeGolfCourseName('Pine Valley Golf Club'));
// Output: pine-valley-golf-club

console.log(sanitizeGolfCourseName('St. Andrews (Old Course)'));
// Output: st-andrews-old-course
```

## Migration Notes

### Existing Files

Old files remain in their original paths:
- `club/{club_id}/user/{user_id}/filename.png` (old structure)
- `{golf-course-name}/filename.png` (new structure)

Both structures are supported. The system automatically uses the new structure for new uploads.

### Updating Old Files (Optional)

If you want to migrate old files to the new structure, you'll need to:
1. List all files in R2
2. Download each file
3. Re-upload with new key structure
4. Update database records with new paths

## Support

For issues or questions:
1. Check Supabase logs: Dashboard → Functions → r2-sign → Logs
2. Check browser console for frontend errors
3. Verify R2 bucket contents in Cloudflare dashboard
4. Check database `images` table for correct paths

## Future Enhancements

Potential improvements:
- Bulk golf course import from CSV
- Golf course metadata (location, size, etc.)
- Folder size limits per course
- Analytics per golf course
- Auto-archive old uploads

