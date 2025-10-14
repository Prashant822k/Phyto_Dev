# Admin Account Setup Guide

This guide will help you create and manage admin accounts for your PhytoMaps application.

## Creating Admin Accounts in Supabase

### Method 1: Manual Creation via Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Navigate to your project dashboard
   - Go to **Authentication** → **Users**

2. **Create New User**
   - Click **"Add user"**
   - Enter admin email (e.g., `admin@phytomaps.com`)
   - Set a strong password
   - Click **"Create user"**

3. **Update User Role in Database**
   - Go to **SQL Editor** in Supabase
   - Run this query to make the user an admin:

```sql
-- Replace 'admin@phytomaps.com' with your admin email
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@phytomaps.com';
```

### Method 2: Direct Database Insert (Advanced)

If you want to create an admin account directly in the database:

```sql
-- First, create the auth user (this requires Supabase admin access)
-- You'll need to do this via the Supabase dashboard or API

-- Then update the users table
UPDATE public.users 
SET role = 'admin', 
    full_name = 'System Administrator',
    organization = 'PhytoMaps'
WHERE email = 'admin@phytomaps.com';
```

### Method 3: Using the Admin Dashboard (Once you have one admin)

Once you have at least one admin account, you can use the admin dashboard to:
- Create new admin accounts
- Manage user roles
- Assign users to golf clubs

## Admin Account Management Features

### What Admins Can Do:

1. **Upload and Manage Files**
   - Upload PNG tiles to R2 storage
   - Delete any files from the system
   - View all uploaded files across all clubs

2. **Manage Golf Clubs**
   - Create new golf clubs
   - View all existing clubs
   - Delete clubs (if needed)

3. **Manage Users**
   - View all users in the system
   - Assign users to golf clubs
   - Change user roles (admin/client)
   - View user activity and uploads

4. **System Administration**
   - Access to all data regardless of club membership
   - Override club-based restrictions
   - Manage system-wide settings

## Security Best Practices

### Admin Account Security:
1. **Use Strong Passwords**: Minimum 12 characters with mixed case, numbers, and symbols
2. **Limit Admin Accounts**: Only create admin accounts for trusted personnel
3. **Regular Audits**: Periodically review admin access and remove unused accounts
4. **Two-Factor Authentication**: Enable 2FA for admin accounts when available

### Database Security:
- Admin roles are enforced at the database level using Row Level Security (RLS)
- All admin operations are logged and can be audited
- Club-based data isolation is maintained even for admins

## Testing Your Admin Setup

1. **Login Test**
   - Go to `/login-admin`
   - Sign in with your admin credentials
   - Verify you're redirected to `/admin`

2. **Functionality Test**
   - Upload a test PNG file
   - Create a test golf club
   - Assign a test user to the club
   - Verify all admin features work correctly

3. **Security Test**
   - Try accessing `/admin` with a non-admin account
   - Verify you're redirected to the appropriate login page
   - Test club-based data isolation

## Troubleshooting

### Common Issues:

**"This account does not have admin privileges"**
- Check that the user's role is set to 'admin' in the database
- Verify the user exists in the `public.users` table

**"User not found"**
- Ensure the user was created in both `auth.users` and `public.users` tables
- Check that the trigger `on_auth_user_created` is working

**"Access denied"**
- Verify RLS policies are correctly configured
- Check that the `is_admin()` function is working

### Debug Queries:

```sql
-- Check user role
SELECT email, role, club_id FROM public.users WHERE email = 'your-admin@email.com';

-- Check if user exists in auth
SELECT email, created_at FROM auth.users WHERE email = 'your-admin@email.com';

-- Test admin function
SELECT public.is_admin();

-- View all admin users
SELECT email, full_name, role, created_at FROM public.users WHERE role = 'admin';
```

## Production Deployment

### For Production:
1. **Remove Demo Accounts**: Delete any test/demo admin accounts
2. **Secure Admin Emails**: Use professional email addresses
3. **Enable Monitoring**: Set up logging for admin actions
4. **Backup Strategy**: Ensure admin account data is backed up
5. **Access Review**: Regularly review who has admin access

### Environment Variables:
Make sure these are set in production:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- R2 credentials (if using R2 storage)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Verify database schema and RLS policies
4. Test with a fresh admin account creation

---

**Next Steps**: After setting up your first admin account, you can use the admin dashboard to manage all other users and system settings.
