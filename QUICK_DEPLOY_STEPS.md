# Quick Deployment Steps

## 🚀 Deploy in 3 Steps

### Step 1: Run SQL Migration (Already Done ✓)
You've already run the SQL in Supabase dashboard.

### Step 2: Deploy Edge Functions
Double-click: `deploy-vector-functions.bat`

OR run in terminal:
```bash
cd "c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev"
supabase functions deploy upload-vector-layer --no-verify-jwt
supabase functions deploy get-vector-layers --no-verify-jwt
```

### Step 3: Test Upload
1. Login as admin
2. Go to Vector Layers page
3. Upload a GeoJSON file
4. Verify it appears in the list

## ✅ Verification Checklist

- [ ] SQL migration run successfully
- [ ] `upload-vector-layer` function deployed
- [ ] `get-vector-layers` function deployed
- [ ] Test upload works
- [ ] Layer appears in R2: `map-stats-tiles-prod/vector-layers/`
- [ ] Layer appears in database: `vector_layers` table
- [ ] Layer appears in UI layer list

## 🔧 Common Issues

### "Not logged in to Supabase"
```bash
supabase login
```

### "Project not linked"
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### "Upload fails"
- Check you're logged in as admin
- Verify `role = 'admin'` in users table
- Check R2 bucket exists

## 📁 R2 Bucket Structure
```
map-stats-tiles-prod/
├── test12/tiles/14/6843/4252.png  (existing tiles)
└── vector-layers/                  (new folder)
    └── {golf_club_id}/
        └── {layer_id}/
            └── data.json
```

## 🎯 What Changed

### Frontend Files Updated:
- ✓ `src/lib/vectorLayerService.ts` - API calls to edge functions
- ✓ `src/components/admin/VectorLayerUploader.tsx` - Upload UI
- ✓ `src/components/VectorLayerManager.tsx` - Fixed import

### Backend Files Created:
- ✓ `supabase/functions/upload-vector-layer/index.ts`
- ✓ `supabase/functions/get-vector-layers/index.ts`

### Database:
- ✓ `vector_layers` table created with R2 references

## 📝 Notes

**TypeScript Lint Errors in Edge Functions:**
The lint errors you see in the edge function files are expected. These are Deno files, not TypeScript files. They will work correctly when deployed to Supabase. The errors appear because your IDE is trying to validate them as TypeScript, but they run in Deno runtime which has different module resolution.

**You can safely ignore these errors:**
- "Cannot find module 'https://deno.land/std@0.203.0/http/server.ts'"
- "Parameter 'req' implicitly has an 'any' type"
- "'error' is of type 'unknown'"

These will NOT affect deployment or runtime execution.
