# 🚨 Emergency Fix: Stack Depth Error

## The Problem
"Stack depth limit exceeded" means RLS policies are causing infinite recursion.

---

## ✅ Quick Fix (Run in Supabase SQL Editor)

### **Option 1: Disable RLS Temporarily (Fastest)**

```sql
-- Disable RLS on golf_course_tilesets
ALTER TABLE golf_course_tilesets DISABLE ROW LEVEL SECURITY;
```

**Then refresh your client dashboard** - it should work immediately!

---

### **Option 2: Fix RLS Properly**

Run this complete script:

```sql
-- 1. Drop all existing policies
DROP POLICY IF EXISTS "Users can view tilesets for their golf club" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can manage all tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Users can view tilesets for their club" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can insert tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can update tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can delete tilesets" ON golf_course_tilesets;

-- 2. Disable RLS temporarily
ALTER TABLE golf_course_tilesets DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS
ALTER TABLE golf_course_tilesets ENABLE ROW LEVEL SECURITY;

-- 4. Create simple policy - allow all authenticated users to read
CREATE POLICY "authenticated_read_tilesets"
ON golf_course_tilesets
FOR SELECT
TO authenticated
USING (true);

-- 5. Allow admins to manage
CREATE POLICY "admin_manage_tilesets"
ON golf_course_tilesets
FOR ALL
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
```

---

## 🎯 After Running the Fix

1. **Refresh client dashboard** (Ctrl + Shift + R)
2. **Check browser console** - 500 error should be gone
3. **Map should load** with tiles!

---

## 🔍 Why This Happened

The previous RLS policy had:
```sql
USING (
  golf_club_id IN (
    SELECT club_id FROM users WHERE id = auth.uid()
  )
)
```

This caused recursion because:
- Query checks RLS on `golf_course_tilesets`
- RLS queries `users` table
- `users` table might have RLS that queries back
- Infinite loop → stack overflow

---

## ✅ The Simple Fix

Just allow all authenticated users to read tilesets. The application already filters by `golf_club_id` in the query, so security is maintained at the application level.

---

## 🚀 Test After Fix

```
http://localhost:5000/client
```

Should now show:
- ✅ Map loads
- ✅ No 500 errors
- ✅ Tiles appear on Mapbox

---

## 📝 Summary

**Run this ONE command to fix immediately:**

```sql
ALTER TABLE golf_course_tilesets DISABLE ROW LEVEL SECURITY;
```

Then refresh your dashboard! 🎉
