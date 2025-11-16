# Authentication Error Fix

## ❌ Error You Were Getting

```
Failed to load resource: the server responded with a status of 401
Error: Not authenticated
```

## 🔍 Root Cause

The `VectorLayerUploader` component was sending the **anon key** instead of the **user's session token** to the edge function.

```typescript
// ❌ WRONG - Using anon key
headers: {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
}
```

The edge function needs the actual logged-in user's token to:
1. Verify the user is authenticated
2. Check if the user has admin role
3. Allow the upload

## ✅ Fix Applied

Updated `src/components/admin/VectorLayerUploader.tsx` to:

1. Import supabase client
2. Get the current user's session
3. Use the session's access token for authentication

```typescript
// ✅ CORRECT - Using user's session token
const { data: { session }, error: sessionError } = await supabase.auth.getSession()

if (sessionError || !session) {
  throw new Error('You must be logged in to upload layers')
}

const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-vector-layer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`  // ✅ User's token
  },
  body: formData
})
```

## 🧪 How to Test

1. **Make sure you're logged in as admin**
   - Check your user has `role = 'admin'` in the `users` table

2. **Try uploading again**
   - Select a golf course
   - Upload a GeoJSON file
   - Should work now!

## 🔒 Security Flow

```
User Login
    ↓
Session Created (with access_token)
    ↓
Upload Request (with session.access_token)
    ↓
Edge Function receives token
    ↓
Edge Function calls supabase.auth.getUser()
    ↓
Verifies user is authenticated
    ↓
Checks user.role === 'admin'
    ↓
Allows upload to R2
```

## 📝 What Changed

**File:** `src/components/admin/VectorLayerUploader.tsx`

**Changes:**
1. Added `import { supabase } from '@/lib/supabase'`
2. Added session check before upload
3. Changed Authorization header to use `session.access_token`

## ⚠️ Important Notes

### You Must Be Logged In
- The upload will fail if you're not logged in
- You'll see: "You must be logged in to upload layers"

### You Must Be Admin
- The upload will fail if your role is not 'admin'
- You'll see: "Not authorized" (from edge function)

### Check Your User Role
Run this in Supabase SQL Editor:
```sql
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

If role is not 'admin', update it:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## ✅ The Fix Is Complete

The authentication error should now be resolved. Try uploading a vector layer again!
