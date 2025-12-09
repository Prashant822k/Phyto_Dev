# Admin Dashboard Troubleshooting Guide

## 🔧 Common Issues and Solutions

### **Issue 1: "Manage Users" Tab Not Loading**

**Symptoms:**
- Users list is empty
- Loading spinner never stops
- Error messages in console

**Solutions:**

#### **Check 1: Database Connection**
```sql
-- Run this in Supabase SQL Editor to verify users table exists
SELECT COUNT(*) as user_count FROM public.users;
```

#### **Check 2: RLS Policies**
```sql
-- Check if RLS is enabled and policies exist
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

#### **Check 3: Admin Role Verification**
```sql
-- Verify your admin role
SELECT email, role FROM public.users WHERE email = 'your-admin@email.com';

-- Test admin function
SELECT public.is_admin() as is_admin;
```

### **Issue 2: Cannot Create Admin Accounts**

**Symptoms:**
- "Error creating admin account" message
- Permission denied errors

**Root Cause:** The app uses anon key, not service role key, so `supabase.auth.admin.createUser()` won't work.

**Solutions:**

#### **Method 1: Manual Creation (Recommended)**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Run this SQL:
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'new-admin@email.com';
```

#### **Method 2: Use Regular Signup**
1. Go to your app's signup page
2. Create account normally
3. Run this SQL to promote to admin:
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'user@email.com';
```

### **Issue 3: Cannot Delete Users**

**Symptoms:**
- Delete button doesn't work
- "Permission denied" errors

**Solution:** The app can only delete from `public.users`, not `auth.users`. 

**Workaround:**
1. Delete user profile via admin dashboard (removes from public.users)
2. Manually delete auth user in Supabase Dashboard if needed

### **Issue 4: Club Assignment Not Working**

**Symptoms:**
- Users not showing in club dropdown
- Assignment fails

**Solutions:**

#### **Check 1: Verify Clubs Exist**
```sql
SELECT * FROM public.golf_clubs;
```

#### **Check 2: Check User Data**
```sql
SELECT u.email, u.club_id, gc.name as club_name 
FROM public.users u 
LEFT JOIN public.golf_clubs gc ON u.club_id = gc.id;
```

### **Issue 5: RLS Blocking Admin Access**

**Symptoms:**
- Admin can't see users
- "Permission denied" errors

**Solutions:**

#### **Check 1: Verify Admin Role**
```sql
-- Check your current user's role
SELECT email, role FROM public.users WHERE id = auth.uid();
```

#### **Check 2: Test Admin Function**
```sql
SELECT public.is_admin() as is_admin;
```

#### **Check 3: Verify RLS Policies**
```sql
-- Check if admin policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'users' 
AND policyname LIKE '%admin%';
```

## 🛠️ Debugging Steps

### **Step 1: Check Browser Console**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed requests

### **Step 2: Check Supabase Logs**
1. Go to Supabase Dashboard
2. Navigate to Logs → API
3. Look for error messages
4. Check for RLS policy violations

### **Step 3: Test Database Access**
```sql
-- Test basic access
SELECT COUNT(*) FROM public.users;

-- Test admin access
SELECT * FROM public.users WHERE role = 'admin';

-- Test club access
SELECT * FROM public.golf_clubs;
```

### **Step 4: Verify Environment Variables**
Check that these are set in your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🔍 Quick Fixes

### **Fix 1: Reset Admin Role**
```sql
-- If you lost admin access
UPDATE public.users SET role = 'admin' WHERE email = 'your-email@domain.com';
```

### **Fix 2: Create Missing Tables**
```sql
-- If tables are missing, run the schema
-- Copy and paste the entire supabase-schema.sql file
```

### **Fix 3: Fix RLS Policies**
```sql
-- Disable RLS temporarily for testing
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### **Fix 4: Clear Browser Cache**
1. Clear browser cache and cookies
2. Hard refresh (Ctrl+F5)
3. Try incognito/private mode

## 📞 Getting Help

### **Debug Information to Collect:**
1. **Browser Console Errors** (F12 → Console)
2. **Supabase Logs** (Dashboard → Logs)
3. **Database Query Results** (SQL Editor)
4. **Environment Variables** (check .env file)
5. **User Role Status** (run admin verification queries)

### **Common Error Messages:**

**"Permission denied"**
- Check RLS policies
- Verify admin role
- Check database permissions

**"Table doesn't exist"**
- Run the schema setup
- Check table names

**"Function doesn't exist"**
- Check if helper functions are created
- Run the schema setup

**"Auth user not found"**
- Create user in Supabase Dashboard first
- Check email spelling

## 🎯 Quick Test Checklist

- [ ] Can you access `/admin` dashboard?
- [ ] Do you see all 5 tabs?
- [ ] Can you see users in "Manage Users" tab?
- [ ] Can you see clubs in "Manage Clubs" tab?
- [ ] Can you upload files in "Upload Files" tab?
- [ ] Can you see files in "Manage Files" tab?
- [ ] Can you access "Admin Settings" tab?

If any of these fail, use the specific troubleshooting steps above.

## 🚀 Emergency Recovery

If everything is broken:

1. **Check Supabase Status**: Go to status.supabase.com
2. **Verify Environment**: Check .env variables
3. **Reset Admin Role**: Use SQL to set admin role
4. **Check Database**: Verify tables and policies exist
5. **Clear Cache**: Clear browser cache and cookies
6. **Restart App**: Stop and restart your development server

---

**Most issues are related to RLS policies or missing admin roles. Start with the admin role verification and work your way through the checklist above.**
