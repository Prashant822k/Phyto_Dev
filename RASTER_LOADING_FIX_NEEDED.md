# Raster Loading Fix Needed

## Problem
Raster layers are NOT loading on the main map (MapboxGolfCourseMap) but they ARE loading correctly on the comparison maps (VectorLayerComparison).

## Console Evidence
```
MapboxGolfCourseMap.tsx:342 ❌ Map not initialized or raster layers not loaded yet
VectorLayerComparison.tsx:207 ✅ PNG tiles loaded on comparison map: test21
```

## Working Code (from VectorLayerComparison.tsx)

```typescript
const loadPNGTilesOnMap = async (map: mapboxgl.Map) => {
  try {
    // Get the most recent tileset for this golf club
    const { data: tileset, error: tilesetError } = await supabase
      .from('golf_course_tilesets')
      .select('*')
      .eq('golf_club_id', golfClubId)
      .eq('is_active', true)
      .order('flight_datetime', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tilesetError || !tileset) {
      console.error('❌ No tileset found for comparison maps');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ No active session for tile loading');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const sourceId = `tileset-source-${tileset.id}`;
    const layerId = `tileset-layer-${tileset.id}`;

    // Remove existing if present
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    // Add PNG tiles source
    const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${tileset.id}&z={z}&x={x}&y={y}&token=${session.access_token}`;

    map.addSource(sourceId, {
      type: 'raster',
      tiles: [tileUrlTemplate],
      tileSize: tileset.tile_size || 256,
      minzoom: tileset.min_zoom,
      maxzoom: tileset.max_zoom,
      bounds: [
        tileset.min_lon,
        tileset.min_lat,
        tileset.max_lon,
        tileset.max_lat
      ]
    });

    map.addLayer({
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-opacity': 0.85
      }
    });

    console.log('✅ PNG tiles loaded on comparison map:', tileset.name);
  } catch (error) {
    console.error('❌ Failed to load PNG tiles on comparison map:', error);
  }
};
```

## What Needs to Happen

1. **Replace the broken raster loading effect** in MapboxGolfCourseMap.tsx
2. **Use the exact same logic** as VectorLayerComparison
3. **Load most recent tileset automatically** on page load
4. **Set selectedLayers** to the loaded tileset ID
5. **Display the tileset date** in the UI

## Required Effect

```typescript
// Load most recent raster layer automatically on page load
useEffect(() => {
  if (!map.current || rasterLayersLoaded || !mapInitializedRef.current) {
    return;
  }

  const loadMostRecentRaster = async () => {
    if (!map.current!.loaded() || !map.current!.isStyleLoaded()) {
      console.log('⏳ Waiting for map to load before loading raster...');
      map.current!.once('idle', loadMostRecentRaster);
      return;
    }

    try {
      console.log('🔄 Loading most recent raster tileset...');

      // Get the most recent tileset for this golf club
      const { data: tileset, error: tilesetError } = await supabase
        .from('golf_course_tilesets')
        .select('*')
        .eq('golf_club_id', golfClubId)
        .eq('is_active', true)
        .order('flight_datetime', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (tilesetError || !tileset) {
        console.error('❌ No tileset found');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session for tile loading');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const sourceId = `tileset-source-${tileset.id}`;
      const layerId = `tileset-layer-${tileset.id}`;
      const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${tileset.id}&z={z}&x={x}&y={y}&token=${session.access_token}`;

      // Remove existing if present
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }

      // Add PNG tiles source
      map.current!.addSource(sourceId, {
        type: 'raster',
        tiles: [tileUrlTemplate],
        tileSize: tileset.tile_size || 256,
        minzoom: tileset.min_zoom,
        maxzoom: tileset.max_zoom,
        bounds: [
          tileset.min_lon,
          tileset.min_lat,
          tileset.max_lon,
          tileset.max_lat
        ]
      });

      map.current!.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': 0.85
        }
      });

      // Set as selected layer
      setSelectedLayers([tileset.id]);
      setRasterLayersLoaded(true);

      console.log('✅ Loaded most recent raster:', tileset.name, tileset.flight_date || tileset.created_at);
    } catch (error) {
      console.error('❌ Failed to load raster:', error);
    }
  };

  loadMostRecentRaster();
}, [golfClubId, mapInitializedRef.current]);
```

## File Status
The MapboxGolfCourseMap.tsx file is currently CORRUPTED with duplicate code and syntax errors.

## Action Required
The file needs to be manually fixed or restored from a backup before the raster loading logic can be properly implemented.

## Key Points
1. Use the EXACT same approach as VectorLayerComparison
2. Load most recent tileset automatically
3. Don't overcomplicate with multiple effects
4. Keep it simple and working
