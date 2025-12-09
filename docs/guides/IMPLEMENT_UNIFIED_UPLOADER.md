# 🚀 Implement Unified Uploader - Quick Guide

## What Was Created

✅ **`UnifiedTilesetUploader.tsx`** - New unified component that combines:
- Date/time inputs
- Metadata upload
- Tile upload
- R2 path preview
- All in one form!

---

## How to Implement

### **Step 1: Find Your Admin Dashboard**

Look for where you currently have the two separate sections:
```
Admin Dashboard
├── TilesetMetadataUploader (Section 1)
└── TilesetUploader (Section 2 - "Bulk Upload")
```

Common locations:
- `src/pages/AdminDashboard.tsx`
- `src/pages/Admin.tsx`
- `src/components/AdminPanel.tsx`

---

### **Step 2: Replace Old Components**

**Before:**
```tsx
import TilesetMetadataUploader from '@/components/TilesetMetadataUploader';
import TilesetUploader from '@/components/TilesetUploader';

// In your JSX:
<TilesetMetadataUploader golfClubs={golfClubs} />
<TilesetUploader />
```

**After:**
```tsx
import UnifiedTilesetUploader from '@/components/UnifiedTilesetUploader';

// In your JSX:
<UnifiedTilesetUploader />
```

---

### **Step 3: Remove Old Imports (Optional)**

You can keep the old components for now or remove them:

```tsx
// Can remove these if not used elsewhere:
// import TilesetMetadataUploader from '@/components/TilesetMetadataUploader';
// import TilesetUploader from '@/components/TilesetUploader';
```

---

## Example Implementation

### **Full Example: AdminDashboard.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UnifiedTilesetUploader from '@/components/UnifiedTilesetUploader';
import TileUploadComponent from '@/components/TileUploadComponent';
// ... other imports

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload Tileset</TabsTrigger>
          <TabsTrigger value="tiles">Upload Tiles Only</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          {/* NEW: Unified uploader with date/time */}
          <UnifiedTilesetUploader />
        </TabsContent>
        
        <TabsContent value="tiles">
          {/* Separate tile upload (if needed) */}
          <TileUploadComponent />
        </TabsContent>
        
        <TabsContent value="manage">
          {/* Other admin features */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## What You Get

### **Before Implementation**

```
Admin Dashboard
├── Upload Tileset Metadata
│   ├── Golf Course ✓
│   ├── Flight Date ✓
│   ├── Flight Time ✓
│   ├── Metadata JSON ✓
│   └── NO TILES ✗
│
└── Bulk Upload Tiles with Metadata
    ├── Golf Course ✓
    ├── Tiles ✓
    ├── Metadata JSON ✓
    └── NO DATE/TIME ✗
        Result: test20/tiles/ (old path)
```

### **After Implementation**

```
Admin Dashboard
└── Upload Tileset with Date/Time
    ├── Golf Course ✓
    ├── Flight Date ✓
    ├── Flight Time ✓
    ├── R2 Path Preview ✓
    ├── Metadata JSON ✓
    └── Tiles (ZIP or Folder) ✓
        Result: test20/2024-11-05/14-30/tiles/
```

---

## Testing

### **Step 1: Refresh Browser**
```
Ctrl+Shift+R (hard refresh)
```

### **Step 2: Go to Admin Dashboard**
```
http://localhost:5173/admin
```

### **Step 3: See New Unified Form**
```
✓ One form with all fields
✓ Date/time inputs visible
✓ R2 path preview shown
✓ Tile upload options (ZIP/Folder)
```

### **Step 4: Test Upload**
```
Golf Course: test20
Flight Date: 2024-11-05
Flight Time: 14:30
Metadata: [Upload or paste JSON]
Tiles: [Upload ZIP or select folder]
Click: Upload Tileset for 2024-11-05 14:30
```

### **Step 5: Verify**
```
✓ Tiles in R2: test20/2024-11-05/14-30/tiles/
✓ Metadata in DB with date/time
✓ Map shows: 📅 Nov 5, 2024  🕐 14:30
```

---

## Troubleshooting

### **Issue: Component Not Found**

**Error:**
```
Module not found: Can't resolve '@/components/UnifiedTilesetUploader'
```

**Solution:**
```
Check file exists:
src/components/UnifiedTilesetUploader.tsx

Check import path matches your project structure
```

---

### **Issue: Old Components Still Showing**

**Cause:** Browser cache

**Solution:**
```
1. Hard refresh: Ctrl+Shift+R
2. Clear cache
3. Restart dev server: npm run dev
```

---

### **Issue: Upload Button Disabled**

**Cause:** Missing required fields

**Check:**
```
✓ Golf course selected?
✓ Flight date entered?
✓ Flight time entered?
✓ Metadata valid (green checkmark)?
✓ Tiles selected (ZIP or folder)?
```

---

## Migration Path

### **Option 1: Immediate Replacement**

```tsx
// Replace both old components with new one
<UnifiedTilesetUploader />
```

**Pros:** Clean, simple, one component  
**Cons:** Users need to adapt to new UI

---

### **Option 2: Side-by-Side (Temporary)**

```tsx
<Tabs>
  <TabsTrigger value="new">New Uploader (Recommended)</TabsTrigger>
  <TabsTrigger value="old">Old Uploaders</TabsTrigger>
</Tabs>

<TabsContent value="new">
  <UnifiedTilesetUploader />
</TabsContent>

<TabsContent value="old">
  <TilesetMetadataUploader />
  <TilesetUploader />
</TabsContent>
```

**Pros:** Users can try new UI, fall back to old  
**Cons:** Maintains old code temporarily

---

### **Option 3: Feature Flag**

```tsx
const USE_UNIFIED_UPLOADER = true; // Toggle this

{USE_UNIFIED_UPLOADER ? (
  <UnifiedTilesetUploader />
) : (
  <>
    <TilesetMetadataUploader />
    <TilesetUploader />
  </>
)}
```

**Pros:** Easy rollback if issues  
**Cons:** Code duplication

---

## Recommended Approach

### **For Your test20 Course**

1. **Implement immediately** - Use Option 1 (Immediate Replacement)
2. **Test with test20** - Upload tiles for different dates
3. **Verify on map** - Check date/time layers work
4. **Remove old components** - Clean up code

---

## Quick Start Commands

```bash
# 1. Make sure dev server is running
npm run dev

# 2. Deploy edge function (if not done)
npx supabase functions deploy r2-sign

# 3. Open browser
# Go to: http://localhost:5173/admin

# 4. Use new unified uploader
# Fill form and upload!
```

---

## Summary

### **What to Do**

1. ✅ Find your admin dashboard file
2. ✅ Import `UnifiedTilesetUploader`
3. ✅ Replace old components
4. ✅ Refresh browser
5. ✅ Test upload with date/time
6. ✅ Verify tiles in correct R2 path

### **What You Get**

```
One unified form:
Golf Course + Date + Time + Metadata + Tiles
→ test20/2024-11-05/14-30/tiles/z/x/y.png

On map:
📅 Nov 5, 2024  🕐 14:30
```

**No more confusion about which date tiles belong to!** 🎉
