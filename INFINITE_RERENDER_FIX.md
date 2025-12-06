# Infinite Re-render and Vector Layer Fix

## Problems Identified

### 1. Infinite Re-renders
**Symptom**: "✅ Main map container mounted" logging infinitely in console

**Root Cause**: The `setMapContainerRef` callback was creating a new function on every render, causing React to think the ref changed and re-mount the component.

```typescript
// PROBLEMATIC CODE
const setMapContainerRef = (node: HTMLDivElement | null) => {
  if (node) {
    console.log('✅ Main map container mounted');
    mapContainer.current = node;
    setContainerReady(true); // ❌ Always sets state, even if already set
  }
};
```

### 2. Health Map Source Duplicate Error
**Symptom**: `Error: There is already a source with ID "health-map-source"`

**Root Cause**: Health map effect was running multiple times due to the infinite re-renders, trying to add the same source repeatedly.

### 3. Vector Layers Not Loading
**Symptom**: Vector layers don't appear on map, no loading logs

**Root Cause**: Will be diagnosed with added debug logs

## Solutions Applied

### Fix 1: Use useCallback for Ref Callback
```typescript
// FIXED CODE
const setMapContainerRef = useCallback((node: HTMLDivElement | null) => {
  if (node && !mapContainer.current) { // ✅ Only set if not already set
    console.log('✅ Main map container mounted');
    mapContainer.current = node;
    setContainerReady(true);
  }
}, []); // ✅ Empty deps = stable function reference
```

**Why this works:**
- `useCallback` with empty deps creates a stable function reference
- Only sets state if `mapContainer.current` is not already set
- Prevents infinite re-render loop

### Fix 2: Remove Existing Health Map Source/Layer
```typescript
// FIXED CODE
try {
  // Remove existing source/layer if present
  if (map.current!.getLayer(healthLayerId)) {
    map.current!.removeLayer(healthLayerId);
  }
  if (map.current!.getSource(healthSourceId)) {
    map.current!.removeSource(healthSourceId);
  }

  // Now add fresh source and layer
  map.current!.addSource(healthSourceId, { /* ... */ });
  map.current!.addLayer({ /* ... */ });
  
  console.log('✅ Health map layer added successfully');
  setHealthMapLoaded(true);
} catch (error) {
  console.error('❌ Error adding health map layer:', error);
}
```

**Why this works:**
- Checks if source/layer already exists before adding
- Removes old ones if present
- Prevents duplicate source error

### Fix 3: Added Debug Logging for Vector Layers
```typescript
// ADDED DEBUG CODE
useEffect(() => {
  console.log('🔍 Vector layer effect check:', {
    hasMap: !!map.current,
    vectorLayersCount: vectorLayers.length,
    alreadyLoaded: vectorLayersLoadedRef.current,
    mapInitialized: mapInitializedRef.current
  });
  
  if (!map.current || vectorLayers.length === 0 || vectorLayersLoadedRef.current || !mapInitializedRef.current) {
    console.log('⏸️ Skipping vector layer load');
    return;
  }
  
  // Load vector layers...
}, [vectorLayers, golfClubId]);
```

**Purpose:**
- Diagnose why vector layers aren't loading
- Check all conditions that might prevent loading
- Will show in console which condition is failing

## Expected Behavior After Fixes

### ✅ No More Infinite Re-renders
- "Main map container mounted" should log only ONCE
- Component should not continuously re-render

### ✅ Health Maps Load Without Errors
- No duplicate source errors
- Health maps toggle on/off cleanly
- Can switch between different health maps

### ✅ Vector Layers Load (After Diagnosis)
- Debug logs will show why they're not loading
- Once identified, we can fix the specific issue

## Testing Checklist

- [ ] Page loads without infinite console logs
- [ ] Main map initializes correctly
- [ ] Raster layers load when toggled
- [ ] Health maps load without errors
- [ ] Health maps can be toggled on/off multiple times
- [ ] Vector layer debug logs appear in console
- [ ] Vector layers load and display (after fix)
- [ ] Vector layer z-index controls work

## Next Steps

1. Test the page and check console for vector layer debug logs
2. Identify which condition is preventing vector layers from loading
3. Apply targeted fix based on debug output
4. Test vector layer z-index positioning (above/below health maps)

## Files Modified
- ✅ `src/components/MapboxGolfCourseMap.tsx`
  - Added `useCallback` import
  - Wrapped `setMapContainerRef` in `useCallback`
  - Added check to prevent duplicate state updates
  - Added health map source/layer removal before adding
  - Added debug logging to vector layer effect
