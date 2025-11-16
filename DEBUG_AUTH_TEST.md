# Debug Authentication Test

## 🔍 Step-by-Step Debugging

### Step 1: Check Browser Console

After trying to upload, open your browser console (F12) and look for these logs:

```
Session check: { hasSession: true/false, hasError: true/false, userId: '...', expiresAt: '...' }
Uploading with token: eyJhbGc...
Uploading to: https://efnorpyrsfoxooufujnd.supabase.co/functions/v1/upload-vector-layer
Response status: 401
Error response: {"error":"Not authenticated"}
```

### Step 2: Test Your Session in Browser Console

Open browser console and run:

```javascript
// Test 1: Check if you have a session
const { data, error } = await supabase.auth.getSession()
console.log('Session:', data.session)
console.log('User:', data.session?.user)
console.log('Token:', data.session?.access_token)

// Test 2: Check if you're logged in
const { data: user } = await supabase.auth.getUser()
console.log('Current user:', user)

// Test 3: Check your role
const { data: userData } = await supabase
  .from('users')
  .select('role, email')
  .eq('id', data.session.user.id)
  .single()
console.log('User role:', userData)
```

### Step 3: Common Issues & Solutions

#### Issue 1: No Session Found
**Symptom:** `hasSession: false` in console

**Solution:**
1. Log out completely
2. Clear browser cache and cookies
3. Log back in
4. Try upload again

#### Issue 2: Session Expired
**Symptom:** `expiresAt` is in the past

**Solution:**
1. Refresh the page
2. Supabase should auto-refresh the token
3. If not, log out and log back in

#### Issue 3: Not Admin Role
**Symptom:** Response says "Not authorized" instead of "Not authenticated"

**Solution:**
Run this SQL in Supabase:
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

#### Issue 4: Edge Function Not Deployed
**Symptom:** Old error messages

**Solution:**
```bash
supabase functions deploy upload-vector-layer --no-verify-jwt
```

Then check deployment in Supabase Dashboard → Functions

### Step 4: Test Edge Function Directly

Run this in browser console to test the edge function:

```javascript
const { data: { session } } = await supabase.auth.getSession()

const testUpload = async () => {
  const response = await fetch(
    'https://efnorpyrsfoxooufujnd.supabase.co/functions/v1/upload-vector-layer',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: true
      })
    }
  )
  
  console.log('Status:', response.status)
  const text = await response.text()
  console.log('Response:', text)
}

testUpload()
```

### Step 5: Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Functions → upload-vector-layer
3. Click on "Logs" tab
4. Look for recent errors
5. Check what the function is receiving

### Step 6: Verify Environment Variables

Check your `.env` file has:

```env
VITE_SUPABASE_URL=https://efnorpyrsfoxooufujnd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 7: Check Network Tab

1. Open DevTools → Network tab
2. Try upload
3. Find the `upload-vector-layer` request
4. Check:
   - Request Headers → Authorization header is present
   - Response → What error message you're getting

## 🎯 Most Likely Issues

### 1. Session Not Persisting
If `hasSession: false`, you need to:
- Log out
- Clear browser storage
- Log back in

### 2. Token Format Wrong
The Authorization header should be:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Edge Function Using Old Code
If you redeployed but still getting old errors:
- Wait 1-2 minutes for deployment to propagate
- Hard refresh browser (Ctrl+Shift+R)
- Check function logs for recent activity

### 4. CORS Issue
If you see CORS errors:
- The edge function has CORS headers
- But check if they're being sent correctly

## 📋 Checklist

- [ ] Logged in as admin
- [ ] Session exists in browser console
- [ ] Token is not expired
- [ ] Role is 'admin' in database
- [ ] Edge function is deployed
- [ ] Environment variables are correct
- [ ] Browser cache cleared
- [ ] Hard refresh done

## 🆘 If Still Not Working

Share these details:

1. **Console logs** from the upload attempt
2. **Network tab** screenshot showing the request/response
3. **Edge function logs** from Supabase dashboard
4. **Your user role** from database

This will help identify the exact issue!
