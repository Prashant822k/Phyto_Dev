# Final Layer Loading & Visibility Fix

## Requirements
1. **Raster layers**: Load automatically when page opens (toggle ON by default)
2. **Vector layers**: Do NOT load automatically - only when user toggles them ON
3. **Vector deselection**: Must work on both left AND right maps
4. **Raster deselection**: Must expose layer beneath

## Changes Made

### 1. Raster Layers Auto-Load
**File**: `MapboxGolfCourseMap.tsx`

```typescript
// Changed from false to true
const [loadRasterLayers, setLoadRasterLayers] = useState(true); // Auto-load raster layers
```

**Result**: ✅ Raster layers load automatically when page opens

### 2. Vector Layers Load On-Demand
**File**: `MapboxGolfCourseMap.tsx`

**Before**: Vector layers loaded automatically for all layers in database
**After**: Vector layers only load when added to `visibleVectorLayers` Set

```typescript
// Load only visible vector layers
visibleVectorLayers.forEach(async (layerId) => {
  const layer = vectorLayers.find(l => l.id === layerId);
  if (!layer) return;

  // Skip if already loaded
  if (map.current!.getSource(sourceId)) {
    return;
  }

  // Load GeoJSON and add to map...
});
```

**Trigger**: When user clicks checkbox to toggle vector layer ON

**Result**: ✅ Vector layers only load when explicitly toggled

### 3. Vector Layer Visibility Sync (Both Maps)
**File**: `DualMapSwipe.tsx`

**Fixed GeoJSON Source Copying**:
```typescript
// Initial map creation - copy GeoJSON data properly
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

**Dynamic Layer Sync**:
```typescript
// Sync loop detects GeoJSON sources
if ((mainSource as any).type === 'geojson') {
  const geojsonData = (mainSource as any)._data;
  rightMap.addSource(sourceId, {
    type: 'geojson',
    data: geojsonData
  });
}
```

**Visibility Sync**:
```typescript
// Sync vector layer visibility
mainStyle.layers.forEach((layer: any) => {
  if (layer.id.startsWith('vector-layer-')) {
    const visibility = layer.layout?.visibility || 'visible';
    if (rightMap.getLayer(layer.id)) {
      rightMap.setLayoutProperty(layer.id, 'visibility', visibility);
    }
  }
});
```

**Orphaned Layer Removal**:
```typescript
// Remove layers from right map that don't exist in main map
rightStyle.layers.forEach((layer: any) => {
  if (!mainLayerIds.has(layer.id)) {
    rightMap.removeLayer(layer.id);
  }
});
```

**Result**: ✅ Vector layers sync visibility on both maps, including deselection

### 4. Raster Layer Deselection
**File**: `MapboxGolfCourseMap.tsx` + `DualMapSwipe.tsx`

**Main Map**: Already working - layers removed when deselected
**Right Map**: Sync loop removes orphaned layers

**Result**: ✅ Raster deselection works, exposes layer beneath

## User Flow

### Initial Page Load
1. Page opens
2. Raster layers load automatically (toggle ON)
3. Vector layers metadata loaded but NOT displayed
4. Map shows: Base satellite + Raster layers

### Toggle Vector Layer ON
1. User clicks vector layer checkbox
2. Layer ID added to `visibleVectorLayers` Set
3. useEffect triggers, loads GeoJSON
4. Layer added to main map
5. Sync loop copies to right map (if swipe active)
6. Vector appears on both sides

### Toggle Vector Layer OFF
1. User unchecks vector layer checkbox
2. Layer ID removed from `visibleVectorLayers` Set
3. Visibility effect sets layer to 'none'
4. Sync loop updates right map visibility
5. Vector disappears from both sides

### Deselect Raster Layer
1. User deselects raster from dropdown
2. Layer removed from `selectedLayers` array
3. Layer management effect removes from main map
4. Sync loop detects missing layer
5. Removes from right map
6. Layer beneath exposed

## Layer Loading Summary

| Layer Type | Auto-Load? | Load Trigger | Visibility Control |
|------------|------------|--------------|-------------------|
| Raster | ✅ Yes | Page load | Dropdown selection |
| Health Map | ❌ No | Toggle ON | Checkbox selection |
| Vector | ❌ No | Toggle ON | Checkbox selection |

## Sync Behavior

| Action | Main Map | Right Map | Sync Method |
|--------|----------|-----------|-------------|
| Vector toggle ON | Loads & shows | Loads & shows | GeoJSON copy + add layer |
| Vector toggle OFF | Hides | Hides | Visibility sync |
| Raster deselect | Removes | Removes | Orphan removal |
| Health deselect | Removes | Removes | Orphan removal |

## Files Modified

1. **`src/components/MapboxGolfCourseMap.tsx`**
   - Changed `loadRasterLayers` default to `true`
   - Rewrote vector layer loading to be on-demand
   - Dependency: `visibleVectorLayers` triggers loading

2. **`src/components/DualMapSwipe.tsx`**
   - Fixed GeoJSON source copying on map creation
   - Enhanced sync loop for GeoJSON sources
   - Added visibility sync for vectors
   - Added orphaned layer removal

## Status

✅ **Raster layers**: Auto-load on page open
✅ **Vector layers**: Load only when toggled ON
✅ **Vector visibility**: Synced on both maps
✅ **Vector deselection**: Works on both maps
✅ **Raster deselection**: Exposes layer beneath
✅ **Clean state**: No orphaned layers

All requirements implemented and working!
