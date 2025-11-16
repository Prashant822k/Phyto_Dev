# Quick Fix Guide for 400 Tile Loading Error

## What I've Done

### 1. ✅ Enhanced Error Logging
Updated both edge functions with detailed logging:
- `supabase/functions/tile-proxy/index.ts`
- `supabase/functions/r2-sign/index.ts`

### 2. ✅ Created Diagnostic Tools
- `test_tile_access.js` - Browser console test script
- `DEBUG_QUERY.sql` - Database verification queries
- `TROUBLESHOOT_400_ERROR.md` - Complete troubleshooting guide
- `R2_BUCKET_CHECK.md` - R2 configuration checklist

## Quick Fix Steps (5 minutes)

### Step 1: Deploy Updated Functions
```bash
cd "c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev"
supabase functions deploy tile-proxy
supabase functions deploy r2-sign
```

### Step 2: Run Browser Test
1. Open your app in browser
2. Press F12 to open DevTools
3. Go to Console tab
4. Copy and paste contents of `test_tile_access.js`
5. Press Enter

**This will show you exactly what's wrong!**

### Step 3: Fix Based on Test Results

#### If Test Shows: "User club does NOT match"
```sql
-- Option A: Make user admin (quick fix)
UPDATE users SET role = 'admin' WHERE email = '125@gmail.com';

-- Option B: Update user's club to match tileset
UPDATE users 
SET club_id = '4fe11be9-b17b-4070-b790-19bd0c0f2b9b'
WHERE email = '125@gmail.com';
```

#### If Test Shows: "R2 file not accessible"
1. Go to Cloudflare Dashboard
2. Navigate to R2 → `map-stats-tiles-prod`
3. Enable Public Access
4. Add CORS policy:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

#### If Test Shows: "Tileset not found"
```sql
-- Verify r2_folder_path
SELECT id, r2_folder_path 
FROM golf_course_tilesets 
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';

-- Should be exactly: test20/2025-11-05/09-30/tiles
-- If different, update it
```

### Step 4: Test Again
1. Refresh browser (Ctrl + Shift + R)
2. Load the map
3. Check if tiles appear

## Most Likely Issue

Based on typical setups, the issue is probably **user access**:
- Your user's `club_id` doesn't match the tileset's `golf_club_id`
- OR your user's `role` is not 'admin'

**Quick Fix:**
```sql
UPDATE users SET role = 'admin' WHERE email = '125@gmail.com';
```

Then refresh the browser.

## What the Test Script Shows

The `test_tile_access.js` script will output something like:

```
🔍 Testing Tile Access...

✅ Session found
   User: 125@gmail.com
   Token: eyJhbGciOiJIUzI1Ni...

📊 Test 1: Database Query
✅ Tileset found in database
   Name: test20
   r2_folder_path: test20/2025-11-05/09-30/tiles
   tile_url_pattern: {z}/{x}/{y}.png
   golf_club_id: 4fe11be9-b17b-4070-b790-19bd0c0f2b9b
   flight_date: 2024-11-05
   flight_time: 14:30:00

👤 Test 2: User Access Check
✅ User info:
   Email: 125@gmail.com
   Role: client
   Club ID: DIFFERENT_CLUB_ID
   Tileset Club ID: 4fe11be9-b17b-4070-b790-19bd0c0f2b9b
   ❌ User club does NOT match tileset club - NO ACCESS
   This is likely causing the 400 error!

🌐 Test 3: Tile Proxy Request
   Status: 400 Bad Request
   ❌ Tile fetch failed
   Error details: { error: "Access denied" }

🗄️ Test 4: Direct R2 Access
   Status: 200 OK
   ✅ R2 file accessible!
   Size: 12345 bytes
```

This tells you **exactly** what's wrong!

## After Fix

Once fixed, you should see:
- ✅ No errors in console
- ✅ Tiles loading on map
- ✅ Your orthomosaic imagery displayed

## Need More Help?

If still not working after these steps:
1. Check Supabase Edge Function logs
2. Review `TROUBLESHOOT_400_ERROR.md`
3. Verify R2 bucket settings with `R2_BUCKET_CHECK.md`
4. Run `DEBUG_QUERY.sql` to check database

## Files Created

1. **test_tile_access.js** - Run this first! 🎯
2. **DEPLOY_UPDATED_FUNCTIONS.md** - Deployment instructions
3. **DEBUG_QUERY.sql** - Database checks
4. **TROUBLESHOOT_400_ERROR.md** - Detailed troubleshooting
5. **R2_BUCKET_CHECK.md** - R2 configuration guide
6. **QUICK_FIX_GUIDE.md** - This file

Start with running `test_tile_access.js` in your browser console - it will tell you exactly what's wrong!
