# Deploy r2-sign Edge Function

## Step 1: Deploy to Supabase

### Option A: Using Supabase CLI (Recommended)

```bash
# Login to Supabase
npx supabase login

# Link your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the r2-sign function
npx supabase functions deploy r2-sign
```

### Option B: Manual Deployment via Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on `r2-sign` function (or create new if doesn't exist)
3. Copy the entire contents of `supabase/functions/r2-sign/index.ts`
4. Paste into the editor
5. Click **Deploy**

---

## Step 2: Verify Deployment

Test the function is working:

```bash
# Get your function URL
https://YOUR_PROJECT_REF.supabase.co/functions/v1/r2-sign

# Test with curl (replace with your auth token)
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/r2-sign \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getBatchPutUrls",
    "courseId": "test-course",
    "flightDate": "2024-11-03",
    "flightTime": "14:30",
    "tiles": [{"z": 15, "x": 5242, "y": 12663}]
  }'
```

Expected response:
```json
{
  "urls": [
    {
      "z": 15,
      "x": 5242,
      "y": 12663,
      "url": "https://...",
      "key": "test-course/2024-11-03/14-30/tiles/15/5242/12663.png"
    }
  ],
  "basePath": "test-course/2024-11-03/14-30/tiles"
}
```

---

## Step 3: Environment Variables

Make sure these are set in Supabase:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Verify these exist:
   - `CLOUDFLARE_R2_ACCOUNT_ID`
   - `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
   - `CLOUDFLARE_R2_BUCKET_NAME`
   - `CLOUDFLARE_R2_PUBLIC_DOMAIN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## Deployment Complete! ✅

Once deployed, your frontend tile upload will work with date/time structure.
