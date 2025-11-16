# 🚀 REDEPLOY REQUIRED - Authentication Fix

## ⚠️ Important: You Must Redeploy the Edge Function

The edge function code has been updated to fix the authentication error, but **you need to redeploy it** for the changes to take effect.

## 🔧 What Was Fixed

### Problem
The edge function wasn't properly handling the user's authentication token, causing "Not authenticated" errors.

### Solution
Updated `supabase/functions/upload-vector-layer/index.ts` to:
1. Check for Authorization header first
2. Create two clients:
   - `supabaseClient` - Uses user's token to verify authentication
   - `supabaseAdmin` - Uses service role for storage/database operations
3. Properly verify user is authenticated and has admin role
4. Use admin client for R2 uploads and database inserts (bypasses RLS)

## 📋 Deploy Now

Run this command:

```bash
cd "c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev"
supabase functions deploy upload-vector-layer --no-verify-jwt
```

Or use the batch script:
```bash
deploy-vector-functions.bat
```

## ✅ After Deployment

1. **Refresh your browser** (to clear any cached errors)
2. **Try uploading again**
3. Should work now!

## 🔍 Verify Deployment

Check in Supabase Dashboard:
1. Go to Functions section
2. Find `upload-vector-layer`
3. Check "Last deployed" timestamp
4. Should show recent deployment time

## 🧪 Test Upload

1. Login as admin
2. Go to Upload Files tab
3. Select a golf course
4. Upload a GeoJSON file
5. Should see "Success" message

## ⚠️ Still Getting Errors?

### Check These:

1. **Are you logged in?**
   ```javascript
   // In browser console
   const { data } = await supabase.auth.getSession()
   console.log(data.session) // Should not be null
   ```

2. **Do you have admin role?**
   ```sql
   -- In Supabase SQL Editor
   SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
   ```

3. **Is the function deployed?**
   - Check Supabase Dashboard → Functions
   - Look for recent deployment timestamp

4. **Check function logs:**
   - Supabase Dashboard → Functions → upload-vector-layer → Logs
   - Look for error messages

## 📝 Summary of Changes

### File: `supabase/functions/upload-vector-layer/index.ts`

**Before:**
- Used single client with service role
- Didn't properly verify user token
- Auth check was failing

**After:**
- Uses two clients (user + admin)
- Properly verifies user authentication
- Uses admin client for storage operations
- Better error logging

## 🎯 Next Steps

1. **Deploy the function** (required!)
2. **Test the upload**
3. **Verify file in R2**
4. **Check database record**

---

**IMPORTANT: The fix won't work until you redeploy the function!**

Run: `supabase functions deploy upload-vector-layer --no-verify-jwt`
