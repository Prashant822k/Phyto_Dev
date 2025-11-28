# Multi-Course Client Assignment - Complete Implementation Guide

## 🎯 Overview

This implementation enables **one-to-many client-to-course relationships**, allowing a single client to be assigned to multiple golf courses while maintaining strict data isolation and security.

### Key Features
- ✅ One client can access multiple golf courses
- ✅ Each course still belongs to only one primary client (backward compatible)
- ✅ Beautiful course selection page for multi-course clients
- ✅ Automatic routing based on course count
- ✅ Admin UI for managing assignments
- ✅ Full RLS (Row Level Security) support
- ✅ Edge function for backend operations

---

## 📦 Files Created

### Database & Backend
1. **`multi-course-client-assignment.sql`** - Complete database migration
2. **`supabase/functions/manage-client-courses/index.ts`** - Edge function for course management
3. **`src/lib/clientCourseService.ts`** - TypeScript service layer

### Frontend Components
4. **`src/components/ClientCourseManager.tsx`** - Admin UI for course assignments
5. **`src/pages/CourseSelection.tsx`** - Beautiful course selection page for clients

### Updated Files
6. **`src/lib/supabase.ts`** - Updated database types
7. **`src/pages/LoginClient.tsx`** - Smart login flow
8. **`src/pages/DashboardClient.tsx`** - Added "Switch Course" button
9. **`src/pages/DashboardAdmin.tsx`** - Added "Client Courses" tab
10. **`src/App.tsx`** - Added `/select-course` route

---

## 🚀 Deployment Steps

### Step 1: Database Migration

Run the SQL migration in your Supabase SQL Editor:

```bash
# Option 1: Copy and paste the contents of multi-course-client-assignment.sql
# into Supabase SQL Editor and execute

# Option 2: Use Supabase CLI
supabase db push
```

**What this does:**
- Creates `client_golf_courses` junction table
- Adds `client_id` column to `golf_clubs` table
- Creates helper functions for course management
- Updates RLS policies for multi-course access
- Migrates existing single-course assignments

### Step 2: Deploy Edge Function

```bash
# Navigate to your project directory
cd c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev

# Deploy the edge function
supabase functions deploy manage-client-courses
```

### Step 3: Restart Frontend

```bash
# Install any new dependencies (if needed)
npm install

# Restart the development server
npm run dev
```

---

## 🎨 User Flows

### Flow 1: Client with Single Course
1. Client logs in at `/login-client`
2. System detects 1 assigned course
3. **Automatically redirects** to `/client` dashboard
4. Shows course data immediately

### Flow 2: Client with Multiple Courses
1. Client logs in at `/login-client`
2. System detects 2+ assigned courses
3. **Redirects to** `/select-course` (beautiful selection page)
4. Client selects a course
5. Redirects to `/client` dashboard with selected course
6. "Switch Course" button appears in header

### Flow 3: Client with No Courses
1. Client logs in at `/login-client`
2. System detects 0 assigned courses
3. Shows error message
4. Automatically logs out
5. Prompts to contact administrator

---

## 👨‍💼 Admin Usage

### Accessing Course Assignment UI

1. Log in as admin at `/login-admin`
2. Navigate to **"Client Courses"** tab
3. Use the interface to:
   - Select a client from dropdown
   - Check/uncheck golf courses
   - Save assignments
   - View all current assignments
   - Remove assignments

### Admin Features

**Assign Multiple Courses:**
```
1. Select client: john@example.com
2. Check boxes: ☑ Pine Valley ☑ Augusta National ☑ St Andrews
3. Click "Save Assignments"
```

**View Assignments:**
- Table shows all active client-course pairs
- Displays client name, email, course name, and assignment date
- Quick remove button for each assignment

**Client Summary:**
- Shows course count per client
- Badge indicates number of assigned courses

---

## 🔧 Technical Details

### Database Schema

**New Table: `client_golf_courses`**
```sql
- id (UUID, PK)
- client_id (UUID, FK → users.id)
- golf_club_id (UUID, FK → golf_clubs.id)
- assigned_at (TIMESTAMP)
- assigned_by (UUID, FK → users.id)
- is_active (BOOLEAN)
- UNIQUE(client_id, golf_club_id)
```

**Updated Table: `golf_clubs`**
```sql
- client_id (UUID, nullable) -- For backward compatibility
```

### Key Functions

**`get_client_golf_courses(user_id UUID)`**
- Returns all active courses for a client
- Used by course selection page

**`assign_client_to_course(client_id, golf_club_id, assigned_by)`**
- Assigns a client to a course
- Admin only
- Idempotent (safe to call multiple times)

**`remove_client_from_course(client_id, golf_club_id)`**
- Removes course assignment
- Sets `is_active = false`

**`client_has_course_access(user_id, course_id)`**
- Checks if client can access a specific course
- Used for authorization

### RLS Policies

**Golf Clubs:**
- Admins: Full access
- Clients: Can only see assigned courses

**Tilesets:**
- Admins: Full access
- Clients: Can only see tilesets for assigned courses

**Images:**
- Admins: Full access
- Clients: Can see images from users in their assigned courses

---

## 🧪 Testing

### Test Scenario 1: Assign Multiple Courses

```sql
-- Get a client user ID
SELECT id, email FROM users WHERE role = 'client' LIMIT 1;

-- Assign to multiple courses
SELECT assign_client_to_course(
  'CLIENT_USER_ID_HERE',
  gc.id,
  auth.uid()
)
FROM golf_clubs gc
WHERE gc.name IN ('Pine Valley Golf Club', 'Augusta National Golf Club');

-- Verify assignments
SELECT * FROM get_client_golf_courses('CLIENT_USER_ID_HERE');
```

### Test Scenario 2: Client Login Flow

1. Create test client: `testclient@example.com`
2. Assign to 3 courses via admin UI
3. Log out and log back in as client
4. Should see course selection page
5. Select a course
6. Should land on dashboard with "Switch Course" button

### Test Scenario 3: Remove Assignment

```sql
-- Remove a course assignment
SELECT remove_client_from_course(
  'CLIENT_USER_ID',
  'GOLF_CLUB_ID'
);

-- Verify removal
SELECT * FROM client_golf_courses 
WHERE client_id = 'CLIENT_USER_ID' 
  AND is_active = true;
```

---

## 📊 Monitoring & Queries

### Count Assignments Per Client
```sql
SELECT 
  u.email,
  COUNT(cgc.id) as course_count
FROM users u
LEFT JOIN client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
WHERE u.role = 'client'
GROUP BY u.id, u.email
ORDER BY course_count DESC;
```

### Find Unassigned Clients
```sql
SELECT u.email, u.full_name
FROM users u
LEFT JOIN client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
WHERE u.role = 'client' AND cgc.id IS NULL;
```

### View All Active Assignments
```sql
SELECT 
  u.email as client,
  gc.name as course,
  cgc.assigned_at
FROM client_golf_courses cgc
JOIN users u ON cgc.client_id = u.id
JOIN golf_clubs gc ON cgc.golf_club_id = gc.id
WHERE cgc.is_active = true
ORDER BY u.email, cgc.assigned_at DESC;
```

---

## 🔒 Security Features

1. **RLS Policies**: All tables have Row Level Security enabled
2. **Role Validation**: Only clients can be assigned to courses
3. **Admin-Only Operations**: Course assignments require admin role
4. **Session Storage**: Selected course stored in session (not localStorage)
5. **Audit Trail**: `assigned_by` tracks who made assignments

---

## 🎨 UI/UX Highlights

### Course Selection Page
- **Gradient background** (green → blue → emerald)
- **Card-based design** with hover effects
- **Responsive grid** (1/2/3 columns based on screen size)
- **Visual hierarchy** with icons and badges
- **Assignment date** displayed for each course
- **Info section** explaining features

### Admin Interface
- **Tabbed layout** for organization
- **Checkbox selection** for multiple courses
- **Live course count** display
- **Table view** of all assignments
- **Quick remove** buttons
- **Client summary** cards

### Client Dashboard
- **"Switch Course" button** (only if multiple courses)
- **Course name** in header
- **Seamless experience** for single-course clients

---

## 🐛 Troubleshooting

### Issue: Client sees no courses after assignment
**Solution:** Check RLS policies are enabled:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'client_golf_courses';
```

### Issue: Edge function not working
**Solution:** Redeploy the function:
```bash
supabase functions deploy manage-client-courses --no-verify-jwt
```

### Issue: Course selection page not showing
**Solution:** Verify route is added in `App.tsx`:
```tsx
<Route path="/select-course" element={<RequireRole role="client"><CourseSelection /></RequireRole>} />
```

### Issue: Switch Course button not appearing
**Solution:** Check `hasMultipleCourses` state is being set correctly in `DashboardClient.tsx`

---

## 📈 Future Enhancements

Potential improvements for future versions:

1. **Course Groups**: Group related courses together
2. **Default Course**: Set a default course per client
3. **Access Levels**: Different permission levels per course
4. **Time-Based Access**: Temporary course access
5. **Bulk Operations**: Assign multiple clients at once
6. **Course Templates**: Pre-defined course sets
7. **Email Notifications**: Notify clients of new assignments
8. **Activity Log**: Track course switches and access patterns

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] SQL migration executed successfully
- [ ] Edge function deployed
- [ ] `client_golf_courses` table exists
- [ ] RLS policies are active
- [ ] Helper functions created
- [ ] Admin can assign courses via UI
- [ ] Client with 1 course goes directly to dashboard
- [ ] Client with 2+ courses sees selection page
- [ ] Client with 0 courses sees error
- [ ] "Switch Course" button works
- [ ] Course data loads correctly after selection
- [ ] Session storage persists selected course

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs for edge function errors
3. Check browser console for frontend errors
4. Verify database migrations completed successfully

---

**Implementation Complete! 🎉**

The system now supports full multi-course client assignments with a beautiful, intuitive user experience.
