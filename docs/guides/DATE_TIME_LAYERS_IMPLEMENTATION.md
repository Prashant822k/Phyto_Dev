# Date/Time-Based Layers & Swipe Comparison Implementation

## Overview
This document describes the implementation of date/time-based tileset organization and layer comparison functionality for the Phyto_Dev golf course mapping application.

## Features Implemented

### 1. Date/Time-Based Bucket Structure
**Old Structure:**
```
{course-name}/tiles/{z}/{x}/{y}.png
```

**New Structure:**
```
{course-name}/{YYYY-MM-DD}/{HH-MM}/tiles/{z}/{x}/{y}.png

Example:
test15/2024-11-03/14-30/tiles/15/5242/12663.png
```

### 2. Database Schema Updates
**File:** `add-datetime-to-tilesets.sql`

**New Fields Added to `golf_course_tilesets` table:**
- `flight_date` (DATE): Date of drone flight
- `flight_time` (TIME): Approximate time of flight  
- `flight_datetime` (TIMESTAMP): Combined date/time for sorting

**Features:**
- Automatic `flight_datetime` calculation via database trigger
- Updated unique constraint to allow multiple tilesets per course with different dates/times
- Indexes for efficient date-based queries

### 3. EXIF Metadata Extraction
**File:** `src/lib/exifExtractor.ts`

**Functions:**
- `extractPngMetadata()`: Extracts EXIF data from PNG tiles
- `parseExifDateTime()`: Parses EXIF datetime strings
- `extractDateTimeFromPng()`: Main extraction function
- `getFileDateTime()`: Fallback to file modification time
- `generateR2FolderPath()`: Generates date/time-based R2 paths

**Usage:**
```typescript
import { extractOrFallbackDateTime } from '@/lib/exifExtractor'

const dateTime = await extractOrFallbackDateTime(pngFile)
// Returns: { date: "2024-11-03", time: "14:30", datetime: "2024-11-03T14:30:00" }
```

### 4. Updated TilesetMetadataUploader Component
**File:** `src/components/TilesetMetadataUploader.tsx`

**New Features:**
- Date input field (manual entry)
- Time input field (manual entry)
- Sample tile upload for automatic EXIF time extraction
- Automatic R2 folder path generation with date/time

**UI Flow:**
1. User selects golf course
2. User enters flight date (required for new structure)
3. User enters flight time OR uploads sample PNG tile for auto-extraction
4. User uploads metadata.json
5. System generates R2 path: `{course-name}/{date}/{time}/tiles`

### 5. Updated Edge Functions

#### tile-proxy Function
**File:** `supabase/functions/tile-proxy/index.ts`

**Changes:**
- Now accepts `tilesetId` instead of `courseId`
- Fetches `r2_folder_path` from database
- Supports both legacy and new date/time-based paths
- Constructs tile keys dynamically based on tileset metadata

**URL Format:**
```
/functions/v1/tile-proxy?tilesetId={uuid}&z={z}&x={x}&y={y}&token={jwt}
```

#### r2-sign Function
**File:** `supabase/functions/r2-sign/index.ts`

**No changes required** - already supports dynamic paths via the `key` parameter

### 6. Layer Selector Component
**File:** `src/components/LayerSelector.tsx`

**Features:**
- Displays all available tilesets for a golf course
- Groups tilesets by base name
- Shows date/time for each tileset
- Toggle switches to enable/disable layers
- Maximum 2 layers can be selected (for swipe comparison)
- Sorted by date/time (newest first)

**UI Elements:**
- Calendar icon + formatted date
- Clock icon + time (HH:MM format)
- Layer description
- Enable/disable switches
- Selection counter badge

### 7. Map Swipe Control Component
**File:** `src/components/MapSwipeControl.tsx`

**Features:**
- Toggle button to activate/deactivate swipe mode
- Draggable vertical slider
- Compares left and right layers
- Visual slider handle with icon
- Smooth dragging experience

**Usage:**
```typescript
<MapSwipeControl
  map={mapInstance}
  leftLayerId="layer-2024-11-01"
  rightLayerId="layer-2024-11-03"
  isActive={swipeMode}
  onToggle={() => setSwipeMode(!swipeMode)}
/>
```

### 8. Updated TilesetService
**File:** `src/lib/tilesetService.ts`

**Changes:**
- `TilesetMetadata` interface now includes `flightDate` and `flightTime`
- `createTileset()` generates date/time-based R2 paths
- `getTilesetForGolfClub()` orders by `flight_datetime`
- `getTilesetsForGolfClub()` returns all tilesets sorted by date

**R2 Path Generation Logic:**
```typescript
if (metadata.flightDate && metadata.flightTime) {
  // New format with date/time
  const formattedTime = metadata.flightTime.replace(':', '-')
  r2FolderPath = `${courseName}/${metadata.flightDate}/${formattedTime}/tiles`
} else {
  // Legacy format without date/time
  r2FolderPath = `${courseName}/tiles`
}
```

## Migration Guide

### For Existing Tilesets (Legacy Format)
Existing tilesets will continue to work without modification. They use the legacy format:
```
{course-name}/tiles/{z}/{x}/{y}.png
```

### For New Tilesets (Date/Time Format)
1. Run the database migration: `add-datetime-to-tilesets.sql`
2. When uploading new tilesets:
   - Provide flight date
   - Provide flight time OR upload sample PNG for auto-extraction
   - Upload tiles to R2 with new structure: `{course}/{date}/{time}/tiles/`

### Database Migration Steps
```sql
-- Run this SQL in your Supabase SQL editor
\i add-datetime-to-tilesets.sql
```

This will:
- Add new columns to `golf_course_tilesets`
- Create indexes for performance
- Add trigger for automatic `flight_datetime` calculation
- Update unique constraints

## Usage Examples

### 1. Upload New Tileset with Date/Time
```typescript
const metadata = {
  name: "Pine Valley Main Course",
  bounds: [minLon, minLat, maxLon, maxLat],
  center: [lon, lat, zoom],
  minzoom: 14,
  maxzoom: 20,
  flightDate: "2024-11-03",  // NEW
  flightTime: "14:30"         // NEW
}

const tileset = await TilesetService.createTileset(golfClubId, metadata)
```

### 2. Get All Tilesets for a Golf Course
```typescript
const tilesets = await TilesetService.getTilesetsForGolfClub(golfClubId)
// Returns tilesets sorted by flight_datetime (newest first)
```

### 3. Display Layer Selector
```typescript
<LayerSelector
  tilesets={tilesets}
  selectedLayers={selectedLayerIds}
  onLayerToggle={(id, enabled) => {
    if (enabled) {
      setSelectedLayerIds([...selectedLayerIds, id])
    } else {
      setSelectedLayerIds(selectedLayerIds.filter(lid => lid !== id))
    }
  }}
  maxLayers={2}
/>
```

### 4. Enable Swipe Comparison
```typescript
const [swipeMode, setSwipeMode] = useState(false)
const [selectedLayers, setSelectedLayers] = useState<string[]>([])

// Only enable swipe when exactly 2 layers are selected
const canSwipe = selectedLayers.length === 2

<MapSwipeControl
  map={map}
  leftLayerId={selectedLayers[0]}
  rightLayerId={selectedLayers[1]}
  isActive={swipeMode && canSwipe}
  onToggle={() => setSwipeMode(!swipeMode)}
/>
```

## File Structure

```
src/
├── components/
│   ├── LayerSelector.tsx           # NEW: Layer selection UI
│   ├── MapSwipeControl.tsx         # NEW: Swipe comparison control
│   ├── TilesetMetadataUploader.tsx # UPDATED: Added date/time inputs
│   └── MapboxGolfCourseMap.tsx     # TO BE UPDATED: Multi-layer support
├── lib/
│   ├── exifExtractor.ts            # NEW: EXIF metadata extraction
│   ├── tilesetService.ts           # UPDATED: Date/time support
│   └── supabase.ts                 # UPDATED: Database types
supabase/functions/
├── tile-proxy/
│   └── index.ts                    # UPDATED: Dynamic path support
└── r2-sign/
    └── index.ts                    # No changes needed
add-datetime-to-tilesets.sql        # NEW: Database migration
```

## Next Steps

### Remaining Tasks:
1. **Update MapboxGolfCourseMap Component**
   - Support multiple tileset layers
   - Integrate LayerSelector
   - Integrate MapSwipeControl
   - Handle layer visibility toggling

2. **Testing**
   - Test EXIF extraction with real drone imagery
   - Test swipe functionality with 2 layers
   - Test backward compatibility with legacy tilesets
   - Test edge function with new URL format

3. **UI/UX Enhancements**
   - Add loading states during EXIF extraction
   - Add visual feedback for swipe mode
   - Add layer opacity controls
   - Add date range filtering

## Technical Notes

### EXIF Extraction Limitations
- PNG EXIF support is limited compared to JPEG
- Falls back to file modification time if no EXIF data
- Supports common EXIF date/time fields:
  - `DateTime`
  - `DateTimeOriginal`
  - `DateTimeDigitized`
  - `GPSDateTime`

### Performance Considerations
- Database indexes on `flight_datetime` for fast queries
- Tile caching in edge functions (1 hour)
- Layer ordering optimized for swipe comparison

### Browser Compatibility
- Mapbox GL JS v2.x+ required
- Modern browsers with ES6+ support
- FileReader API for EXIF extraction

## Troubleshooting

### Issue: Time not extracted from PNG
**Solution:** Upload time manually or check if PNG has EXIF metadata

### Issue: Tiles not loading with new structure
**Solution:** Verify R2 folder path matches: `{course}/{date}/{time}/tiles/`

### Issue: Swipe not working
**Solution:** Ensure exactly 2 layers are selected and swipe mode is active

### Issue: Legacy tilesets not showing
**Solution:** They should still work - check `is_active` flag in database

## API Reference

### TilesetMetadata Interface
```typescript
interface TilesetMetadata {
  name: string
  description?: string
  bounds: [number, number, number, number] | { minLat, maxLat, minLon, maxLon }
  center?: [number, number, number] | { lat, lon }
  minzoom?: number
  maxzoom?: number
  tileSize?: number
  format?: 'png' | 'jpg' | 'webp'
  attribution?: string
  flightDate?: string  // YYYY-MM-DD
  flightTime?: string  // HH:MM
}
```

### Database Schema
```sql
CREATE TABLE golf_course_tilesets (
  id UUID PRIMARY KEY,
  golf_club_id UUID REFERENCES golf_clubs(id),
  name TEXT NOT NULL,
  description TEXT,
  min_lat DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  min_lon DOUBLE PRECISION,
  max_lon DOUBLE PRECISION,
  center_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  min_zoom INTEGER,
  max_zoom INTEGER,
  default_zoom INTEGER,
  r2_folder_path TEXT NOT NULL,
  tile_url_pattern TEXT,
  tile_size INTEGER,
  format TEXT,
  attribution TEXT,
  metadata JSONB,
  is_active BOOLEAN,
  flight_date DATE,              -- NEW
  flight_time TIME,              -- NEW
  flight_datetime TIMESTAMP,     -- NEW (auto-calculated)
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Support

For issues or questions:
1. Check this documentation
2. Review implementation files
3. Check database migration status
4. Verify R2 bucket structure

---

**Implementation Date:** November 3, 2024  
**Version:** 1.0  
**Status:** Core features implemented, MapboxGolfCourseMap integration pending
