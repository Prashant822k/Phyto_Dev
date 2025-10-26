# Secure Tile Access - Usage Examples

## Overview
After completing Steps 1-3 (R2 private + RLS setup), use these examples to integrate secure tile access in your frontend.

---

## 1. Basic Tile Access

### Get a Single Tile URL
```typescript
import { TileAccessService } from '@/lib/tileAccessService';

// Get signed URL for a specific tile
const tileUrl = await TileAccessService.getSignedTileUrl(
  'pine-valley-golf-club',  // courseId
  15,                        // zoom level
  5242,                      // x coordinate
  12663                      // y coordinate
);

// Use the URL (valid for 1 hour by default)
const img = document.createElement('img');
img.src = tileUrl;
```

---

## 2. Mapbox Integration

### Add Secure Tileset to Mapbox Map
```typescript
import mapboxgl from 'mapbox-gl';
import { TileAccessService } from '@/lib/tileAccessService';

// Initialize map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-v9',
  center: [-74.955, 39.9875],
  zoom: 16,
});

map.on('load', async () => {
  const courseId = 'pine-valley-golf-club';
  
  // Get authenticated tile URL pattern
  const tileUrlPattern = await TileAccessService.getTileUrlPattern(courseId);
  
  // Add raster source with authenticated tiles
  map.addSource('golf-course-tiles', {
    type: 'raster',
    tiles: [tileUrlPattern],
    tileSize: 256,
    maxzoom: 20,
  });
  
  // Add layer
  map.addLayer({
    id: 'golf-course-overlay',
    type: 'raster',
    source: 'golf-course-tiles',
    paint: {
      'raster-opacity': 0.85,
    },
  });
});
```

---

## 3. Verify Access Before Loading

### Check if User Can Access Tileset
```typescript
import { TileAccessService } from '@/lib/tileAccessService';

async function loadCourseMap(courseId: string) {
  // Verify access first
  const hasAccess = await TileAccessService.verifyTilesetAccess(courseId);
  
  if (!hasAccess) {
    console.error('Access denied to this tileset');
    alert('You do not have permission to view this course');
    return;
  }
  
  // Load tileset metadata
  const metadata = await TileAccessService.getTilesetMetadata(courseId);
  
  if (!metadata) {
    console.error('Tileset not found');
    return;
  }
  
  console.log('Tileset bounds:', {
    minLat: metadata.min_lat,
    maxLat: metadata.max_lat,
    minLon: metadata.min_lon,
    maxLon: metadata.max_lon,
  });
  
  // Now safe to load tiles
  const tileUrlPattern = await TileAccessService.getTileUrlPattern(courseId);
  // ... add to map
}
```

---

## 4. React Component Example

### Secure Map Component
```typescript
import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { TileAccessService } from '@/lib/tileAccessService';

interface SecureMapProps {
  courseId: string;
}

export function SecureMap({ courseId }: SecureMapProps) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initMap = async () => {
      try {
        // Verify access
        const hasAccess = await TileAccessService.verifyTilesetAccess(courseId);
        if (!hasAccess) {
          setError('Access denied to this course');
          setLoading(false);
          return;
        }

        // Get metadata for bounds
        const metadata = await TileAccessService.getTilesetMetadata(courseId);
        if (!metadata) {
          setError('Course not found');
          setLoading(false);
          return;
        }

        // Initialize map
        const newMap = new mapboxgl.Map({
          container: 'map-container',
          style: 'mapbox://styles/mapbox/satellite-v9',
          center: [metadata.center_lon, metadata.center_lat],
          zoom: metadata.default_zoom,
        });

        newMap.on('load', async () => {
          // Get authenticated tile URL
          const tileUrlPattern = await TileAccessService.getTileUrlPattern(courseId);

          // Add secure tileset
          newMap.addSource('course-tiles', {
            type: 'raster',
            tiles: [tileUrlPattern],
            tileSize: metadata.tile_size || 256,
            maxzoom: metadata.max_zoom,
            minzoom: metadata.min_zoom,
          });

          newMap.addLayer({
            id: 'course-overlay',
            type: 'raster',
            source: 'course-tiles',
            paint: { 'raster-opacity': 0.85 },
          });

          setLoading(false);
        });

        setMap(newMap);
      } catch (err) {
        console.error('Map initialization error:', err);
        setError('Failed to load map');
        setLoading(false);
      }
    };

    initMap();

    return () => {
      map?.remove();
    };
  }, [courseId]);

  if (loading) return <div>Loading secure map...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div id="map-container" style={{ width: '100%', height: '600px' }} />;
}
```

---

## 5. Token Refresh Handling

### Auto-refresh Expired Tokens
```typescript
import { supabase } from '@/lib/supabase';
import { TileAccessService } from '@/lib/tileAccessService';

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED' && session) {
    console.log('Auth token refreshed, updating tile URLs...');
    
    // Re-fetch tile URL pattern with new token
    const courseId = 'your-course-id';
    const newTileUrlPattern = await TileAccessService.getTileUrlPattern(courseId);
    
    // Update map source
    if (map && map.getSource('course-tiles')) {
      map.removeLayer('course-overlay');
      map.removeSource('course-tiles');
      
      map.addSource('course-tiles', {
        type: 'raster',
        tiles: [newTileUrlPattern],
        tileSize: 256,
      });
      
      map.addLayer({
        id: 'course-overlay',
        type: 'raster',
        source: 'course-tiles',
      });
    }
  }
});
```

---

## 6. Error Handling

### Handle Access Denied
```typescript
try {
  const tileUrl = await TileAccessService.getSignedTileUrl(courseId, z, x, y);
  // Use tile URL
} catch (error) {
  if (error.message.includes('Access denied')) {
    // User doesn't have permission
    console.error('You do not have access to this course');
    // Redirect or show error message
  } else if (error.message.includes('not found')) {
    // Tileset doesn't exist
    console.error('Course tileset not found');
  } else {
    // Other error
    console.error('Failed to load tile:', error);
  }
}
```

---

## Security Features

✅ **Authentication Required** - All tile requests require valid JWT token
✅ **Club-Level Authorization** - Users can only access their club's tiles
✅ **Admin Override** - Admins can access all tilesets
✅ **Time-Limited URLs** - Signed URLs expire after 1 hour
✅ **RLS Enforcement** - Database-level access control
✅ **Private R2** - No direct bucket access

---

## Performance Notes

- **Caching**: Tiles are cached for 1 hour in browser
- **Token Refresh**: Tokens refresh automatically every 50 minutes
- **Fallback**: Missing tiles return transparent 1x1 PNG (no errors)
- **Parallel Loading**: Mapbox loads tiles in parallel automatically

---

## Deployment

Run the deployment script:
```bash
./deploy-secure-functions.bat
```

Or manually:
```bash
npx supabase functions deploy r2-sign
npx supabase functions deploy tile-proxy
```

---

## Testing

See `SECURITY_SETUP_COMPLETE.md` Step 7 for verification commands.
