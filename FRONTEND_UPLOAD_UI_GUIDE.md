# 🎨 Frontend Tile Upload UI - Updated Guide

## What You'll See Now

The frontend tile upload page has been updated to show the **new date/time-based path structure**.

---

## 📱 UI Layout

### **Header Section**

```
┌─────────────────────────────────────────────────────────┐
│ Upload Map Tiles                                        │
│                                                         │
│ Upload tiles for a golf course to R2 with date/time    │
│ metadata. Tiles must follow the z/x/y.png structure.   │
│                                                         │
│ Path format: course-id/YYYY-MM-DD/HH-MM/tiles/z/x/y.png
└─────────────────────────────────────────────────────────┘
```

**Key Change:** Now shows the **new path format** with date/time!

---

### **Course ID Input**

```
┌─────────────────────────────────────────────────────────┐
│ Course ID                                               │
│ [test20                                              ]  │
│                                                         │
│ Use lowercase with hyphens (e.g., the-best-golf)       │
└─────────────────────────────────────────────────────────┘
```

**Enter:** `test20` (your golf course name)

---

### **Date and Time Inputs**

```
┌─────────────────────────────────────────────────────────┐
│ Flight Date              Flight Time                    │
│ [2024-11-05          ]  [14:30                      ]  │
│ Date of drone flight    Approximate time (HH:MM)       │
└─────────────────────────────────────────────────────────┘
```

**CRITICAL:** These must match your metadata!

Example:
- If metadata date was: `2024-11-05`
- Enter here: `2024-11-05`
- If metadata time was: `14:30`
- Enter here: `14:30`

---

### **Path Preview (NEW!)**

```
┌─────────────────────────────────────────────────────────┐
│ ℹ️ New Structure: Tiles will be uploaded to             │
│                                                         │
│ test20/2024-11-05/14-30/tiles/z/x/y.png               │
└─────────────────────────────────────────────────────────┘
```

**What This Shows:**
- ✅ Course ID: `test20`
- ✅ Date: `2024-11-05`
- ✅ Time: `14-30` (colon replaced with hyphen)
- ✅ Tiles folder: `tiles`
- ✅ Tile structure: `z/x/y.png`

**If you leave date/time empty:**
```
test20/tiles/z/x/y.png  (old structure - legacy)
```

---

### **Upload Options**

```
┌─────────────────────────────────────────────────────────┐
│ Upload ZIP File              Upload Folder             │
│ [📦 Select ZIP]              [📁 Select Folder]        │
└─────────────────────────────────────────────────────────┘
```

**Choose One:**
1. **ZIP File:** Compress your tiles folder, upload ZIP
2. **Folder:** Select your tiles folder directly

---

### **Progress Display (During Upload)**

```
┌─────────────────────────────────────────────────────────┐
│ Uploading tiles...                                      │
│ [████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 45.2%  │
│                                                         │
│ 567 / 1234                                              │
│ 15/5242/12663.png                                       │
└─────────────────────────────────────────────────────────┘
```

Shows:
- Progress bar
- Percentage complete
- Current tile being uploaded
- Total progress (uploaded / total)

---

### **Success Message**

```
┌─────────────────────────────────────────────────────────┐
│ ✓ Upload successful!                                    │
│                                                         │
│ 1234 tiles uploaded to test20                           │
│                                                         │
│ Tile URL for Mapbox:                                    │
│ https://supabase.../functions/v1/tile-proxy?...        │
└─────────────────────────────────────────────────────────┘
```

---

### **Instructions Section (NEW!)**

```
┌─────────────────────────────────────────────────────────┐
│ 📁 Expected tile folder structure:                      │
│                                                         │
│ tiles/                                                  │
│   14/                                                   │
│     2621/                                               │
│       6331.png                                          │
│   15/                                                   │
│     5242/                                               │
│       12663.png                                         │
│       12664.png                                         │
│   16/                                                   │
│     10484/                                              │
│       25326.png                                         │
│   ...                                                   │
│   20/ (zoom 20 tiles)                                   │
│                                                         │
│ 💡 Tip: Upload as ZIP file or select the entire       │
│    tiles folder. Date and time must match your         │
│    metadata!                                            │
└─────────────────────────────────────────────────────────┘
```

**Key Points:**
- Shows complete folder structure
- Includes all zoom levels (14-20)
- Helpful tip about date/time matching

---

## 🎯 Complete User Flow

### **Your Specific Example: test20**

```
Step 1: Enter Course ID
┌─────────────────────────────────────────┐
│ Course ID: [test20                    ] │
└─────────────────────────────────────────┘

Step 2: Enter Date (from metadata)
┌─────────────────────────────────────────┐
│ Flight Date: [2024-11-05              ] │
└─────────────────────────────────────────┘

Step 3: Enter Time (from metadata)
┌─────────────────────────────────────────┐
│ Flight Time: [14:30                   ] │
└─────────────────────────────────────────┘

Step 4: See Path Preview
┌─────────────────────────────────────────┐
│ ℹ️ test20/2024-11-05/14-30/tiles/z/x/y.png
└─────────────────────────────────────────┘

Step 5: Upload Tiles
┌─────────────────────────────────────────┐
│ [📦 Select ZIP] or [📁 Select Folder]  │
└─────────────────────────────────────────┘

Step 6: Monitor Progress
┌─────────────────────────────────────────┐
│ [████████████░░░░░░░░░░░░░░] 45.2%     │
│ 567 / 1234                              │
└─────────────────────────────────────────┘

Step 7: Success!
┌─────────────────────────────────────────┐
│ ✓ 1234 tiles uploaded to test20        │
└─────────────────────────────────────────┘
```

---

## ✅ What Changed

### **Before (Old UI)**

```
Upload tiles for a golf course to Cloudflare R2.
Tiles must follow the z/x/y.png structure.

R2 Path: test20/tiles/z/x/y.png
```

**Problem:** Shows old path without date/time

### **After (New UI)**

```
Upload tiles for a golf course to R2 with date/time
metadata. Tiles must follow the z/x/y.png structure.

Path format: course-id/YYYY-MM-DD/HH-MM/tiles/z/x/y.png

[Date and Time inputs]

New Structure: Tiles will be uploaded to
test20/2024-11-05/14-30/tiles/z/x/y.png
```

**Improvement:** 
- ✅ Shows new path structure
- ✅ Explains date/time format
- ✅ Shows live preview of actual path
- ✅ Better instructions with complete folder structure

---

## 🔍 Key Features

### **1. Live Path Preview**

As you type, the preview updates:

```
Course ID: test20
Flight Date: 2024-11-05
Flight Time: 14:30

Preview: test20/2024-11-05/14-30/tiles/z/x/y.png
```

### **2. Date/Time Matching Reminder**

```
💡 Tip: Upload as ZIP file or select the entire tiles
   folder. Date and time must match your metadata!
```

Reminds users to match metadata!

### **3. Complete Folder Structure**

Shows exactly what structure is expected:
```
tiles/
  14/
    2621/
      6331.png
  15/
    5242/
      12663.png
  ...
  20/
```

### **4. Flexible Upload Options**

- ZIP file upload
- Folder upload
- Both preserve z/x/y structure

---

## 🚀 How to Use (For Your test20 Course)

### **Step 1: Navigate to Upload Page**

```
http://localhost:5173/tile-upload
```

### **Step 2: Fill Form**

```
Course ID: test20
Flight Date: 2024-11-05  (match your metadata)
Flight Time: 14:30       (match your metadata)
```

### **Step 3: Verify Preview**

```
✓ Shows: test20/2024-11-05/14-30/tiles/z/x/y.png
```

### **Step 4: Upload Tiles**

```
Click: Select ZIP or Select Folder
Choose: Your tiles file/folder
Wait: Upload completes
```

### **Step 5: See Success**

```
✓ Upload successful!
1234 tiles uploaded to test20
```

### **Step 6: View on Map**

```
Go to: Map page
Select: test20 from dropdown
See: 📅 Nov 5, 2024  🕐 14:30
Map displays your tiles!
```

---

## ⚠️ Important Notes

### **Date/Time Must Match Metadata**

```
Metadata Upload:
- Date: 2024-11-05
- Time: 14:30

Tile Upload:
- Date: 2024-11-05  ✓ SAME
- Time: 14:30       ✓ SAME

Result: Tiles and metadata linked correctly!
```

### **Path Format**

```
Old (Legacy):
course-id/tiles/z/x/y.png

New (With Date/Time):
course-id/YYYY-MM-DD/HH-MM/tiles/z/x/y.png

Example:
test20/2024-11-05/14-30/tiles/15/5242/12663.png
```

### **Tile Structure**

```
✓ Correct:
tiles/
  15/
    5242/
      12663.png

✗ Wrong:
15/
  5242/
    12663.png
```

Must have `tiles/` folder as root!

---

## 🎯 Summary

**The frontend now clearly shows:**

1. ✅ New path structure with date/time
2. ✅ Live preview of actual R2 path
3. ✅ Date and time input fields
4. ✅ Complete folder structure example
5. ✅ Helpful tip about matching metadata
6. ✅ Progress tracking during upload
7. ✅ Success confirmation

**For your test20 course:**

```
1. Enter: test20
2. Enter: 2024-11-05 (your metadata date)
3. Enter: 14:30 (your metadata time)
4. See: test20/2024-11-05/14-30/tiles/z/x/y.png
5. Upload: Your tiles
6. Success: Tiles in R2 with date/time structure
7. View: On map with date/time layer selector
```

---

## 📝 Next Steps

1. **Refresh browser** to see updated UI
2. **Go to tile upload page**
3. **Enter your test20 details**
4. **Upload your tiles**
5. **View on map**

Everything is ready! 🚀
