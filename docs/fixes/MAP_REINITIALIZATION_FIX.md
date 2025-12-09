# Map Reinitialization Bug Fix

## Problem
When loading health maps after raster layers were loaded, the map would reinitialize, causing:
1. All loaded layers to disappear
2. Map to refresh/reload completely
3. Unable to load any layers afterward

## Root Cause
The issue was in the map initialization effect's dependency array and state management:

### Issue 1: `containerReady` State Toggle
```typescript
// OLD CODE - PROBLEMATIC
const handleMapLoad = () => {
  console.log('✅ Map loaded, will load health maps now');
  setContainerReady(prev => !prev); // ❌ This triggers map reinit!
};
```

The `containerReady` state was being toggled in the health map effect, and since it was in the map initialization effect's dependency array, it caused the map to reinitialize.

### Issue 2: No Guard Against Reinitialization
```typescript
// OLD CODE - PROBLEMATIC
useEffect(() => {
  if (!mapContainer.current || tilesets.length === 0 || map.current) {
    return;
  }
  // Initialize map...
}, [tilesets, baseStyle, showControls, containerReady]); // ❌ containerReady causes reinit
```

## Solution

### Fix 1: Use Ref Instead of State for Initialization Tracking
```typescript
// NEW CODE - FIXED
const mapInitializedRef = useRef(false); // Track initialization with ref

useEffect(() => {
  if (!mapContainer.current || tilesets.length === 0 || map.current || mapInitializedRef.current) {
    console.log('⏸️ Skipping map init');
    return;
  }
  
  mapInitializedRef.current = true; // Mark as initialized
  
  // Initialize map...
  
  return () => {
    if (map.current) {
      map.current.remove();
      map.current = null;
      mapInitializedRef.current = false; // Reset on cleanup
    }
  };
}, [tilesets, baseStyle, showControls]); // ✅ Removed containerReady
```

### Fix 2: Don't Toggle State for Retries
```typescript
// NEW CODE - FIXED
const handleMapLoad = () => {
  console.log('✅ Map loaded, will load health maps now');
  setHealthMapLoaded(false); // ✅ Use existing flag instead
};
```

### Fix 3: Only Wait for PNG Tiles if They're Actually Loaded
```typescript
// NEW CODE - FIXED
// Only wait for PNG tiles if raster layers are actually loaded
if (rasterLayersLoaded) {
  const pngLayerId = selectedLayers.length > 0 ? `tileset-layer-${selectedLayers[0]}` : null;
  if (pngLayerId && !map.current.getLayer(pngLayerId)) {
    // Wait for tiles...
  }
}
```

## Changes Made

### 1. Added `mapInitializedRef`
```typescript
const mapInitializedRef = useRef(false); // Track if map has been initialized
```

### 2. Updated Map Initialization Effect
- Added `mapInitializedRef.current` check to prevent reinit
- Removed `containerReady` from dependency array
- Set `mapInitializedRef.current = true` after initialization
- Reset `mapInitializedRef.current = false` on cleanup

### 3. Fixed Health Map Loading Logic
- Changed retry mechanism to use `setHealthMapLoaded(false)` instead of toggling `containerReady`
- Only wait for PNG tiles if `rasterLayersLoaded` is true
- Added `rasterLayersLoaded` to health map effect dependencies

## Testing Scenarios

### ✅ Scenario 1: Load Raster → Load Health
1. Toggle "Raster Layers" ON
2. Wait for raster tiles to load
3. Toggle "Health Maps" ON
4. **Expected**: Health maps load without map reinitialization
5. **Result**: ✅ Works correctly

### ✅ Scenario 2: Load Health Without Raster
1. Toggle "Health Maps" ON (without loading raster first)
2. **Expected**: Health maps load directly
3. **Result**: ✅ Works correctly

### ✅ Scenario 3: Toggle Health On/Off Multiple Times
1. Toggle "Health Maps" ON
2. Toggle "Health Maps" OFF
3. Toggle "Health Maps" ON again
4. **Expected**: No map reinitialization
5. **Result**: ✅ Works correctly

### ✅ Scenario 4: Load All Layer Types
1. Toggle "Raster Layers" ON
2. Toggle "Health Maps" ON
3. Open "Manage Layers" and toggle vector layers
4. **Expected**: All layers coexist without issues
5. **Result**: ✅ Works correctly

## Key Takeaways

1. **Use Refs for Initialization Flags**: State changes trigger re-renders and can cause unwanted effects
2. **Minimize Dependencies**: Only include truly necessary dependencies in effect arrays
3. **Avoid State Toggles for Retries**: Use existing flags or dedicated retry mechanisms
4. **Guard Against Reinitialization**: Always check if something is already initialized before initializing again

## Files Modified
- ✅ `src/components/MapboxGolfCourseMap.tsx`
