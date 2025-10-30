# Mapbox Golf Course Tile Overlay System

A complete React + Mapbox GL solution for displaying golf course XYZ tiles from Cloudflare R2 overlaid on Mapbox satellite imagery.

## 🎯 Features

- ✅ Mapbox GL JS integration with satellite base maps
- ✅ Custom PNG tile overlays from Cloudflare R2
- ✅ Per-golf-course tileset management
- ✅ Database-driven tileset metadata (bounds, zoom levels, etc.)
- ✅ Supabase Edge Function tile proxy (handles R2 signed URLs)
- ✅ TypeScript type safety throughout
- ✅ React hooks for easy integration
- ✅ Row-level security (RLS) for multi-tenant access
- ✅ Responsive map controls (zoom, pan, overlay toggle)

## 📁 Project Structure

```
Phyto_Dev/
├── src/
│   ├── components/
│   │   └── MapboxGolfCourseMap.tsx      # Main map component
│   └── lib/
│       ├── tilesetService.ts             # Tileset CRUD operations
│       ├── r2Service.ts                  # R2 storage interface
│       └── supabase.ts                   # Supabase client + types
├── supabase/
│   └── functions/
│       └── tile-proxy/
│           └── index.ts                  # Edge function for serving tiles
├── tileset-metadata-schema.sql           # Database schema
├── example-tileset-metadata.json         # Sample metadata
├── MAPBOX_SETUP_GUIDE.md                 # Complete setup guide
├── USAGE_EXAMPLE.md                      # Code examples
└── README_MAPBOX.md                      # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd Phyto_Dev
npm install mapbox-gl @types/mapbox-gl
```

### 2. Set Up Environment Variables

Add to `.env`:

```env
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiY...your-token
```

Get your token from: https://account.mapbox.com/access-tokens/

### 3. Set Up Database

Run the SQL schema in Supabase SQL Editor:

```bash
# Execute: tileset-metadata-schema.sql
```

### 4. Deploy Tile Proxy

```bash
supabase functions deploy tile-proxy --no-verify-jwt
```

### 5. Add Tileset Metadata

```sql
INSERT INTO public.golf_course_tilesets (
  golf_club_id,
  name,
  description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path,
  tile_url_pattern,
  tile_size,
  format,
  attribution
) VALUES (
  (SELECT id FROM public.golf_clubs WHERE name = 'Your Golf Club'),
  'Main Course',
  'High-resolution aerial imagery',
  33.505, 33.520, -111.930, -111.905,  -- Adjust bounds
  33.5125, -111.9175,
  14, 20, 17,
  'your-golf-club/tiles',
  '{z}/{x}/{y}.png',
  256,
  'png',
  '© Your Golf Club'
);
```

### 6. Use the Component

```tsx
import MapboxGolfCourseMap from '@/components/MapboxGolfCourseMap';

function MyPage() {
  const golfClubId = 'your-club-uuid';
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  return (
    <MapboxGolfCourseMap
      golfClubId={golfClubId}
      mapboxAccessToken={mapboxToken}
    />
  );
}
```

## 📚 Documentation

- **[MAPBOX_SETUP_GUIDE.md](MAPBOX_SETUP_GUIDE.md)** - Complete setup instructions
- **[USAGE_EXAMPLE.md](USAGE_EXAMPLE.md)** - Code examples and patterns
- **[example-tileset-metadata.json](example-tileset-metadata.json)** - Sample metadata file

## 🗺️ How It Works

### Architecture

```
React Component (MapboxGolfCourseMap)
    ↓
Mapbox GL JS (renders base map + requests tiles)
    ↓
Supabase Edge Function (tile-proxy)
    ↓
Cloudflare R2 (stores PNG tiles in z/x/y structure)
```

### Data Flow

1. **Component mounts** → Fetches tileset metadata from Supabase
2. **Map initializes** → Loads Mapbox base style (satellite)
3. **Tiles requested** → Mapbox requests tiles via URL template
4. **Proxy intercepts** → Edge function gets tile from R2 with signed URL
5. **Tile returned** → Displayed as overlay on base map

### Metadata Storage

Tileset metadata is stored in `golf_course_tilesets` table:

```typescript
{
  name: "Main Course",
  bounds: { minLat, maxLat, minLon, maxLon },  // Geographic extent
  center: { lat, lon },                         // Initial view
  zoom: { min, max, default },                  // Zoom constraints
  r2_folder_path: "club-name/tiles",            // R2 path
  tile_url_pattern: "{z}/{x}/{y}.png"           // XYZ pattern
}
```

## 🔧 Configuration

### Mapbox Base Styles

Available options for `baseStyle` prop:

```tsx
// Satellite with streets (default)
baseStyle="mapbox://styles/mapbox/satellite-streets-v12"

// Pure satellite
baseStyle="mapbox://styles/mapbox/satellite-v9"

// Outdoors/topographic
baseStyle="mapbox://styles/mapbox/outdoors-v12"

// Custom style
baseStyle="mapbox://styles/your-username/your-style-id"
```

### Component Props

```typescript
interface MapboxGolfCourseMapProps {
  golfClubId: string;              // UUID of golf club
  mapboxAccessToken: string;       // Mapbox API token
  baseStyle?: string;              // Base map style URL
  showControls?: boolean;          // Show zoom/nav controls (default: true)
  className?: string;              // Additional CSS classes
}
```

## 📊 Database Schema

### `golf_course_tilesets` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `golf_club_id` | UUID | Foreign key to `golf_clubs` |
| `name` | TEXT | Tileset name |
| `min_lat`, `max_lat` | FLOAT | Latitude bounds |
| `min_lon`, `max_lon` | FLOAT | Longitude bounds |
| `center_lat`, `center_lon` | FLOAT | Center point |
| `min_zoom`, `max_zoom`, `default_zoom` | INT | Zoom levels |
| `r2_folder_path` | TEXT | R2 storage path |
| `tile_url_pattern` | TEXT | URL pattern (e.g., `{z}/{x}/{y}.png`) |
| `tile_size` | INT | Tile size in pixels (256 or 512) |
| `format` | TEXT | Tile format (png/jpg/webp) |
| `attribution` | TEXT | Copyright/attribution text |
| `is_active` | BOOLEAN | Active status |

## 🔐 Security

### Row-Level Security (RLS)

- **Admins**: Full CRUD access to all tilesets
- **Clients**: Read-only access to their club's tilesets
- **Public**: No access (requires authentication)

### Tile Access

- Tiles are served through Supabase Edge Function
- Edge function generates time-limited signed URLs for R2
- Optional: Add JWT verification to tile-proxy function

## 🎨 Tile Generation

### Using GDAL (Command Line)

```bash
# Convert GeoTIFF to XYZ tiles
gdal2tiles.py \
  --zoom=14-20 \
  --processes=4 \
  --xyz \
  input-image.tif \
  output-tiles/
```

### Using MapTiler Desktop (GUI)

1. Import imagery
2. Select "XYZ Tiles" output
3. Set zoom range (14-20)
4. Export

### Tile Requirements

- **Projection**: Web Mercator (EPSG:3857)
- **Structure**: `{z}/{x}/{y}.png`
- **Format**: PNG (transparency), JPEG (smaller), or WebP (best compression)
- **Size**: 256px or 512px (retina)

## 📤 Uploading Tiles

### Using AWS CLI

```bash
aws s3 sync ./tiles/ s3://map-stats-tiles-prod/club-name/tiles/ \
  --endpoint-url=https://account-id.r2.cloudflarestorage.com \
  --profile=r2
```

### Using Cloudflare Dashboard

1. Navigate to R2 bucket
2. Create folder: `{club-name}/tiles/`
3. Upload maintaining z/x/y structure

## 🐛 Troubleshooting

### Common Issues

**Map doesn't load**
- Check Mapbox token in `.env`
- Verify tileset exists in database
- Check browser console for errors

**Tiles don't appear**
- Verify tile-proxy function is deployed
- Check R2 credentials in Supabase secrets
- Verify tiles uploaded to correct path
- Check network tab for 404s

**Tiles in wrong location**
- Verify bounds (minLat < maxLat, minLon < maxLon)
- Check tile coordinates match Web Mercator
- Verify center point is within bounds

**Performance issues**
- Reduce max zoom level (18 instead of 20)
- Use smaller tile size (256 instead of 512)
- Enable tile caching in edge function
- Use WebP format for smaller files

## 🔄 API Reference

### TilesetService

```typescript
// Get tileset for golf club
await TilesetService.getTilesetForGolfClub(clubId)

// Create new tileset
await TilesetService.createTileset(clubId, metadata)

// Get TileJSON format
await TilesetService.getTileJSON(tileset)

// Import from JSON
await TilesetService.uploadTilesetMetadataFromJSON(clubId, json)
```

### R2Service

```typescript
// Get signed URL for reading
await R2Service.getGetUrl(key, expiresInSeconds)

// Upload file
await R2Service.uploadFile(key, file)

// List objects
await R2Service.list(prefix)
```

## 📝 Example Workflows

### Adding a New Golf Course with Tiles

1. **Create golf club** in database
2. **Generate tiles** from imagery (GDAL or MapTiler)
3. **Upload tiles** to R2 (`club-name/tiles/`)
4. **Add tileset metadata** to database
5. **Test map** in React component

### Updating Imagery for Existing Course

1. **Generate new tiles** from updated imagery
2. **Upload to R2** (same path or new folder)
3. **Either**: Update existing tileset OR create new tileset
4. **Clients see** updated imagery automatically

## 🌟 Advanced Features

### Multiple Tilesets per Course

Store different versions (seasons, years):

```sql
-- Summer 2024
INSERT INTO golf_course_tilesets (..., name) VALUES (..., 'Summer 2024');

-- Winter 2024
INSERT INTO golf_course_tilesets (..., name) VALUES (..., 'Winter 2024');
```

### Custom Markers/Annotations

Add points of interest:

```typescript
const marker = new mapboxgl.Marker()
  .setLngLat([lon, lat])
  .setPopup(new mapboxgl.Popup().setHTML('<h3>Hole 1</h3>'))
  .addTo(map);
```

### Dynamic Overlay Switching

Allow users to toggle between different tilesets.

## 📖 Resources

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [GDAL Utilities](https://gdal.org/programs/)
- [XYZ Tile Specification](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames)
- [Web Mercator Projection](https://epsg.io/3857)

## 🤝 Contributing

When adding new features:
1. Update TypeScript types in `supabase.ts`
2. Add RLS policies if adding new tables
3. Update documentation
4. Test with multiple golf clubs

## 📄 License

[Your License Here]

---

**Need help?** Check the troubleshooting section or review the complete setup guide.

