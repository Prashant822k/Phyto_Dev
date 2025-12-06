# Health Map Infinite Loop Fix

## Problem
Health maps were continuously re-rendering in an infinite loop, as shown by repeated console logs:
```
MapboxGolfCourseMap.tsx:428 ⏸️ Map not ready for health maps - waiting for load
MapboxGolfCourseMap.tsx:440 ✅ Map loaded, will load health maps now
MapboxGolfCourseMap.tsx:477 🔍 Health map effect triggered
MapboxGolfCourseMap.tsx:517 Adding health map layer
MapboxGolfCourseMap.tsx:553 ✅ Health map layer added successfully
[REPEATS INFINITELY]
```

## Root Cause
The health map effect had retry logic that was calling `setHealthMapLoaded(false)`, which is a dependency of the effect. This created an infinite loop:

```typescript
// PROBLEMATIC CODE
const handleMapLoad = () => {
  console.log('✅ Map loaded, will load health maps now');
  setHealthMapLoaded(false); // ❌ This triggers the effect again!
};

// Effect depends on healthMapLoaded
}, [showHealthMaps, selectedHealthMapId, healthMapTilesets, selectedLayers, healthMapLoaded, rasterLayersLoaded]);
```

**The Loop:**
1. Health map effect runs
2. Waits for map to load
3. Calls `setHealthMapLoaded(false)`
4. Effect runs again (because `healthMapLoaded` changed)
5. Repeat infinitely

## Solution

### Fix: Remove State-Changing Retry Logic
```typescript
// FIXED CODE
const handleMapLoad = () => {
  console.log('✅ Map loaded, will load health maps now');
  // ✅ Don't change state - just log
};

map.current.once('idle', handleMapLoad);
```

**Why this works:**
- The effect will naturally run again when the map becomes ready
- No need to manually trigger it by changing state
- The `idle` event listener is just for logging/debugging

### Additional Fix: Removed Timeout Retry
Also removed the timeout-based retry logic that was doing the same thing:

```typescript
// REMOVED THIS PROBLEMATIC CODE
const timer = setTimeout(() => {
  console.log('⏰ Retrying health map load after PNG tile delay');
  if (showHealthMaps && selectedHealthMapId) {
    setHealthMapLoaded(false); // ❌ This also caused loops
  }
}, 2000);
```

## Vector Layer Diagnosis

Added more detailed logging to vector layer effect:
```typescript
console.log('🔍 Vector layer effect check:', {
  hasMap: !!map.current,
  vectorLayersCount: vectorLayers.length,
  alreadyLoaded: vectorLayersLoadedRef.current,
  mapInitialized: mapInitializedRef.current,
  mapLoaded: map.current?.loaded(),        // NEW
  styleLoaded: map.current?.isStyleLoaded() // NEW
});
```

This will help identify why vector layers aren't loading.

## Expected Behavior After Fix

### ✅ Health Maps
- Health map effect runs once when toggled on
- Waits for map to be ready if needed
- Adds health map layer
- **Does NOT loop infinitely**
- Can be toggled on/off cleanly

### 🔍 Vector Layers (Diagnosis)
- Debug logs will show all conditions
- Will identify which check is preventing loading
- Once identified, can apply targeted fix

## Key Takeaway

**Never change state that's in an effect's dependency array from within that effect's logic** - it creates infinite loops!

```typescript
// ❌ BAD - Creates infinite loop
useEffect(() => {
  // ... some logic ...
  setMyState(newValue); // This triggers the effect again!
}, [myState]); // myState is a dependency

// ✅ GOOD - No state changes in effect
useEffect(() => {
  // ... some logic ...
  // Just do work, don't change dependencies
}, [myState]);
```

## Files Modified
- ✅ `src/components/MapboxGolfCourseMap.tsx`
  - Removed `setHealthMapLoaded(false)` from map load handler
  - Removed timeout-based retry logic
  - Added more detailed vector layer debug logging

## Testing

After this fix:
1. ✅ Health maps should load once without looping
2. ✅ Console logs should not repeat infinitely
3. ✅ Health maps can be toggled on/off multiple times
4. 🔍 Vector layer debug logs will show why they're not loading
