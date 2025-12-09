# Complete Admin Setup Guide for PhytoMaps

This comprehensive guide will help you set up and manage admin accounts for your PhytoMaps application.

## 🚀 Quick Start

### Step 1: Create Your First Admin Account

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"**
4. Enter admin email: `admin@phytomaps.com`
5. Set a strong password (min 8 characters)
6. Click **"Create user"**

**Option B: Using SQL Script**
1. Go to **SQL Editor** in Supabase
2. Run the `create-admin-account.sql` script
3. Replace `admin@phytomaps.com` with your desired admin email

### Step 2: Access Admin Dashboard
1. Go to `/login-admin` in your application
2. Sign in with your admin credentials
3. You'll be redirected to `/admin` dashboard

### Step 3: Set Up Your System
1. **Create Golf Clubs**: Go to "Manage Clubs" tab
2. **Create More Admins**: Go to "Admin Settings" tab
3. **Upload Data**: Go to "Upload Files" tab
4. **Manage Users**: Go to "Manage Users" tab

## 📋 Admin Dashboard Features

### 🎯 Upload Files Tab
- **Upload PNG Tiles**: Upload agricultural data tiles
- **Geographic Metadata**: Add lat/lon, zoom level, tile coordinates
- **Multiple File Support**: Upload single or multiple files
- **Progress Tracking**: Real-time upload progress
- **File Validation**: Automatic PNG validation and size limits

### 📁 Manage Files Tab
- **View All Files**: See all uploaded files across all clubs
- **Delete Files**: Remove files from R2 storage
- **File Organization**: Files organized by club and user
- **Storage Management**: Monitor storage usage

### 🏌️ Manage Clubs Tab
- **Create Clubs**: Add new golf clubs to the system
- **View All Clubs**: See all existing golf clubs
- **Club Management**: Organize users by club membership

### 👥 Manage Users Tab
- **User Overview**: View all users with roles and club assignments
- **Role Management**: Change user roles (admin/client)
- **Club Assignment**: Assign users to specific golf clubs
- **User Deletion**: Remove users from the system
- **User Details**: View user information and join dates

### ⚙️ Admin Settings Tab
- **Create Admin Accounts**: Add new administrator accounts
- **System Statistics**: View user counts and system metrics
- **Security Guidelines**: Best practices for admin management
- **Quick Setup Guide**: Step-by-step system setup instructions

## 🔐 Admin Account Management

### Creating Admin Accounts

**Method 1: Via Admin Dashboard**
1. Go to "Admin Settings" tab
2. Click "Create New Admin"
3. Fill in email, name, and password
4. Click "Create Admin Account"

**Method 2: Via Supabase Dashboard**
1. Create user in Authentication → Users
2. Run SQL: `UPDATE public.users SET role = 'admin' WHERE email = 'user@email.com'`

**Method 3: Via SQL Script**
```sql
-- Update existing user to admin
UPDATE public.users 
SET role = 'admin', full_name = 'Admin Name'
WHERE email = 'admin@phytomaps.com';
```

### Admin Privileges

**Full System Access:**
- ✅ Upload and manage all files
- ✅ Create and manage golf clubs
- ✅ Assign users to clubs
- ✅ Change user roles
- ✅ Delete users and data
- ✅ View all system data
- ✅ Override club-based restrictions

**Security Features:**
- 🔒 Role-based access control (RLS)
- 🔒 Club-based data isolation
- 🔒 Admin action logging
- 🔒 Secure file storage (R2)
- 🔒 Signed URL access

## 🏗️ System Architecture

### Database Structure
```
users (id, email, role, club_id, ...)
├── role: 'admin' | 'client'
├── club_id: foreign key to golf_clubs
└── RLS policies for access control

golf_clubs (id, name, ...)
├── Clubs for organizing users
└── Admin can manage all clubs

images (id, user_id, filename, ...)
├── Agricultural data files
├── Club-based visibility
└── Admin can see all images
```

### File Storage
```
R2 Storage Structure:
├── club/{club-id}/user/{user-id}/files
├── Admin can access all files
└── Signed URLs for secure access
```

### Access Control
- **Admin**: Full system access, can see all data
- **Client**: Limited to their club's data only
- **RLS Policies**: Enforce access at database level
- **Edge Functions**: Additional security layer

## 🛠️ Troubleshooting

### Common Issues

**"This account does not have admin privileges"**
```sql
-- Check user role
SELECT email, role FROM public.users WHERE email = 'your-email@domain.com';

-- Fix: Update role to admin
UPDATE public.users SET role = 'admin' WHERE email = 'your-email@domain.com';
```

**"User not found"**
```sql
-- Check if user exists in both tables
SELECT 'auth.users' as table_name, email FROM auth.users WHERE email = 'user@email.com'
UNION ALL
SELECT 'public.users' as table_name, email FROM public.users WHERE email = 'user@email.com';
```

**"Access denied"**
- Verify RLS policies are enabled
- Check that `is_admin()` function works
- Ensure user has proper role in database

### Debug Queries

```sql
-- Test admin function
SELECT public.is_admin() as is_admin;

-- View all admin users
SELECT email, full_name, role, created_at 
FROM public.users 
WHERE role = 'admin' 
ORDER BY created_at DESC;

-- Check user permissions
SELECT 
    u.email,
    u.role,
    gc.name as club_name,
    COUNT(i.id) as image_count
FROM public.users u
LEFT JOIN public.golf_clubs gc ON u.club_id = gc.id
LEFT JOIN public.images i ON u.id = i.user_id
GROUP BY u.id, u.email, u.role, gc.name
ORDER BY u.role DESC, u.email;
```

## 🔒 Security Best Practices

### Admin Account Security
1. **Strong Passwords**: Minimum 12 characters, mixed case, numbers, symbols
2. **Limited Access**: Only create admin accounts for trusted personnel
3. **Regular Audits**: Review admin access monthly
4. **Account Cleanup**: Remove unused admin accounts
5. **Two-Factor Auth**: Enable when available

### System Security
1. **Database Security**: RLS policies enforce access control
2. **File Security**: Private R2 bucket with signed URLs
3. **API Security**: Edge functions validate permissions
4. **Audit Logging**: All admin actions are logged
5. **Data Isolation**: Club-based data separation

### Production Deployment
1. **Environment Variables**: Secure configuration
2. **SSL/TLS**: Encrypted connections
3. **Backup Strategy**: Regular data backups
4. **Monitoring**: System health monitoring
5. **Access Review**: Quarterly access audits

## 📊 System Monitoring

### Key Metrics to Monitor
- **User Count**: Total users, admins vs clients
- **Club Count**: Number of golf clubs
- **File Storage**: Total files and storage usage
- **Activity**: Upload frequency and system usage
- **Errors**: Failed operations and system issues

### Admin Dashboard Statistics
The admin dashboard shows:
- Number of admin users
- Number of client users  
- Number of golf clubs
- Quick setup instructions
- Security best practices

## 🚀 Production Checklist

### Before Going Live
- [ ] Create primary admin account
- [ ] Set up golf clubs
- [ ] Configure R2 storage
- [ ] Test all admin functions
- [ ] Verify security policies
- [ ] Set up monitoring
- [ ] Create backup procedures
- [ ] Document admin procedures

### Post-Deployment
- [ ] Monitor system performance
- [ ] Review user access regularly
- [ ] Update security policies as needed
- [ ] Maintain admin documentation
- [ ] Train admin users
- [ ] Plan for scaling

## 📞 Support

### Getting Help
1. **Check Documentation**: Review this guide and other docs
2. **Supabase Logs**: Check dashboard logs for errors
3. **Database Queries**: Use debug queries above
4. **Test Environment**: Test changes in development first

### Emergency Procedures
1. **Admin Lockout**: Use Supabase dashboard to reset roles
2. **Data Recovery**: Restore from backups
3. **Security Breach**: Review logs and update passwords
4. **System Down**: Check Supabase status and logs

---

## 🎉 You're All Set!

Your PhytoMaps admin system is now ready for production use. The admin dashboard provides comprehensive tools for managing users, clubs, and agricultural data with enterprise-level security and access control.

**Next Steps:**
1. Create your first admin account
2. Set up golf clubs for your users
3. Upload agricultural data
4. Train your team on admin procedures
5. Monitor system usage and performance

For additional support or questions, refer to the troubleshooting section or check the Supabase documentation.
