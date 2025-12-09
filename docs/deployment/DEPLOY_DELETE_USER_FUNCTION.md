# Deploy Delete User Edge Function

## What This Function Does

The `delete-user` edge function completely removes a user and all their related data:

1. **Course Assignments** - Removes from `client_golf_courses` table
2. **Images** - Removes from `images` table  
3. **User Profile** - Removes from `users` table
4. **Auth User** - Removes from Supabase Auth (requires service role)

## Security

- Only **admins** can delete users (verified via JWT)
- Users **cannot delete themselves**
- Requires valid authentication token

## Deploy the Function

### Option 1: Supabase CLI (Recommended)

```bash
# Navigate to project root
cd c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev

# Login to Supabase (if not already)
npx supabase login

# Link to your project (if not already)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
npx supabase functions deploy delete-user
```

### Option 2: Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click **New Function**
4. Name it `delete-user`
5. Copy the code from `supabase/functions/delete-user/index.ts`
6. Click **Deploy**

## Verify Deployment

After deployment, test the function:

1. Log in as an admin
2. Go to **Manage Users** tab
3. Click the trash icon next to a user
4. Confirm deletion
5. Check that:
   - User disappears from the list
   - Toast shows success message
   - User cannot log in anymore

## Troubleshooting

### "Only admins can delete users" Error
- Make sure you're logged in as an admin
- Check that your user has `role: 'admin'` in the `users` table

### "Failed to delete auth user" Warning
- The user profile was deleted but auth deletion failed
- This can happen if the auth user was already deleted
- Check Supabase Dashboard > Authentication > Users

### CORS Errors
- Make sure the function is deployed with the correct CORS headers
- The function includes `Access-Control-Allow-Origin: *`

### Network Errors
- Check that `VITE_SUPABASE_URL` is set correctly in `.env`
- Verify the function is deployed and running

## Data Deleted

When a user is deleted, the following is removed:

| Table | Data Removed |
|-------|--------------|
| `client_golf_courses` | All course assignments for this user |
| `images` | All images uploaded by this user |
| `users` | User profile (name, email, role, etc.) |
| `auth.users` | Authentication record (login credentials) |

## Rollback

**Warning:** User deletion is **permanent** and cannot be undone.

If you need to restore a user:
1. Create a new account with the same email
2. Manually reassign golf courses
3. Re-upload any images

---

**Created:** December 9, 2025
**Function Location:** `supabase/functions/delete-user/index.ts`
