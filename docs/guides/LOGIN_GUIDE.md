# Login Guide - PhytoMaps

## 🔐 Two Separate Login Pages

### Admin Login
**URL**: `/login-admin`  
**For**: Administrators only  
**Credentials**: `admin@phytomaps.com`

**What happens:**
1. Enter admin email and password
2. System checks if user has `role = 'admin'`
3. If admin → Redirect to `/admin` dashboard
4. If NOT admin → Error: "This account does not have admin privileges. Please use the client login page."

### Client Login
**URL**: `/login-client`  
**For**: Golf club clients only  
**Credentials**: Any client email (e.g., `123@gmail.com`, `demo@phytomaps.com`)

**What happens:**
1. Enter client email and password
2. System checks if user has `role = 'client'`
3. If NOT client → Error: "This account is not a golf club client. Please use the admin login page if you are an administrator."
4. If client with 0 courses → Error: "You have not been assigned to any golf courses."
5. If client with 1 course → Direct to `/client` dashboard
6. If client with 2+ courses → Redirect to `/select-course` page

---

## 📊 Your Current Users (from SQL output)

### Admin Account
| Email | Role | Status |
|-------|------|--------|
| `admin@phytomaps.com` | admin | ✅ Full Access |

**Login at**: `/login-admin`

### Client Accounts with Courses
| Email | Courses | Status |
|-------|---------|--------|
| `123@gmail.com` | 1 | ✅ Has Courses |
| `1234@gmail.com` | 1 | ✅ Has Courses |
| `125@gmail.com` | 1 | ✅ Has Courses |
| `charanangadi7@gmail.com` | 1 | ✅ Has Courses |
| `chiran9590@gmail.com` | 1 | ✅ Has Courses |
| `chirandeep12@gmail.com` | 1 | ✅ Has Courses |
| `demo@phytomaps.com` | 1 | ✅ Has Courses |
| `kpokimon794@gmail.com` | 1 | ✅ Has Courses |
| `phytomaps123@gmail.com` | 1 | ✅ Has Courses |
| `test@test.com` | 1 | ✅ Has Courses |
| `testp567890@gmail.com` | 1 | ✅ Has Courses |

**Login at**: `/login-client`

### Client Accounts WITHOUT Courses
| Email | Courses | Status |
|-------|---------|--------|
| `keerthanraj339@gmail.com` | 0 | ⚠️ No Courses |
| `pv2006@gmail.com` | 0 | ⚠️ No Courses |

**These users need course assignments from admin!**

---

## 🚨 Common Login Errors & Solutions

### Error: "This account does not have admin privileges"
**Cause**: You're trying to log in at `/login-admin` with a client account  
**Solution**: Use `/login-client` instead

### Error: "This account is not a golf club client"
**Cause**: You're trying to log in at `/login-client` with an admin account  
**Solution**: Use `/login-admin` instead

### Error: "You have not been assigned to any golf courses"
**Cause**: Client account has no course assignments  
**Solution**: 
1. Login as admin at `/login-admin`
2. Go to "Client Courses" tab
3. Select the client and assign them to courses

### Error: "Could not load user profile"
**Cause**: User exists in `auth.users` but not in `public.users` table  
**Solution**: Run this SQL:
```sql
INSERT INTO public.users (id, email, role)
SELECT au.id, au.email, 'client' as role
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;
```

### Error: "Invalid login credentials"
**Cause**: Wrong email or password  
**Solution**: Check your credentials or reset password

---

## ✅ Testing Login Flow

### Test Admin Login
```
1. Go to: http://localhost:5173/login-admin
2. Email: admin@phytomaps.com
3. Password: [your admin password]
4. Should redirect to: /admin
```

### Test Client Login (Single Course)
```
1. Go to: http://localhost:5173/login-client
2. Email: demo@phytomaps.com
3. Password: [client password]
4. Should redirect to: /client (directly)
```

### Test Client Login (Multiple Courses)
```
1. First, assign a client to multiple courses via admin UI
2. Go to: http://localhost:5173/login-client
3. Email: [multi-course client]
4. Password: [client password]
5. Should redirect to: /select-course
6. Select a course
7. Should redirect to: /client
```

---

## 🔧 Quick Fixes

### Assign Courses to Clients Without Access

**Option 1: Via Admin UI**
1. Login as admin
2. Go to "Client Courses" tab
3. Select client: `keerthanraj339@gmail.com`
4. Check desired courses
5. Click "Save Assignments"

**Option 2: Via SQL**
```sql
-- Assign a client to a course
SELECT assign_client_to_course(
  (SELECT id FROM users WHERE email = 'keerthanraj339@gmail.com'),
  (SELECT id FROM golf_clubs WHERE name = 'Your Course Name'),
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);
```

### Check User's Current Access
```sql
SELECT 
  u.email,
  u.role,
  COUNT(cgc.id) as course_count
FROM users u
LEFT JOIN client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
WHERE u.email = 'user@example.com'
GROUP BY u.id, u.email, u.role;
```

---

## 📱 Login URLs Reference

| User Type | URL | Example Email |
|-----------|-----|---------------|
| Admin | `http://localhost:5173/login-admin` | `admin@phytomaps.com` |
| Client | `http://localhost:5173/login-client` | `demo@phytomaps.com` |
| Home | `http://localhost:5173/` | Choose login type |

---

## 🎯 Summary

✅ **Admin accounts** → Use `/login-admin`  
✅ **Client accounts** → Use `/login-client`  
✅ **All existing accounts are working** (based on SQL output)  
✅ **Clients need course assignments** to access data  
✅ **Better error messages** now guide users to correct login page  

**Your admin account (`admin@phytomaps.com`) is ready to use at `/login-admin`!**
