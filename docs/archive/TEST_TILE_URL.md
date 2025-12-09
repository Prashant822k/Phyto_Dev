# Test test21 Tile URL Directly

## 🔍 Your Tile URL

Based on the console logs, here's a sample tile URL for test21:

```
https://efnorpyrsfoxooufujnd.supabase.co/functions/v1/tile-proxy?tilesetId=89713b44-b261-48c8-bd72-2542a1339239&z=15&x=16774&y=10893&token=YOUR_TOKEN
```

## 🧪 Test Steps

### Step 1: Get Your Current Token

Open browser console and run:
```javascript
const session = await supabase.auth.getSession()
console.log('Token:', session.data.session.access_token)
```

### Step 2: Test a Tile URL

Replace `YOUR_TOKEN` with your actual token and open this URL in a new browser tab:

```
https://efnorpyrsfoxooufujnd.supabase.co/functions/v1/tile-proxy?tilesetId=89713b44-b261-48c8-bd72-2542a1339239&z=15&x=16774&y=10893&token=YOUR_TOKEN
```

### Step 3: Check the Response

**If working (test20 behavior):**
- Browser shows a PNG image
- File size: 50-200 KB
- You can see the green orthomosaic

**If NOT working (test21 current behavior):**
- Browser shows a tiny transparent PNG
- File size: ~100 bytes
- Just a blank/transparent square

## 🔍 Check Network Tab

1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by "tile-proxy"
4. Look at the tile requests
5. Check the **Size** column:
   - ✅ **50-200 KB** = Real tiles loading
   - ❌ **~100 bytes** = Transparent PNG fallback

## 📊 Compare test20 vs test21

### In Network Tab:

**test20 tiles (working):**
```
tile-proxy?tilesetId=a0bb4617-...&z=15&x=16774&y=10893
Status: 200
Size: 156 KB
Type: png
```

**test21 tiles (not working):**
```
tile-proxy?tilesetId=89713b44-...&z=15&x=16774&y=10893
Status: 200
Size: 100 B  ← TINY! This is the transparent fallback
Type: png
```

## 🐛 If Tiles Are Tiny (100 bytes)

This means the tile-proxy edge function is returning the fallback transparent PNG because:

1. **Tile doesn't exist in R2** at the expected path
2. **R2 path is wrong** in the database
3. **Authentication issue** accessing R2

## 🔧 Next Steps

### Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions** → **tile-proxy** → **Logs**
3. Look for test21 tile requests
4. You should see something like:

**If tiles don't exist:**
```
tile-proxy - Fetching tile: test21/2025-11-24/17-30/tiles/15/16774/10893.png
tile-proxy - Tile fetch failed: 404 Not Found
```

**If tiles exist:**
```
tile-proxy - Fetching tile: test21/2025-11-24/17-30/tiles/15/16774/10893.png
[200 OK - returns tile data]
```

### Verify R2 Path

Go to Cloudflare R2 Dashboard and check if tiles exist at:
```
test21/2025-11-24/17-30/tiles/15/16774/10893.png
```

Or check if they're at a different path:
```
test21/tiles/15/16774/10893.png  ← Legacy format
test21/2024-11-24/17-30/tiles/15/16774/10893.png  ← Wrong date
```

## 🛠️ Quick Fix

If tiles are at `test21/tiles/` instead of `test21/2025-11-24/17-30/tiles/`:

```sql
UPDATE golf_course_tilesets 
SET r2_folder_path = 'test21/tiles'
WHERE id = '89713b44-b261-48c8-bd72-2542a1339239';
```

Then refresh the browser and check again.

## 📝 Report Back

Please check:
1. ✅ Network tab - tile size (50KB+ or 100 bytes?)
2. ✅ Edge function logs - 404 errors?
3. ✅ R2 dashboard - where are tiles actually located?

This will tell us exactly what's wrong! 🎯
