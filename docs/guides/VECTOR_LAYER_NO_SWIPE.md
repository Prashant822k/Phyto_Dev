# Vector Layers: No Swipe Mode

## Changes Made

### Requirement
1. **Vector layers should NOT be swipeable** - they should always be fully visible on both left and right sides
2. **When vector + raster only** - right map should show base satellite, not raster layer

### Implementation

#### 1. Removed Vector Layers from Swipe Priority
**File**: `MapboxGolfCourseMap.tsx`

**Before**:
```typescript
// Priority: Health Maps > Vector Layers > Raster Layers
if (showHealthMaps && selectedHealthMapIds.length > 0) {
  // ... health map logic
} else if (visibleVectorLayers.size > 0) {
  // Vector layer as swipe target ❌
  const firstVisibleVector = Array.from(visibleVectorLayers)[0];
  setSwipeLayerId(`vector-layer-${firstVisibleVector}`);
} else if (rasterLayersLoaded && selectedLayers.length > 0) {
  // ... raster logic
}
```

**After**:
```typescript
// Priority: Health Maps > Raster Layers (Vector layers are NOT swipeable)
if (showHealthMaps && selectedHealthMapIds.length > 0) {
  // ... health map logic
} else if (rasterLayersLoaded && selectedLayers.length > 0) {
  // Only use raster for swipe if no health maps ✅
  setSwipeLayerId(`tileset-layer-${selectedLayers[0]}`);
} else {
  setSwipeLayerId(null);
}
```

**Result**: Vector layers are never set as swipe target.

---

#### 2. Updated Layer Beneath Logic
**File**: `MapboxGolfCourseMap.tsx`

**Before**:
```typescript
// If top is health map and only one selected, show first vector or raster
if (topLayerId.startsWith('health-map-layer-')) {
  if (visibleVectorLayers.size > 0) {
    return `vector-layer-${firstVisibleVector}`; // ❌ Shows vector on right
  }
  if (selectedLayers.length > 0) {
    return `tileset-layer-${selectedLayers[0]}`;
  }
}
```

**After**:
```typescript
// If top is health map and only one selected, show raster beneath
// (Vector layers are not swipeable, so skip them)
if (topLayerId.startsWith('health-map-layer-')) {
  if (selectedLayers.length > 0) {
    return `tileset-layer-${selectedLayers[0]}`; // ✅ Shows raster on right
  }
}

// For raster with only one layer, show base map (return null)
return null; // ✅ Shows base satellite
```

**Result**: 
- Health map swipe shows raster beneath (not vector)
- Single raster swipe shows base satellite beneath

---

#### 3. Keep Vector Layers on Both Maps
**File**: `DualMapSwipe.tsx`

**Before**:
```typescript
// Hide tileset, health map, and vector layers ❌
if (layer.id.startsWith('tileset-layer-') || 
    layer.id.startsWith('health-map-layer-') ||
    layer.id.startsWith('vector-layer-')) {
  rightMap.setLayoutProperty(layer.id, 'visibility', 'none');
}

// Remove layer from right map (including vectors) ❌
if (rightMap.getLayer(layerId)) {
  rightMap.removeLayer(layerId);
}
```

**After**:
```typescript
// Hide tileset and health map layers only (NOT vector layers) ✅
if (layer.id.startsWith('tileset-layer-') || 
    layer.id.startsWith('health-map-layer-')) {
  rightMap.setLayoutProperty(layer.id, 'visibility', 'none');
}

// Vector layers should NEVER be removed (they stay on both sides) ✅
if (rightMap.getLayer(layerId) && !layerId.startsWith('vector-layer-')) {
  rightMap.removeLayer(layerId);
} else if (layerId.startsWith('vector-layer-')) {
  console.log('✅ Vector layer kept visible on both sides');
}
```

**Result**: Vector layers remain visible on both left and right maps during swipe.

---

## Behavior Summary

### Scenario 1: Vector + Raster Only
**Before**: 
- Swipe target: Vector layer
- Left: Vector + Raster
- Right: Raster only

**After**: 
- Swipe target: Raster layer
- Left: Vector + Raster
- Right: Vector + Base Satellite ✅

### Scenario 2: Vector + Health Map
**Before**:
- Swipe target: Vector layer
- Left: Vector + Health
- Right: Health only

**After**:
- Swipe target: Health map
- Left: Vector + Health
- Right: Vector + Raster ✅

### Scenario 3: Vector + Health + Raster
**Before**:
- Swipe target: Vector layer
- Left: Vector + Health + Raster
- Right: Health + Raster

**After**:
- Swipe target: Health map
- Left: Vector + Health + Raster
- Right: Vector + Raster ✅

### Scenario 4: Vector Only (No Swipe)
**Before**:
- Swipe target: Vector layer
- Swipe enabled

**After**:
- Swipe target: None
- Swipe disabled (no swipeable layers) ✅

---

## Layer Visibility Matrix

| Layer Type | Left Map | Right Map | Swipeable? |
|------------|----------|-----------|------------|
| Base Satellite | ✅ Always | ✅ Always | ❌ No |
| Raster | ✅ Yes | ⚠️ Hidden if swipe target | ✅ Yes |
| Health Map | ✅ Yes | ⚠️ Hidden if swipe target | ✅ Yes |
| Vector | ✅ Always | ✅ Always | ❌ No |

---

## Swipe Priority (Updated)

1. **Health Maps** (if any selected) → Swipeable
2. **Raster Layers** (if no health maps) → Swipeable
3. **Vector Layers** → NOT swipeable (always visible on both sides)

---

## Testing Scenarios

### Test 1: Vector + Single Raster
1. Load one raster layer
2. Toggle vector layer ON
3. Enable swipe mode
4. **Expected**: 
   - Left: Vector + Raster
   - Right: Vector + Base Satellite ✅
   - Slider compares raster vs base

### Test 2: Vector + Multiple Rasters
1. Load two raster layers
2. Toggle vector layer ON
3. Enable swipe mode
4. **Expected**:
   - Left: Vector + Raster1 + Raster2
   - Right: Vector + Raster2 ✅
   - Slider compares raster1 vs raster2

### Test 3: Vector + Health Map
1. Load health map
2. Toggle vector layer ON
3. Enable swipe mode
4. **Expected**:
   - Left: Vector + Health
   - Right: Vector + Raster ✅
   - Slider compares health vs raster

### Test 4: Vector Only
1. Toggle vector layer ON (no other layers)
2. Try to enable swipe mode
3. **Expected**:
   - Swipe disabled or shows base on both sides ✅
   - Vector visible on both sides

---

## Files Modified

1. **`src/components/MapboxGolfCourseMap.tsx`**
   - Removed vector layers from swipe priority
   - Updated `getLayerBeneath()` to skip vectors
   - Updated dependency array (removed `visibleVectorLayers`)

2. **`src/components/DualMapSwipe.tsx`**
   - Don't hide vector layers when no swipe target
   - Don't remove vector layers from right map
   - Keep vectors visible on both sides always

---

## Benefits

✅ **Consistent Vector Display**: Vectors always visible on both sides
✅ **Correct Swipe Behavior**: Only health maps and rasters are swipeable
✅ **Proper Right Map**: Shows base satellite when only raster + vector
✅ **Simplified Logic**: Vectors treated as overlay, not swipe target
✅ **Better UX**: Users can compare layers while seeing vector overlays

---

## Status: COMPLETE ✅

Vector layers are now:
1. ✅ Always visible on both left and right maps
2. ✅ Never used as swipe targets
3. ✅ Not removed from right map during swipe
4. ✅ Properly displayed above all other layers
