# Quick Start - Golf Course Upload System

## ✅ What's Been Implemented

Your R2 upload system now organizes files by golf course name:
- **Before**: `map-stats-tiles-prod/club/{id}/user/{id}/file.png`
- **After**: `map-stats-tiles-prod/{golf-course-name}/file.png`

## 🚀 Get Started in 3 Steps

### Step 1: Add Your Supabase Credentials

You mentioned you don't have a frontend `.env` file. Create one:

**Create**: `Phyto_Dev/.env` (in project root)
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to find these:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon public** key

**Also update**: `Phyto_Dev/supabase/functions/.env`
```env
# Your existing R2 credentials (already there ✓)
CLOUDFLARE_R2_ACCOUNT_ID=108d9b8a522dc184c8dcfe313a48ba7c
CLOUDFLARE_R2_ACCESS_KEY_ID=031ff571da095553e62121aa48a04152
CLOUDFLARE_R2_SECRET_ACCESS_KEY=2324d80c5c64cb264242b3c255d0e558e450bf953c8ddf0cf6ce9b8073bcdcf9
CLOUDFLARE_R2_BUCKET_NAME=map-stats-tiles-prod
CLOUDFLARE_R2_REGION=auto

# Add these:
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Add Golf Courses

Run this in your **Supabase SQL Editor**:

```sql
-- Add your golf courses
INSERT INTO public.golf_clubs (name) 
VALUES 
    ('Pine Valley Golf Club'),
    ('Augusta National'),
    ('St. Andrews')
ON CONFLICT (name) DO NOTHING;

-- Verify they were added
SELECT * FROM public.golf_clubs ORDER BY name;
```

Or use the provided file:
- Open Supabase SQL Editor
- Copy contents from `add-golf-courses.sql`
- Run it

### Step 3: Start Your App

```bash
cd Phyto_Dev
npm run dev
```

Then:
1. Login as admin
2. You'll see a "Select Golf Course" dropdown
3. Choose a course
4. Upload PNG files
5. Files go to: `map-stats-tiles-prod/{course-name}/file.png`

## 🧪 Test It

```bash
# Run the test script
node test-golf-course-upload.js
```

This shows you:
- How names are sanitized
- Expected folder structure
- SQL queries to verify uploads

## 📁 What Changed

### Frontend
- **FileUpload.tsx**: Added golf course dropdown
- **imageService.ts**: Uses golf course in path
- **utils.ts**: Sanitizes names for safe folder names

### Backend
- **r2-sign/index.ts**: Accepts golf course paths from frontend

### New Files
- `add-golf-courses.sql`: Add courses to database
- `test-golf-course-upload.js`: Test sanitization
- `GOLF_COURSE_UPLOAD_GUIDE.md`: Full documentation
- `CHANGES_SUMMARY.md`: Technical details
- `QUICK_START.md`: This file

## 🎯 Example Upload Flow

1. **Admin selects**: "Pine Valley Golf Club"
2. **Admin uploads**: `my-tile.png`
3. **File stored at**: `map-stats-tiles-prod/pine-valley-golf-club/1234567890_my-tile.png`
4. **Database path**: `pine-valley-golf-club/1234567890_my-tile.png`

## ✨ Name Sanitization

Golf course names are automatically cleaned:
- "Pine Valley Golf Club" → `pine-valley-golf-club`
- "St. Andrews (Old)" → `st-andrews-old`
- "The Best Golf!!!" → `the-best-golf`

## 🔒 Security

- ✅ Only admins can upload
- ✅ Folder names are sanitized
- ✅ Existing authentication unchanged
- ✅ Clients can only view their club's files

## 📝 Verify Everything Works

After uploading a file, check:

**In Supabase SQL Editor:**
```sql
-- See your latest uploads
SELECT filename, path, created_at 
FROM public.images 
ORDER BY created_at DESC 
LIMIT 5;
```

**In R2 Dashboard:**
- Go to Cloudflare R2
- Open `map-stats-tiles-prod` bucket
- See folders like `pine-valley-golf-club/`

## 🆘 Troubleshooting

### "Golf courses not loading"
- Check `.env` has correct Supabase credentials
- Verify `golf_clubs` table has data
- Check browser console for errors

### "Upload fails"
- Verify you're logged in as admin
- Check backend `.env` has R2 credentials
- Check Supabase Function logs

### "Wrong folder name"
- Names are sanitized automatically
- See `test-golf-course-upload.js` for examples
- Check the preview in the upload form

## 📚 More Information

- **Full Guide**: `GOLF_COURSE_UPLOAD_GUIDE.md`
- **Changes Made**: `CHANGES_SUMMARY.md`
- **Test Script**: `test-golf-course-upload.js`
- **Add Courses**: `add-golf-courses.sql`

## 🎉 You're Ready!

Everything is implemented and ready to use. Just add your Supabase credentials and golf courses, then start uploading!

**Need help?** Check the troubleshooting sections in `GOLF_COURSE_UPLOAD_GUIDE.md`

