# Multi-Course Assignment - Quick Reference Card

## 🚀 Quick Start (3 Steps)

```bash
# 1. Run SQL migration in Supabase SQL Editor
# Copy contents of: multi-course-client-assignment.sql

# 2. Deploy edge function
supabase functions deploy manage-client-courses

# 3. Restart frontend
npm run dev
```

---

## 📍 Key URLs

| Role | URL | Purpose |
|------|-----|---------|
| Admin | `/admin` → "Client Courses" tab | Assign courses to clients |
| Client (1 course) | `/login-client` → `/client` | Direct to dashboard |
| Client (2+ courses) | `/login-client` → `/select-course` → `/client` | Choose course first |

---

## 🔧 Common SQL Operations

### Assign Client to Multiple Courses
```sql
SELECT assign_client_to_course(
  'client-uuid-here',
  gc.id,
  auth.uid()
)
FROM golf_clubs gc
WHERE gc.name IN ('Course 1', 'Course 2', 'Course 3');
```

### Remove Course Assignment
```sql
SELECT remove_client_from_course(
  'client-uuid',
  'course-uuid'
);
```

### View Client's Courses
```sql
SELECT * FROM get_client_golf_courses('client-uuid');
```

### Check Access
```sql
SELECT client_has_course_access('client-uuid', 'course-uuid');
```

---

## 👨‍💼 Admin UI Quick Guide

1. **Login** → `/login-admin`
2. **Navigate** → "Client Courses" tab
3. **Select Client** → Choose from dropdown
4. **Check Courses** → Select one or more courses
5. **Save** → Click "Save Assignments"

---

## 🎨 Client Experience

### Single Course
```
Login → Dashboard (automatic)
```

### Multiple Courses
```
Login → Course Selection Page → Choose Course → Dashboard
         (beautiful cards)        (click card)    (with "Switch Course" button)
```

---

## 📊 Useful Queries

### Count Courses Per Client
```sql
SELECT u.email, COUNT(cgc.id) as courses
FROM users u
LEFT JOIN client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
WHERE u.role = 'client'
GROUP BY u.email
ORDER BY courses DESC;
```

### Find Unassigned Clients
```sql
SELECT u.email
FROM users u
LEFT JOIN client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
WHERE u.role = 'client' AND cgc.id IS NULL;
```

### All Active Assignments
```sql
SELECT u.email, gc.name, cgc.assigned_at
FROM client_golf_courses cgc
JOIN users u ON cgc.client_id = u.id
JOIN golf_clubs gc ON cgc.golf_club_id = gc.id
WHERE cgc.is_active = true
ORDER BY u.email;
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No courses showing | Check RLS policies enabled |
| Edge function error | Redeploy: `supabase functions deploy manage-client-courses` |
| Selection page not loading | Verify route in `App.tsx` |
| Switch button missing | Check `hasMultipleCourses` state |

---

## 📁 File Locations

```
Database:
  └─ multi-course-client-assignment.sql

Backend:
  └─ supabase/functions/manage-client-courses/index.ts
  └─ src/lib/clientCourseService.ts

Frontend:
  └─ src/components/ClientCourseManager.tsx (Admin UI)
  └─ src/pages/CourseSelection.tsx (Client selection page)
  └─ src/pages/LoginClient.tsx (Updated login flow)
  └─ src/pages/DashboardClient.tsx (Switch button)
  └─ src/pages/DashboardAdmin.tsx (New tab)

Types:
  └─ src/lib/supabase.ts (Updated DB types)

Routes:
  └─ src/App.tsx (Added /select-course)
```

---

## ✅ Verification Commands

```sql
-- Check table exists
SELECT * FROM client_golf_courses LIMIT 1;

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%client%course%';

-- Check policies
SELECT policyname FROM pg_policies 
WHERE tablename = 'client_golf_courses';

-- Test assignment
SELECT assign_client_to_course(
  (SELECT id FROM users WHERE role = 'client' LIMIT 1),
  (SELECT id FROM golf_clubs LIMIT 1),
  auth.uid()
);
```

---

## 🎯 Key Features

✅ **One-to-Many**: One client → Multiple courses  
✅ **Smart Routing**: Auto-redirect based on course count  
✅ **Beautiful UI**: Gradient cards with hover effects  
✅ **Admin Control**: Easy course assignment interface  
✅ **Secure**: Full RLS + role validation  
✅ **Backward Compatible**: Existing single-course setups work  

---

## 📞 Need Help?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Review `multi-course-client-assignment.sql` for database schema
3. Check browser console for frontend errors
4. Review Supabase logs for backend errors

---

**Quick Reference v1.0** | Multi-Course Client Assignment System
