# Multiple Vector Layer Upload - Feature Added

## What Changed

Added support for uploading **multiple GeoJSON files at once** in the Vector Layer Uploader.

## Features

### ✅ Multiple File Selection
- Drag & drop multiple `.geojson` or `.json` files
- Or click to select multiple files from file picker
- All files are validated before upload

### ✅ Individual File Preview
- Shows preview for each selected file:
  - File name
  - Geometry type (Polygon, LineString, etc.)
  - Feature count
  - Bounding box coordinates
- Remove individual files before upload

### ✅ Batch Upload with Progress
- Uploads all files sequentially
- Shows success/failure count
- Detailed error messages for failed uploads
- Continues uploading even if one file fails

### ✅ Smart Naming
- Each file uses its filename as the layer name
- Automatically sanitized for R2 compatibility
- Auto-generated descriptions based on geometry type

## UI Changes

### Before (Single Upload)
```
┌─────────────────────────────────────┐
│ [Drop zone]                         │
│                                     │
│ File: fairways.geojson              │
│ Layer Name: [Fairways            ]  │
│ Description: [Optional           ]  │
│ [Upload Layer]                      │
└─────────────────────────────────────┘
```

### After (Multiple Upload)
```
┌─────────────────────────────────────┐
│ [Drop zone - supports multiple]     │
│                                     │
│ 3 files selected                    │
│ ┌─────────────────────────────────┐ │
│ │ fairways.geojson          [X]   │ │
│ │ Polygon • 18 features           │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ greens.geojson            [X]   │ │
│ │ Polygon • 18 features           │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ bunkers.geojson           [X]   │ │
│ │ Polygon • 45 features           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Golf Course: [Test Course 20    ▼]  │
│ R2 Path: test20/Vector_Layers/      │
│          [layer_name].geojson       │
│                                     │
│ [Upload 3 Layers]                   │
└─────────────────────────────────────┘
```

## Upload Flow

### 1. Select Multiple Files
```typescript
// User drags 3 files: fairways.geojson, greens.geojson, bunkers.geojson
// Component validates each file
// Shows preview for all valid files
```

### 2. Choose Golf Course
```typescript
// User selects "Test Course 20"
// Shows R2 path preview: test20/Vector_Layers/[layer_name].geojson
```

### 3. Upload All Files
```typescript
// Uploads sequentially:
// 1. fairways.geojson → test20/Vector_Layers/fairways.geojson ✅
// 2. greens.geojson → test20/Vector_Layers/greens.geojson ✅
// 3. bunkers.geojson → test20/Vector_Layers/bunkers.geojson ✅

// Shows toast: "Successfully uploaded 3 layers"
```

### 4. Partial Success Handling
```typescript
// If some files fail:
// 1. fairways.geojson ✅
// 2. greens.geojson ❌ (invalid GeoJSON)
// 3. bunkers.geojson ✅

// Shows toast: "Successfully uploaded 2 layers, 1 failed"
// Lists errors: "greens: Invalid GeoJSON format"
```

## Code Changes

### Component State
```typescript
// OLD (Single file)
const [file, setFile] = useState<File | null>(null)
const [preview, setPreview] = useState<Preview | null>(null)

// NEW (Multiple files)
const [files, setFiles] = useState<File[]>([])
const [previews, setPreviews] = useState<Preview[]>([])
```

### Dropzone Config
```typescript
// OLD
maxFiles: 1

// NEW
multiple: true
```

### Upload Logic
```typescript
// OLD (Single upload)
const formData = new FormData()
formData.append('file', file)
await fetch(url, { body: formData })

// NEW (Batch upload)
for (const preview of previews) {
  const formData = new FormData()
  formData.append('file', preview.file)
  formData.append('name', preview.name)
  await fetch(url, { body: formData })
}
```

## Example Usage

### Upload Golf Course Boundaries
```
Files:
- fairways.geojson (18 polygons)
- greens.geojson (18 polygons)
- tee_boxes.geojson (54 polygons)
- bunkers.geojson (45 polygons)
- water_hazards.geojson (8 polygons)

Result in R2:
test20/Vector_Layers/
  ├── fairways.geojson
  ├── greens.geojson
  ├── tee_boxes.geojson
  ├── bunkers.geojson
  └── water_hazards.geojson

Database records:
5 rows in vector_layers table with course_name = "test20"
```

## Benefits

### ✅ Time Saving
- Upload all course layers at once
- No need to repeat course selection
- Batch processing

### ✅ Better UX
- See all files before uploading
- Remove unwanted files easily
- Clear progress feedback

### ✅ Error Handling
- Individual file validation
- Continues on partial failure
- Detailed error messages

### ✅ Consistent Naming
- Uses filename as layer name
- Auto-sanitized for R2
- No manual naming needed

## Testing Checklist

- [ ] Select single file → works as before
- [ ] Select multiple files → shows all previews
- [ ] Remove individual file → updates preview list
- [ ] Upload all files → creates all layers in R2
- [ ] One file fails → others still upload
- [ ] Invalid GeoJSON → shows error, skips file
- [ ] Large files → shows progress correctly
- [ ] Cancel during upload → stops gracefully

## Edge Cases Handled

### Invalid Files
```typescript
// If user drops non-GeoJSON file
// Shows error toast
// Skips that file
// Continues with valid files
```

### Duplicate Names
```typescript
// If two files have same name
// Both upload (R2 handles overwrites)
// Database creates separate records
// Consider adding name conflict detection
```

### Large Batch
```typescript
// If user selects 50 files
// All show in preview (scrollable)
// Upload sequentially (not parallel)
// Shows progress: "Uploaded 25/50"
```

## Future Enhancements

### Progress Bar
```typescript
// Show upload progress for each file
<Progress value={(successCount / previews.length) * 100} />
```

### Parallel Uploads
```typescript
// Upload multiple files simultaneously
await Promise.all(previews.map(p => uploadFile(p)))
```

### Name Editing
```typescript
// Allow editing layer names before upload
<Input value={preview.name} onChange={...} />
```

### Bulk Style Assignment
```typescript
// Apply same style to all layers
<ColorPicker onChange={applyToAll} />
```

## Summary

**Multiple upload feature is now live!** 🎉

Users can:
- ✅ Select multiple GeoJSON files at once
- ✅ Preview all files before upload
- ✅ Remove unwanted files
- ✅ Upload all layers in one batch
- ✅ See detailed success/failure feedback

The edge function already supports this - no backend changes needed!
