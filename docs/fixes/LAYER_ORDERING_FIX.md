# Layer Ordering & Swipe Fixes

## Issues Fixed

### Issue 1: Raster Layers Visible in Right Map When All Layers Deselected
**Problem**: When no layers were selected for swipe, the right map still showed raster layers instead of being empty.

**Root Cause**: The `DualMapSwipe` component only removed layers when `layerId` was provided. When `layerId` was null (no selection), it didn't hide anything.

**Solution**: Added logic to hide all raster, health map, and vector layers on the right map when no swipe layer is selected.

**Code Change** (`DualMapSwipe.tsx`):
```typescript
// If no layerId, hide all raster/health/vector layers on right map
if (!layerId) {
  console.log('⚠️ No swipe layer selected, hiding all layers on right map');
  const style = rightMap.getStyle();
  if (style && style.layers) {
    style.layers.forEach((layer: any) => {
      // Hide tileset, health map, and vector layers
      if (layer.id.startsWith('tileset-layer-') || 
          layer.id.startsWith('health-map-layer-') ||
          layer.id.startsWith('vector-layer-')) {
        try {
          rightMap.setLayoutProperty(layer.id, 'visibility', 'none');
        } catch (e) {
          console.warn(`Could not hide layer ${layer.id}:`, e);
        }
      }
    });
  }
  return;
}
```

**Result**: ✅ Right map now shows only base satellite when no layers are selected.

---

### Issue 2: Vector Layers Appearing Beneath Raster Layers
**Problem**: Vector layers were being added beneath raster and health map layers, making them hard to see or completely hidden.

**Root Cause**: Layers are added to the map in the order they're loaded. Vector layers were being added after raster layers but not moved to the top.

**Solution**: 
1. **On Initial Load**: Move vector layers to top immediately after adding them
2. **On Toggle**: Move vector layers to top whenever they become visible

**Code Changes** (`MapboxGolfCourseMap.tsx`):

**1. After adding vector layer:**
```typescript
// Move vector layers to top (above all raster and health map layers)
try {
  map.current!.moveLayer(layerId);
  if (map.current!.getLayer(`${layerId}-outline`)) {
    map.current!.moveLayer(`${layerId}-outline`);
  }
  console.log(`      📌 Moved ${layer.name} to top`);
} catch (e) {
  console.warn(`Could not move layer ${layerId} to top:`, e);
}
```

**2. In visibility effect:**
```typescript
// Always move vector layers to top when visible
if (isVisible) {
  try {
    map.current!.moveLayer(layerId);
    if (map.current!.getLayer(outlineLayerId)) {
      map.current!.moveLayer(outlineLayerId);
    }
    console.log(`📌 Moved ${layer.name} to top`);
  } catch (e) {
    console.warn('Could not move layer to top:', e);
  }
}
```

**Result**: ✅ Vector layers now always appear on top of all raster and health map layers.

---

## Layer Z-Index Order (Bottom to Top)

```
1. Base Satellite Map (Mapbox)
2. Raster Layers (PNG tiles)
   - tileset-layer-{id1}
   - tileset-layer-{id2}
3. Health Map Layers (stacked)
   - health-map-layer-{id1} (bottom)
   - health-map-layer-{id2} (middle)
   - health-map-layer-{id3} (top)
4. Vector Layers (always on top)
   - vector-layer-{id1}
   - vector-layer-{id1}-outline
   - vector-layer-{id2}
   - vector-layer-{id2}-outline
```

---

## Testing Scenarios

### Test 1: No Layers Selected + Swipe
1. Deselect all health maps and vector layers
2. Enable swipe mode
3. **Expected**: Right map shows only base satellite (no raster)
4. **Result**: ✅ PASS

### Test 2: Vector Layer Above Raster
1. Load raster layer
2. Toggle vector layer ON
3. **Expected**: Vector appears on top of raster
4. **Result**: ✅ PASS

### Test 3: Vector Layer Above Health Map
1. Load health map
2. Toggle vector layer ON
3. **Expected**: Vector appears on top of health map
4. **Result**: ✅ PASS

### Test 4: Vector Toggle Maintains Top Position
1. Load raster + health map
2. Toggle vector ON
3. Toggle vector OFF
4. Toggle vector ON again
5. **Expected**: Vector returns to top position
6. **Result**: ✅ PASS

### Test 5: Multiple Vectors Stay on Top
1. Load raster + health map
2. Toggle multiple vector layers ON
3. **Expected**: All vectors appear above raster/health
4. **Result**: ✅ PASS

---

## Files Modified

1. **`src/components/DualMapSwipe.tsx`**
   - Added logic to hide all layers when `layerId` is null
   - Prevents raster layers from showing in right map when nothing selected

2. **`src/components/MapboxGolfCourseMap.tsx`**
   - Added `moveLayer()` call after adding vector layers
   - Updated visibility effect to always move vectors to top
   - Removed old `vectorLayersAboveHealth` logic (no longer needed)

---

## Benefits

✅ **Correct Layer Ordering**: Vectors always on top, as expected
✅ **Clean Swipe**: Right map shows only base when no layers selected
✅ **Consistent Behavior**: Toggling vectors maintains top position
✅ **Better Visibility**: Vector layers never hidden beneath other layers
✅ **Simplified Logic**: Removed complex conditional ordering code

---

## Status: COMPLETE ✅

Both issues have been fixed and tested:
1. ✅ Right map hides all layers when nothing selected
2. ✅ Vector layers always appear on top of all other layers
