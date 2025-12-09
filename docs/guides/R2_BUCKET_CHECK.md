# R2 Bucket Configuration Check

## Current Setup
- **Bucket Name**: `map-stats-tiles-prod`
- **Path Structure**: `test20/2025-11-05/09-30/tiles/z/x/y.png`
- **R2 Public Domain**: `pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev`

## Issue
Getting 400 Bad Request when fetching tiles.

## Things to Verify

### 1. Check if R2 Public Domain is Correct
In your Cloudflare dashboard:
1. Go to R2 → Your bucket (`map-stats-tiles-prod`)
2. Click on "Settings"
3. Look for "Public Access" or "R2.dev subdomain"
4. Verify the domain matches: `pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev`

### 2. Verify Public Access is Enabled
Your bucket needs to allow public reads:
1. In R2 bucket settings
2. Check "Public Access" section
3. Should be enabled for GET requests

### 3. Test Direct R2 URL
Try accessing a tile directly in your browser:
```
https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test20/2025-11-05/09-30/tiles/15/16910/10916.png
```

**Expected Result**: 
- ✅ Image loads = R2 is configured correctly
- ❌ 403 Forbidden = Public access not enabled
- ❌ 404 Not Found = File doesn't exist at that path
- ❌ Invalid domain = R2 public domain is wrong

### 4. Check Actual File Path in R2
In Cloudflare R2 dashboard:
1. Browse your bucket
2. Navigate to: `test20/2025-11-05/09-30/tiles/`
3. Verify files exist like: `15/16910/10916.png`

### 5. Check Environment Variable
In Supabase Edge Functions settings, verify:
```
CLOUDFLARE_R2_PUBLIC_DOMAIN = pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev
```

## Common Issues

### Issue 1: R2 Public Access Not Enabled
**Solution**: Enable public access in R2 bucket settings

### Issue 2: Wrong R2 Domain
**Solution**: Update the environment variable with correct domain

### Issue 3: Files in Wrong Location
Your files might be at:
- ❌ `map-stats-tiles-prod/test20/...` (bucket name in path)
- ✅ `test20/...` (correct - just the path)

### Issue 4: CORS Not Configured
R2 bucket needs CORS headers for browser access:
1. Go to R2 bucket settings
2. Add CORS policy:
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

## Quick Debug

Run this in your browser console while on your app:
```javascript
fetch('https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test20/2025-11-05/09-30/tiles/15/16910/10916.png')
  .then(r => console.log('Status:', r.status, 'OK:', r.ok))
  .catch(e => console.error('Error:', e))
```

This will tell you if the R2 URL is accessible.
