# Vector Layer Deployment Guide

## Overview
This guide will help you deploy the vector layer management system for your golf course application.

## Prerequisites
- Supabase CLI installed and logged in
- SQL migration already run in Supabase dashboard
- R2 bucket `map-stats-tiles-prod` already exists

## Step-by-Step Deployment

### Step 1: Deploy Edge Functions

#### Option A: Using the Batch Script (Recommended)
Simply double-click the `deploy-vector-functions.bat` file in your project root.

#### Option B: Manual Deployment
Open your terminal and run:

```bash
# Navigate to project root
cd "c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev"

# Deploy upload function
supabase functions deploy upload-vector-layer --no-verify-jwt

# Deploy fetch function
supabase functions deploy get-vector-layers --no-verify-jwt
```

### Step 2: Verify Deployment

1. **Check Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/functions
   - You should see both functions listed:
     - `upload-vector-layer`
     - `get-vector-layers`

2. **Test the Functions**
   - Both functions should show as "Active"
   - Note the function URLs (you'll need these for testing)

### Step 3: Configure R2 Storage

1. **Verify R2 Bucket**
   - Bucket name: `map-stats-tiles-prod`
   - Should already exist from your tile upload setup

2. **Check Folder Structure**
   After uploading a layer, you should see:
   ```
   map-stats-tiles-prod/
   ├── vector-layers/
   │   ├── {golf_club_id}/
   │   │   ├── {layer_id}/
   │   │   │   └── data.json
   ```

### Step 4: Test the Upload Flow

1. **Login as Admin**
   - Go to your admin dashboard
   - Navigate to Vector Layers page

2. **Upload a Test Layer**
   - Click "Add Layer"
   - Drag and drop a GeoJSON file
   - Fill in the name and description
   - Click "Upload Layer"

3. **Verify Upload**
   - Check R2 bucket for the file
   - Check `vector_layers` table in Supabase for the record
   - Verify the layer appears in the layer list

### Step 5: Test the Fetch Flow

1. **View Layers**
   - Go to the map view
   - Layers should load automatically
   - Toggle layers on/off
   - Reorder layers (admin only)

2. **Check Network Tab**
   - Open browser DevTools
   - Go to Network tab
   - Look for calls to `get-vector-layers`
   - Verify successful responses

## Troubleshooting

### Function Deployment Issues

**Error: "Not logged in"**
```bash
supabase login
```

**Error: "Project not linked"**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Upload Issues

**Error: "Not authenticated"**
- Ensure you're logged in as an admin user
- Check the Authorization header is being sent

**Error: "Not authorized"**
- Verify your user has `role = 'admin'` in the `users` table

**Error: "Failed to upload file to storage"**
- Check R2 bucket exists
- Verify Supabase has access to R2
- Check bucket permissions

### Fetch Issues

**Error: "Missing golf_course_id parameter"**
- Ensure the golf course ID is being passed correctly
- Check the URL parameters

**Error: "No layers found"**
- Verify layers exist in the database
- Check `is_active = true` for the layers
- Verify `golf_club_id` matches

## Environment Variables

Ensure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema

The `vector_layers` table should have these columns:
- `id` (UUID, primary key)
- `golf_club_id` (UUID, foreign key to golf_clubs)
- `name` (TEXT)
- `description` (TEXT)
- `layer_type` (TEXT)
- `r2_key` (TEXT) - Path to file in R2
- `file_size` (BIGINT)
- `style` (JSONB)
- `is_active` (BOOLEAN)
- `z_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Next Steps

1. **Add Layer Styling**
   - Implement custom styling options
   - Add color pickers for fill/stroke

2. **Add Layer Preview**
   - Show layer preview before upload
   - Display bounds on map

3. **Add Batch Operations**
   - Upload multiple layers at once
   - Bulk delete/activate layers

4. **Add Layer Groups**
   - Organize layers into categories
   - Toggle entire groups on/off

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase function logs
3. Verify database records
4. Check R2 bucket contents

## File Structure

```
Phyto_Dev/
├── supabase/
│   ├── functions/
│   │   ├── upload-vector-layer/
│   │   │   └── index.ts
│   │   └── get-vector-layers/
│   │       └── index.ts
│   └── migrations/
│       └── 20241111190000_add_vector_layers.sql
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── VectorLayerUploader.tsx
│   │   └── VectorLayerManager.tsx
│   ├── lib/
│   │   └── vectorLayerService.ts
│   └── hooks/
│       └── useVectorLayers.ts
└── deploy-vector-functions.bat
```
