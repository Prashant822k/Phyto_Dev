# Deploy Updated Edge Functions

## What Changed
I've added detailed logging to both edge functions to help debug the 400 error:

### 1. tile-proxy/index.ts
- Better error messages with JSON responses
- Logs showing the constructed key and r2_folder_path
- Detailed error logging when r2-sign fails

### 2. r2-sign/index.ts  
- JSON error responses instead of plain text
- Detailed logging for tileset lookup
- Shows exactly why a request fails (not found, access denied, etc.)

## Deploy Commands

### Option 1: Deploy Both Functions
```bash
cd "c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev"

# Deploy tile-proxy
supabase functions deploy tile-proxy

# Deploy r2-sign
supabase functions deploy r2-sign
```

### Option 2: Deploy via Supabase Dashboard
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Click on `tile-proxy` → Deploy
4. Click on `r2-sign` → Deploy

## After Deployment

### 1. Clear Browser Cache
Press `Ctrl + Shift + R` to hard refresh

### 2. Open Browser DevTools
Press `F12` and go to Console tab

### 3. Load Your Map
Navigate to the page with the map

### 4. Check Console Logs
You should now see detailed logs like:

```
tile-proxy - Fetching tile: test20/2025-11-05/09-30/tiles/15/16910/10916.png
tile-proxy - r2_folder_path: test20/2025-11-05/09-30/tiles
tile-proxy - tile_url_pattern: {z}/{x}/{y}.png
tile-proxy - z/x/y: 15 16910 10916

getTile - key: test20/2025-11-05/09-30/tiles/15/16910/10916.png
getTile - r2FolderPath: test20/2025-11-05/09-30/tiles
getTile - tileset: { golf_club_id: '...' }
getTile - Fetching from R2, key: test20/2025-11-05/09-30/tiles/15/16910/10916.png
getTile - Using public R2 URL: https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/...
getTile - R2 response status: 200 ok: true
getTile - Successfully fetched tile, size: 12345 bytes
```

### 5. If Still Getting 400 Error
Check the error response in Network tab:
1. Open Network tab
2. Filter by "tile-proxy"
3. Click on failed request
4. Check Response tab for JSON error like:

```json
{
  "error": "Tileset not found",
  "r2_folder_path": "test20/2025-11-05/09-30/tiles",
  "key": "test20/2025-11-05/09-30/tiles/15/16910/10916.png"
}
```

OR

```json
{
  "error": "Access denied"
}
```

OR

```json
{
  "error": "Tile not found in R2",
  "status": 404,
  "key": "...",
  "url": "https://..."
}
```

## Common Issues After Deployment

### Issue 1: "Tileset not found"
**Cause**: Database query can't find the tileset by r2_folder_path

**Solution**: Run this query:
```sql
SELECT id, r2_folder_path 
FROM golf_course_tilesets 
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';
```

Verify r2_folder_path is exactly: `test20/2025-11-05/09-30/tiles`

### Issue 2: "Access denied"
**Cause**: User's club_id doesn't match tileset's golf_club_id

**Solution**: Run this query:
```sql
-- Check user and tileset clubs
SELECT 
  u.email,
  u.club_id as user_club,
  u.role,
  t.golf_club_id as tileset_club,
  t.name as tileset_name
FROM users u
CROSS JOIN golf_course_tilesets t
WHERE u.email = '125@gmail.com'
  AND t.id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';
```

If clubs don't match, either:
- Make user admin: `UPDATE users SET role = 'admin' WHERE email = '125@gmail.com';`
- Or update user's club to match

### Issue 3: "Tile not found in R2"
**Cause**: File doesn't exist in R2 at that path

**Solution**: 
1. Check R2 bucket in Cloudflare dashboard
2. Verify file exists at: `test20/2025-11-05/09-30/tiles/15/16910/10916.png`
3. Test direct URL in browser

### Issue 4: CORS Error
**Cause**: R2 bucket doesn't have CORS configured

**Solution**: Add CORS policy in R2 bucket settings (see R2_BUCKET_CHECK.md)

## Verification Checklist

After deployment, verify:
- [ ] Functions deployed successfully
- [ ] Browser cache cleared
- [ ] Console shows detailed logs
- [ ] Can see exact error message in Network tab
- [ ] Database query returns tileset
- [ ] User has access (admin or matching club)
- [ ] R2 direct URL works
- [ ] Tiles load on map ✅
