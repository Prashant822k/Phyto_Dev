# Troubleshooting 400 Bad Request Error

## Current Understanding
- **Bucket**: `map-stats-tiles-prod` (Cloudflare R2)
- **Path in bucket**: `test20/2025-11-05/09-30/tiles/z/x/y.png`
- **Database r2_folder_path**: `test20/2025-11-05/09-30/tiles` ✅ CORRECT

## Request Flow
1. Mapbox requests: `/tile-proxy?tilesetId=a0bb4617...&z=15&x=16910&y=10916&token=...`
2. `tile-proxy` queries database for tileset
3. Constructs key: `test20/2025-11-05/09-30/tiles/15/16910/10916.png`
4. Calls `r2-sign` with `getTile` action
5. `r2-sign` validates access and fetches from R2
6. Returns tile image

## Where the 400 Error Can Occur

### Location 1: tile-proxy - Missing Parameters (Line 25-33)
**Check**: Are all parameters present?
- tilesetId ✅
- z, x, y ✅  
- token ✅

**How to verify**: Check browser console for:
```
Missing parameters: { tilesetId: ..., z: ..., x: ..., y: ..., hasToken: true }
```

### Location 2: r2-sign - Missing Authorization (Line 125)
**Check**: Is the JWT token valid?

**How to verify**: Check Supabase logs for:
```
Missing Authorization
```

### Location 3: r2-sign - Unauthorized User (Line 128)
**Check**: Is the user authenticated?

**How to verify**: Check logs for:
```
Unauthorized
```

### Location 4: r2-sign - Tileset Not Found (Line 345-355)
**Check**: Does the database query find the tileset?

**How to verify**: 
1. Run `DEBUG_QUERY.sql` 
2. Check if query returns a row
3. Check logs for:
```
getTile - Tileset not found for r2_folder_path: test20/2025-11-05/09-30/tiles
```

### Location 5: r2-sign - Access Denied (Line 358-363)
**Check**: Does user's club match tileset's club?

**How to verify**: Check logs for:
```
getTile - Access denied. User club: xxx, Tileset club: yyy
```

## Step-by-Step Debugging

### Step 1: Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → Logs
3. Look for `tile-proxy` and `r2-sign` logs
4. Find the error messages with timestamps matching your request

### Step 2: Run Database Query
Execute `DEBUG_QUERY.sql` in Supabase SQL Editor to verify:
- Tileset exists
- r2_folder_path is exactly `test20/2025-11-05/09-30/tiles`
- No hidden spaces or characters

### Step 3: Check User's Club Access
```sql
-- Get your user's club_id
SELECT id, email, club_id, role 
FROM users 
WHERE email = '125@gmail.com';

-- Check if it matches tileset's club
SELECT 
  t.id,
  t.name,
  t.golf_club_id as tileset_club,
  u.club_id as user_club,
  u.role,
  t.golf_club_id = u.club_id as has_access
FROM golf_course_tilesets t
CROSS JOIN users u
WHERE t.id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d'
  AND u.email = '125@gmail.com';
```

### Step 4: Test R2 Direct Access
Open in browser:
```
https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test20/2025-11-05/09-30/tiles/15/16910/10916.png
```

**Expected Results**:
- ✅ Image loads → R2 is fine, issue is in edge function
- ❌ 403 Forbidden → Enable public access on R2 bucket
- ❌ 404 Not Found → File doesn't exist at that path
- ❌ Connection error → R2 domain is wrong

### Step 5: Check Browser Console
With DevTools open (F12):
1. Go to Console tab
2. Look for logs starting with:
   - `tile-proxy -`
   - `getTile -`
3. Find the error message

### Step 6: Check Network Tab
1. Open Network tab
2. Filter by "tile-proxy"
3. Click on a failed request (red, status 400)
4. Check:
   - **Headers** tab → Request URL
   - **Response** tab → Error message
   - **Preview** tab → Parsed JSON error

## Most Likely Causes

### Cause 1: User Club Mismatch
Your user's `club_id` doesn't match the tileset's `golf_club_id`.

**Solution**: 
```sql
-- Option A: Make user admin
UPDATE users SET role = 'admin' WHERE email = '125@gmail.com';

-- Option B: Update user's club to match tileset
UPDATE users 
SET club_id = (
  SELECT golf_club_id 
  FROM golf_course_tilesets 
  WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d'
)
WHERE email = '125@gmail.com';
```

### Cause 2: R2 Public Access Not Enabled
The R2 bucket doesn't allow public reads.

**Solution**: See `R2_BUCKET_CHECK.md`

### Cause 3: Wrong R2 Domain
The environment variable has the wrong R2 public domain.

**Solution**: Update in Supabase Edge Functions settings

## Next Steps

1. ✅ Deploy the updated edge functions (with better logging)
2. ✅ Run `DEBUG_QUERY.sql` to verify database
3. ✅ Check Supabase Edge Function logs
4. ✅ Test R2 direct URL
5. ✅ Check user's club access

After these checks, you'll know exactly where the 400 error is coming from.
