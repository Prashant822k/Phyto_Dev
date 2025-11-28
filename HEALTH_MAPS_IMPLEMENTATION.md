# Health Maps Implementation Guide

## 🎯 Overview
Health maps (NDVI, stress analysis, etc.) are stored separately from regular orthomosaic tiles with independent date/time but share the same metadata (bounds, center, zoom).

---

## 📁 **File Structure**

```
test21/
  ├── 2025-11-24/              # Original flight
  │   └── 17-30/
  │       └── tiles/           # Regular orthomosaic
  │           ├── 14/
  │           ├── 15/
  │           └── ...
  └── health_maps/             # Health analysis (separate timeline)
      ├── 2025-11-25/          # Analysis date 1
      │   └── 10-00/
      │       ├── 14/
      │       └── ...
      └── 2025-11-26/          # Analysis date 2
          └── 14-00/
              ├── 14/
              └── ...
```

**Path Pattern:** `{course_id}/health_maps/{date}/{time}/{z}/{x}/{y}.png`

---

## 📊 **Database Schema**

### Table: `health_map_tilesets`

```sql
CREATE TABLE health_map_tilesets (
  id UUID PRIMARY KEY,
  golf_club_id TEXT NOT NULL,
  source_tileset_id UUID REFERENCES golf_course_tilesets(id),
  
  -- Paths
  r2_folder_path TEXT NOT NULL,
  tile_url_pattern TEXT DEFAULT '{z}/{x}/{y}.png',
  
  -- Analysis metadata
  analysis_type TEXT DEFAULT 'ndvi',
  analysis_date DATE NOT NULL,
  analysis_time TIME NOT NULL,
  
  -- Copied from source tileset
  min_lat, max_lat, min_lon, max_lon DOUBLE PRECISION,
  center_lat, center_lon DOUBLE PRECISION,
  min_zoom INTEGER DEFAULT 14,
  max_zoom INTEGER DEFAULT 20,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔧 **Implementation Steps**

### ✅ Step 1: Database Migration
- Created: `supabase/migrations/20250127_create_health_map_tilesets.sql`
- Run: `supabase db push` to apply

### ✅ Step 2: Update tile-proxy Edge Function
- Added `type` parameter support (`regular` or `health`)
- Queries `health_map_tilesets` table when `type=health`
- File: `supabase/functions/tile-proxy/index.ts`

### 🔄 Step 3: Add Toggle UI (In Progress)
- Add Switch component in MapboxGolfCourseMap
- Load health map tilesets for current golf club
- Toggle health map layer visibility

### 📝 Step 4: Upload Component (Future)
- Create health map upload interface
- Select source tileset to copy metadata
- Set analysis date/time
- Upload tiles to R2

---

## 🎨 **UI Design**

```
┌─────────────────────────────────────────────────┐
│ Golf Course Map                    Zoom: 16     │
│                                                  │
│ [Zoom Controls]  [🔬 Health Maps ○ OFF]        │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │         Map with PNG Tiles                  │ │
│ │                                             │ │
│ │  [Health Map Overlay when toggled ON]      │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## 🚀 **Usage Flow**

### For Clients:
1. View regular orthomosaic tiles
2. Toggle "Show Health Maps" switch
3. Health analysis overlay appears
4. Toggle off to hide

### For Admins (Upload):
1. Select source tileset (e.g., test21 2025-11-24)
2. Metadata auto-fills from source
3. Set analysis date/time (can be different)
4. Upload health map tiles
5. Tiles go to: `test21/health_maps/2025-11-25/10-00/`

---

## 🔗 **Tile URL Format**

### Regular Tiles:
```
/functions/v1/tile-proxy?tilesetId={id}&z={z}&x={x}&y={y}&token={token}
```

### Health Map Tiles:
```
/functions/v1/tile-proxy?tilesetId={id}&type=health&z={z}&x={x}&y={y}&token={token}
```

---

## ✨ **Features**

- ✅ Independent date/time for health maps
- ✅ Reuse metadata from source tileset
- ✅ Multiple health map versions per course
- ✅ Smooth toggle on/off
- ✅ Overlay on top of regular tiles
- ✅ Same RLS policies as regular tiles

---

## 📦 **Deployment Checklist**

- [x] Create database migration
- [x] Update tile-proxy edge function
- [ ] Add toggle UI in MapboxGolfCourseMap
- [ ] Test health map loading
- [ ] Deploy edge function
- [ ] Run database migration
- [ ] Create upload component (future)

---

## 🎯 **Next Steps**

1. Complete toggle UI implementation
2. Test with sample health map tiles
3. Deploy to production
4. Create upload interface for admins
