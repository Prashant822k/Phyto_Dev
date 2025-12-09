# 🎨 Layer System Explained - Visual Guide

## The Big Picture

### What You Upload

```
📦 Single ZIP File (Nov 1, 2024, 10:30 AM)
│
├── 14/
│   ├── 2621/
│   │   └── 6331.png
│   └── 2622/
│       └── 6332.png
│
├── 15/
│   ├── 5242/
│   │   └── 12663.png
│   └── 5243/
│       └── 12664.png
│
├── 16/
│   └── (more tiles)
├── 17/
│   └── (more tiles)
├── 18/
│   └── (more tiles)
├── 19/
│   └── (more tiles)
└── 20/
    └── (more tiles)
```

**Result:** ONE complete tileset with ALL zoom levels

---

## How It's Stored in R2

```
R2 Bucket: golf-course-tiles
│
└── the-best-golf/
    │
    ├── 2024-11-01/
    │   └── 10-30/
    │       └── tiles/
    │           ├── 14/
    │           │   └── 2621/
    │           │       └── 6331.png
    │           ├── 15/
    │           │   └── 5242/
    │           │       └── 12663.png
    │           ├── 16/
    │           ├── 17/
    │           ├── 18/
    │           ├── 19/
    │           └── 20/
    │
    └── 2024-11-03/
        └── 14-30/
            └── tiles/
                ├── 14/
                ├── 15/
                ├── 16/
                ├── 17/
                ├── 18/
                ├── 19/
                └── 20/
```

**Key Point:** Each date/time folder contains a COMPLETE set of tiles for all zoom levels.

---

## How Database Stores It

```sql
golf_course_tilesets table:

┌──────────────┬─────────────┬──────────────┬──────────────┬────────────────────────────────────────┐
│ id           │ name        │ flight_date  │ flight_time  │ r2_folder_path                         │
├──────────────┼─────────────┼──────────────┼──────────────┼────────────────────────────────────────┤
│ uuid-1       │ Best Golf   │ 2024-11-01   │ 10:30:00     │ the-best-golf/2024-11-01/10-30/tiles   │
│ uuid-2       │ Best Golf   │ 2024-11-03   │ 14:30:00     │ the-best-golf/2024-11-03/14-30/tiles   │
└──────────────┴─────────────┴──────────────┴──────────────┴────────────────────────────────────────┘
```

**Each row = One complete tileset = All zoom levels for that date/time**

---

## How Mapbox Displays It

### Scenario 1: Single Layer (Nov 3)

```
User View:
┌─────────────────────────────────┐
│                                 │
│         MAP DISPLAY             │
│    (Nov 3, 2024 tiles)          │
│                                 │
│  [User zooms: 14 → 16 → 18]     │
│                                 │
└─────────────────────────────────┘

Behind the Scenes:
Zoom 14 → Fetch: the-best-golf/2024-11-03/14-30/tiles/14/{x}/{y}.png
Zoom 16 → Fetch: the-best-golf/2024-11-03/14-30/tiles/16/{x}/{y}.png
Zoom 18 → Fetch: the-best-golf/2024-11-03/14-30/tiles/18/{x}/{y}.png
```

### Scenario 2: Two Layers with Swipe

```
User View:
┌──────────────────┬──────────────────┐
│                  │                  │
│   Nov 1 Layer    │   Nov 3 Layer    │
│   (Left Side)    │   (Right Side)   │
│                  │                  │
│                 ◉│◉                 │
│                  │                  │
└──────────────────┴──────────────────┘
        ← Drag slider →

Behind the Scenes (at Zoom 16):
Left:  the-best-golf/2024-11-01/10-30/tiles/16/{x}/{y}.png
Right: the-best-golf/2024-11-03/14-30/tiles/16/{x}/{y}.png

User zooms to 18:
Left:  the-best-golf/2024-11-01/10-30/tiles/18/{x}/{y}.png
Right: the-best-golf/2024-11-03/14-30/tiles/18/{x}/{y}.png
```

---

## The Tile Request Flow

### Step-by-Step

```
1. User Action
   └─> Zoom to level 16
   
2. Mapbox GL
   └─> Needs tiles for visible area at zoom 16
   └─> Calculates which tiles: (16/10485/25327, 16/10485/25328, etc.)
   
3. For Each Selected Layer
   └─> Layer 1 (Nov 1):
       └─> Request: /tile-proxy?tilesetId=uuid-1&z=16&x=10485&y=25327
   └─> Layer 2 (Nov 3):
       └─> Request: /tile-proxy?tilesetId=uuid-2&z=16&x=10485&y=25327
       
4. Edge Function (tile-proxy)
   └─> Looks up tileset uuid-1 in database
   └─> Gets r2_folder_path: "the-best-golf/2024-11-01/10-30/tiles"
   └─> Constructs full path: "the-best-golf/2024-11-01/10-30/tiles/16/10485/25327.png"
   └─> Fetches from R2
   └─> Returns PNG to browser
   
5. Browser
   └─> Displays tile on map
   └─> Caches for future use
```

---

## Why You Don't Need Separate Uploads Per Zoom Level

### ❌ Wrong Approach (Don't Do This)

```
Upload 1: Zoom 14 tiles only, date Nov 1
Upload 2: Zoom 15 tiles only, date Nov 1
Upload 3: Zoom 16 tiles only, date Nov 1
...
Upload 7: Zoom 20 tiles only, date Nov 1
```

**Problems:**
- 7 separate uploads per date
- 7 separate metadata records
- Complex to manage
- Doesn't work with our system

### ✅ Correct Approach (Do This)

```
Upload 1: ALL zoom levels (14-20), date Nov 1
Upload 2: ALL zoom levels (14-20), date Nov 3
```

**Benefits:**
- 1 upload per date
- 1 metadata record per date
- Simple to manage
- Works perfectly with layer selector

---

## Testing Scenarios

### Test 1: Single Date, All Zoom Levels

```
Upload:
└─> Nov 1, 2024, 10:30 AM
    └─> Zoom 14-20 tiles

Test:
1. Enable Nov 1 layer
2. Zoom from 14 → 20
3. Verify tiles load at each level

Expected:
✓ Zoom 14: Shows overview
✓ Zoom 16: Shows medium detail
✓ Zoom 18: Shows high detail
✓ Zoom 20: Shows maximum detail
```

### Test 2: Two Dates, Compare at Different Zooms

```
Upload:
├─> Nov 1, 2024, 10:30 AM (Zoom 14-20)
└─> Nov 3, 2024, 14:30 PM (Zoom 14-20)

Test:
1. Enable both layers
2. Activate swipe mode
3. Zoom to 14: Compare at zoom 14
4. Zoom to 16: Compare at zoom 16
5. Zoom to 18: Compare at zoom 18
6. Zoom to 20: Compare at zoom 20

Expected:
✓ At each zoom level, both layers show correct tiles
✓ Swipe slider works at all zoom levels
✓ Can see differences between dates
```

### Test 3: Three Dates (Max 2 Active)

```
Upload:
├─> Nov 1, 2024, 10:30 AM
├─> Nov 3, 2024, 14:30 PM
└─> Nov 5, 2024, 09:00 AM

Test:
1. Layer selector shows all 3
2. Enable Nov 1 and Nov 3
3. Swipe works
4. Disable Nov 1, enable Nov 5
5. Now comparing Nov 3 vs Nov 5
6. Swipe still works

Expected:
✓ Can switch between any 2 layers
✓ Each comparison works at all zoom levels
```

---

## Common Misunderstandings Clarified

### ❓ "Do I need to upload zoom 14 separately from zoom 15?"

**Answer:** NO! Upload all zoom levels together in one ZIP file.

### ❓ "Will the map show different zoom levels?"

**Answer:** YES! Mapbox automatically requests the correct zoom level tiles as users zoom in/out.

### ❓ "Do I need to create separate tilesets for each zoom level?"

**Answer:** NO! One tileset = All zoom levels for that date/time.

### ❓ "How does Mapbox know which zoom level to show?"

**Answer:** Mapbox uses the `{z}` placeholder in the tile URL template. When user zooms to 16, it requests tiles with `z=16`.

### ❓ "Can I compare two dates at zoom 18?"

**Answer:** YES! As long as both dates have zoom 18 tiles uploaded, swipe works at zoom 18.

### ❓ "What if I only have zoom 14-16 tiles?"

**Answer:** Set `min_zoom: 14, max_zoom: 16` in metadata. Map won't allow zooming beyond 16.

---

## Visual: How Zoom Levels Relate

```
Zoom Level    Coverage        Detail Level    Tile Count
─────────────────────────────────────────────────────────
14            Large area      Low detail      ~100 tiles
15            Medium area     Low-Med         ~400 tiles
16            Medium area     Medium          ~1,600 tiles
17            Small area      Med-High        ~6,400 tiles
18            Small area      High            ~25,600 tiles
19            Tiny area       Very High       ~102,400 tiles
20            Tiny area       Maximum         ~409,600 tiles
```

**Key Point:** Higher zoom = More tiles, smaller area, more detail

---

## Summary

### What You Need to Know

1. **One Upload = One Complete Tileset**
   - Contains all zoom levels (14-20)
   - Has one date/time
   - Stored in one R2 folder

2. **One Tileset = One Layer**
   - Can be toggled on/off
   - Works at all zoom levels
   - Can be compared with other layers

3. **Mapbox Handles Zoom Automatically**
   - You provide tile URL template with `{z}/{x}/{y}`
   - Mapbox fills in correct values
   - Tiles load on-demand

4. **Swipe Compares Two Complete Tilesets**
   - Both layers show same zoom level
   - Slider divides the view
   - Zooming works in swipe mode

### Testing Checklist

- [ ] Upload tiles with date/time (all zoom levels)
- [ ] Create metadata record
- [ ] View single layer
- [ ] Test zoom in/out (14 → 20)
- [ ] Upload second date
- [ ] Enable both layers
- [ ] Test swipe comparison
- [ ] Test zoom during swipe

---

**You're ready to test!** 🚀

Follow `COMPLETE_TESTING_GUIDE.md` for step-by-step instructions.
