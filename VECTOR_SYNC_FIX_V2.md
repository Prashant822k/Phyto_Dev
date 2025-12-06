# Vector Layer Sync Fix V2

## Issue
Vector layers were NOT visible on the right side of the swipe, only on the left side.

## Root Cause
GeoJSON sources (used by vector layers) don't serialize properly with `JSON.stringify()`. When the right map was created with a deep copy of the style, the GeoJSON data was lost, so vector layers appeared as empty on the right map.

## Solution

### 1. Fix Initial Style Copy
When creating the right map, properly copy GeoJSON sources:

```typescript
// Get a deep copy of the style to avoid sharing references
const currentStyle = map.getStyle();
const styleCopy = JSON.parse(JSON.stringify(currentStyle));

// Copy GeoJSON sources properly (they don't serialize well)
if (currentStyle.sources) {
  Object.keys(currentStyle.sources).forEach(sourceId => {
    const source = map.getSource(sourceId);
    if (source && (source as any).type === 'geojson') {
      const geojsonData = (source as any)._data;
      if (geojsonData && styleCopy.sources[sourceId]) {
        styleCopy.sources[sourceId].data = geojsonData;
      }
    }
  });
}
```

### 2. Fix Dynamic Layer Addition
When syncing new layers, handle GeoJSON sources differently:

```typescript
if (!rightMap.getSource(sourceId)) {
  const mainSource = map.getSource(sourceId);
  
  if (mainSource) {
    // For GeoJSON sources (vector layers), get the data directly
    if ((mainSource as any).type === 'geojson') {
      const geojsonData = (mainSource as any)._data;
      rightMap.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData
      });
      console.log(`➕ Added GeoJSON source ${sourceId} to right map`);
    } else {
      // For raster sources, serialize normally
      const sourceData = (mainSource as any).serialize();
      rightMap.addSource(sourceId, sourceData);
      console.log(`➕ Added raster source ${sourceId} to right map`);
    }
  }
}
```

### 3. Ensure Vector Layers on Top
After adding vector layers to right map, move them to top:

```typescript
// Ensure vector layers are on top
if (layer.id.startsWith('vector-layer-')) {
  try {
    rightMap.moveLayer(layer.id);
    console.log(`📌 Moved ${layer.id} to top on right map`);
  } catch (e) {
    // Ignore move errors
  }
}
```

## Result
✅ Vector layers now visible on BOTH left and right sides
✅ GeoJSON data properly copied
✅ Dynamic vector layer toggling works
✅ Vector layers stay on top

## Files Modified
- `src/components/DualMapSwipe.tsx`
  - Fixed initial style copy for GeoJSON sources
  - Fixed dynamic layer addition for GeoJSON sources
  - Added z-index management for vector layers
