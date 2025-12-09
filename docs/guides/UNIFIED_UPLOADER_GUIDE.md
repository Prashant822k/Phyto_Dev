# 🎯 Unified Tileset Uploader - Complete Guide

## Problem Solved

### **Before (Disconnected Sections)**

```
Section 1: TilesetMetadataUploader
├── Has date/time inputs ✓
├── Uploads metadata ✓
└── NO tile upload ✗

Section 2: TilesetUploader (Bulk Upload)
├── Uploads tiles ✓
├── Uploads metadata ✓
└── NO date/time inputs ✗
    Result: test20/tiles/z/x/y.png (old structure)
```

**Problem:** When you upload metadata for `2024-11-05 14:30`, then upload tiles, there's no way to specify which date/time the tiles are for!

### **After (Unified Component)**

```
UnifiedTilesetUploader
├── Golf course selection ✓
├── Date/time inputs ✓
├── Metadata input ✓
├── Tile upload (ZIP or folder) ✓
└── Everything in one place ✓
    Result: test20/2024-11-05/14-30/tiles/z/x/y.png
```

**Solution:** One unified form where you specify date/time, metadata, and tiles together!

---

## 🎨 UI Layout

### **Complete Form**

```
┌─────────────────────────────────────────────────────────┐
│ Upload Tileset with Date/Time                          │
│                                                         │
│ Upload tiles and metadata for a specific date/time     │
│ to enable multi-temporal layer comparison              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Golf Course *                                           │
│ [Select a golf course ▼]                               │
│                                                         │
│ Flight Date *          Flight Time *                    │
│ [2024-11-05       ]   [14:30                        ]  │
│                                                         │
│ Extract Time from Sample Tile (Optional)               │
│ [Choose PNG file]                                       │
│                                                         │
│ ℹ️ R2 Path: test20/2024-11-05/14-30/tiles/z/x/y.png   │
│                                                         │
│ Metadata JSON *                                         │
│ [Choose JSON file]                                      │
│ [Textarea with JSON]                                    │
│ ✓ Metadata valid                                        │
│                                                         │
│ ┌─ ZIP File ─┬─ Folder ─┐                             │
│ │ [Choose ZIP file]      │                             │
│ │ tiles.zip selected     │                             │
│ └────────────────────────┘                             │
│                                                         │
│ [Upload Tileset for 2024-11-05 14:30]                 │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Step-by-Step Usage

### **For Your test20 Course**

#### **Step 1: Select Golf Course**
```
Golf Course: [test20 ▼]
```

#### **Step 2: Enter Date/Time**
```
Flight Date: [2024-11-05]
Flight Time: [14:30]
```

**Or extract from tile:**
```
[Upload sample PNG] → Auto-fills date/time from EXIF
```

#### **Step 3: See R2 Path Preview**
```
ℹ️ R2 Path: test20/2024-11-05/14-30/tiles/z/x/y.png
```

✅ **You know exactly where tiles will go!**

#### **Step 4: Enter Metadata**

**Option A: Upload JSON file**
```
[Choose metadata.json]
✓ Metadata valid
```

**Option B: Paste JSON**
```
{
  "name": "test20 - Nov 5",
  "bounds": [5.755898, 51.361755, 5.779088, 51.372146],
  "center": [5.767493, 51.366951, 17],
  "minzoom": 14,
  "maxzoom": 20
}
✓ Metadata valid
```

#### **Step 5: Upload Tiles**

**Tab 1: ZIP File**
```
[Choose tiles.zip]
tiles.zip selected
```

**Tab 2: Folder**
```
[Select tiles folder]
1234 PNG tiles selected
```

#### **Step 6: Upload**
```
[Upload Tileset for 2024-11-05 14:30]

Progress:
Uploading tiles to R2...
[████████████░░░░░░] 65.3%
567 / 1234 tiles
15/5242/12663.png

Creating tileset metadata...

✓ Tileset uploaded successfully!
```

---

## 🎯 Key Features

### **1. Date/Time Integration**

```
Every upload has a date/time:
- Tiles go to: test20/2024-11-05/14-30/tiles/
- Metadata includes: flight_date, flight_time
- Database stores: flight_datetime
- Map shows: 📅 Nov 5, 2024  🕐 14:30
```

### **2. Live R2 Path Preview**

```
As you type:
Golf Course: test20
Date: 2024-11-05
Time: 14:30

Preview updates:
test20/2024-11-05/14-30/tiles/z/x/y.png
```

**No more guessing where tiles will go!**

### **3. EXIF Time Extraction**

```
Upload a sample PNG tile:
→ Automatically extracts date/time from EXIF
→ Fills in Flight Date and Flight Time
→ No manual entry needed!
```

### **4. Flexible Tile Upload**

```
Option 1: ZIP File
- Upload tiles.zip
- Contains z/x/y.png structure
- Fast and convenient

Option 2: Folder
- Select tiles folder
- Browser reads all PNGs
- Preserves structure
```

### **5. Metadata Validation**

```
As you type/upload:
✓ Metadata valid (green checkmark)
✗ Invalid JSON (no checkmark)

Supports both formats:
- TileJSON: bounds: [minLon, minLat, maxLon, maxLat]
- Standard: bounds: {minLat, maxLat, minLon, maxLon}
```

### **6. Progress Tracking**

```
Real-time progress:
- Step name: "Uploading tiles to R2..."
- Progress bar: 65.3%
- Tiles uploaded: 567 / 1234
- Current tile: 15/5242/12663.png
```

---

## 🔄 Workflow Comparison

### **Old Workflow (Disconnected)**

```
Step 1: Go to TilesetMetadataUploader
├── Select golf course: test20
├── Enter date: 2024-11-05
├── Enter time: 14:30
├── Upload metadata.json
└── ✓ Metadata created

Step 2: Go to TilesetUploader (Bulk Upload)
├── Select golf course: test20
├── Upload tiles folder
├── Upload metadata.json (again!)
└── ✓ Tiles uploaded to: test20/tiles/ ✗ WRONG PATH!

Problem: Tiles went to old path without date/time!
```

### **New Workflow (Unified)**

```
Step 1: Go to UnifiedTilesetUploader
├── Select golf course: test20
├── Enter date: 2024-11-05
├── Enter time: 14:30
├── See preview: test20/2024-11-05/14-30/tiles/
├── Upload metadata.json
├── Upload tiles (ZIP or folder)
└── ✓ Everything uploaded to correct path!

Result: Tiles at test20/2024-11-05/14-30/tiles/ ✓
        Metadata with date/time ✓
        Map shows date/time layer ✓
```

---

## 📊 Multiple Uploads Example

### **Scenario: Upload 3 Different Dates**

#### **Upload 1: Nov 1**
```
Golf Course: test20
Flight Date: 2024-11-01
Flight Time: 10:30
Metadata: metadata_nov1.json
Tiles: tiles_nov1.zip

Result: test20/2024-11-01/10-30/tiles/
```

#### **Upload 2: Nov 3**
```
Golf Course: test20
Flight Date: 2024-11-03
Flight Time: 14:30
Metadata: metadata_nov3.json
Tiles: tiles_nov3.zip

Result: test20/2024-11-03/14-30/tiles/
```

#### **Upload 3: Nov 5**
```
Golf Course: test20
Flight Date: 2024-11-05
Flight Time: 09:15
Metadata: metadata_nov5.json
Tiles: tiles_nov5.zip

Result: test20/2024-11-05/09-15/tiles/
```

#### **On Map:**
```
Primary Layer:
[📅 Nov 5, 2024  🕐 09:15 ▼]

Compare With:
[📅 Nov 3, 2024  🕐 14:30 ▼]

Options:
- 📅 Nov 5, 2024  🕐 09:15
- 📅 Nov 3, 2024  🕐 14:30
- 📅 Nov 1, 2024  🕐 10:30
```

**Each upload is clearly identified by date/time!**

---

## ✅ Validation

### **Required Fields**

```
✓ Golf Course selected
✓ Flight Date entered
✓ Flight Time entered
✓ Metadata JSON valid
✓ Tiles selected (ZIP or folder)

All required → Upload button enabled
Missing any → Upload button disabled
```

### **Error Messages**

```
No golf course:
"Golf Course Required - Please select a golf course"

No date/time:
"Date/Time Required - Please provide flight date and time"

No metadata:
"Metadata Required - Please provide valid metadata JSON"

No tiles:
"Tiles Required - Please select tiles (ZIP or folder)"

Invalid metadata:
"Invalid Metadata - Failed to parse metadata.json file"
```

---

## 🚀 How to Use

### **Replace Old Components**

In your admin dashboard, replace:
```tsx
// OLD: Two separate components
<TilesetMetadataUploader golfClubs={clubs} />
<TilesetUploader />

// NEW: One unified component
<UnifiedTilesetUploader />
```

### **Import**

```tsx
import UnifiedTilesetUploader from '@/components/UnifiedTilesetUploader';
```

---

## 📁 Files

### **New File Created**
```
src/components/UnifiedTilesetUploader.tsx
```

### **Features**
- ✅ Golf course selection
- ✅ Date/time inputs
- ✅ EXIF time extraction
- ✅ R2 path preview
- ✅ Metadata input (file or textarea)
- ✅ Metadata validation
- ✅ Tile upload (ZIP or folder)
- ✅ Progress tracking
- ✅ Error handling
- ✅ Success feedback

---

## 🎯 Benefits

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Components** | 2 separate | 1 unified |
| **Date/Time** | Only in metadata uploader | Integrated everywhere |
| **R2 Path** | Hidden/unclear | Live preview |
| **Workflow** | 2 steps | 1 step |
| **Confusion** | High (which date?) | None (date shown) |
| **Path Structure** | Mixed (old/new) | Consistent (new) |
| **User Experience** | Disconnected | Seamless |

---

## 📝 Summary

### **Problem**
Two disconnected upload sections made it unclear which date/time tiles belonged to.

### **Solution**
One unified component where you specify:
1. Golf course
2. Date/time
3. Metadata
4. Tiles

All in one form with live R2 path preview!

### **Result**
```
Clear workflow:
test20 + 2024-11-05 + 14:30 + metadata + tiles
→ test20/2024-11-05/14-30/tiles/z/x/y.png

On map:
📅 Nov 5, 2024  🕐 14:30
```

**No more confusion!** 🎉
