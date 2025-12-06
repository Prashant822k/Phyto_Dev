# Blank Map Container Fix

## Problem
After the previous fix for map reinitialization, the main map was showing as a blank white container and not initializing at all.

## Root Cause
When we removed `containerReady` from the map initialization effect's dependency array to prevent reinitialization, we inadvertently broke the initial map creation. The effect wasn't being triggered when the container became ready.

### The Issue
```typescript
// PROBLEMATIC CODE
useEffect(() => {
  if (!mapContainer.current || tilesets.length === 0 || map.current || mapInitializedRef.current) {
    return;
  }
  // Initialize map...
}, [tilesets, baseStyle, showControls]); // ❌ Missing containerReady - effect doesn't run when container mounts
```

The map container ref callback sets `containerReady` to `true`:
```typescript
const setMapContainerRef = (node: HTMLDivElement | null) => {
  if (node) {
    mapContainer.current = node;
    setContainerReady(true); // This state change needs to trigger the effect
  }
};
```

But without `containerReady` in the dependencies, the effect never runs when the container mounts.

## Solution

### The Fix: Use Both `containerReady` AND `mapInitializedRef`
```typescript
useEffect(() => {
  // Skip if already initialized (using ref to prevent re-init)
  if (mapInitializedRef.current) {
    console.log('⏸️ Map already initialized, skipping');
    return; // ✅ Early return prevents re-initialization
  }

  if (!mapContainer.current || tilesets.length === 0 || map.current) {
    console.log('⏸️ Skipping map init - waiting for container or tilesets');
    return;
  }

  // Initialize map...
  mapInitializedRef.current = true; // Mark as initialized
  
}, [tilesets, baseStyle, showControls, containerReady]); // ✅ containerReady triggers effect
```

### Key Points:
1. **`containerReady` in dependencies** - Allows effect to run when container mounts
2. **`mapInitializedRef.current` check FIRST** - Prevents re-initialization on subsequent renders
3. **Ref persists across renders** - Unlike state, changing a ref doesn't trigger re-renders

## Additional Protections

### 1. Vector Layer Loading Protection
```typescript
useEffect(() => {
  if (!map.current || vectorLayers.length === 0 || vectorLayersLoadedRef.current || !mapInitializedRef.current) {
    return; // ✅ Don't load vectors until map is initialized
  }
  // Load vector layers...
}, [vectorLayers, golfClubId]);
```

### 2. Vector Layer Visibility Protection
```typescript
useEffect(() => {
  if (!map.current || !map.current.loaded() || !mapInitializedRef.current) return;
  // ✅ Don't manage visibility until map is initialized
  
  vectorLayers.forEach(layer => {
    // Toggle layer visibility...
  });
}, [visibleVectorLayers, vectorLayers, vectorLayersAboveHealth, showHealthMaps]);
```

## How It Works

### Initialization Flow:
1. **Component mounts** → `mapContainer.current` is `null`
2. **Container ref callback fires** → `setMapContainerRef` sets `containerReady = true`
3. **Effect runs** (triggered by `containerReady` change)
   - Check: `mapInitializedRef.current` is `false` ✅
   - Check: `mapContainer.current` exists ✅
   - Check: `tilesets.length > 0` ✅
   - **Initialize map** and set `mapInitializedRef.current = true`

### Subsequent Renders (e.g., when health maps toggle):
1. **State changes** → Component re-renders
2. **Effect runs** (triggered by dependency change)
   - Check: `mapInitializedRef.current` is `true` ❌
   - **Early return** - No reinitialization!

## Testing Scenarios

### ✅ Scenario 1: Initial Load
1. Open dashboard
2. **Expected**: Main map initializes and shows satellite view
3. **Result**: ✅ Works correctly

### ✅ Scenario 2: Toggle Health Maps
1. Main map loaded
2. Toggle "Health Maps" ON
3. **Expected**: Health maps load without map reinitialization
4. **Result**: ✅ Works correctly

### ✅ Scenario 3: Toggle Vector Layers
1. Main map loaded
2. Open "Manage Layers"
3. Toggle vector layers on/off
4. **Expected**: Vector layers toggle without map reinitialization
5. **Result**: ✅ Works correctly

### ✅ Scenario 4: Multiple Toggles
1. Toggle raster layers ON
2. Toggle health maps ON/OFF multiple times
3. Toggle vector layers ON/OFF
4. **Expected**: No map reinitialization, all layers work independently
5. **Result**: ✅ Works correctly

## Key Takeaways

1. **Refs for Initialization Guards**: Use refs to track initialization state without triggering re-renders
2. **State for Effect Triggers**: Keep state in dependencies when you need to trigger the effect
3. **Early Returns**: Check initialization state FIRST before other conditions
4. **Protect All Effects**: Add initialization checks to all effects that depend on the map

## Files Modified
- ✅ `src/components/MapboxGolfCourseMap.tsx`
  - Added `mapInitializedRef.current` check as first condition in map init effect
  - Restored `containerReady` to dependency array
  - Added `mapInitializedRef.current` checks to vector layer effects
