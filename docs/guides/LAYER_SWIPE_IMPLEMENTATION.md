# Layer Swipe/Drag Implementation Plan

## Objective
Create a vertical slider that allows dragging to reveal layers underneath the top layer.

## Requirements
1. **Drag Functionality**: User can drag a vertical slider left/right
2. **Layer Clipping**: Top layer is clipped to reveal layer(s) beneath
3. **Works for All Layers**: Health maps, raster layers, vector layers (except base map)
4. **Smooth Performance**: 60fps dragging with no lag

## Technical Approach

### Option 1: CSS Clip-Path (Simplest)
**Pros:**
- Simple implementation
- Good performance
- Works with all layer types

**Cons:**
- Clips entire map canvas, not individual layers
- May affect multiple layers

### Option 2: Mapbox Layer Clipping (Best for Individual Layers)
**Pros:**
- Clips specific layers only
- Precise control
- Native Mapbox approach

**Cons:**
- More complex implementation
- Requires layer duplication or custom rendering

### Option 3: Dual Map Instances (Most Robust)
**Pros:**
- Perfect clipping
- Independent layer control
- Used by Mapbox Compare plugin

**Cons:**
- Higher memory usage
- More complex state management

## Recommended Implementation: Hybrid Approach

We'll use **Mapbox's clip region** with a custom implementation:

### Step 1: Create Layer Stack Manager
Track which layers are currently visible and their z-index order:
```typescript
interface LayerStack {
  baseMap: 'satellite' | 'streets';
  rasterLayers: string[]; // tileset IDs
  healthMaps: string[]; // health map IDs  
  vectorLayers: string[]; // vector layer IDs
}
```

### Step 2: Implement Clip Using Before Layer
For each layer we want to clip:
1. Duplicate the layer with a `-clipped` suffix
2. Add both versions to the map
3. Use `beforeId` to control z-index
4. Apply clip bounds to the clipped version

### Step 3: Create Swipe Control Component
```typescript
<LayerSwipeControl
  map={map}
  topLayerId="health-map-layer" // Layer to clip
  enabled={swipeEnabled}
  onPositionChange={(pos) => console.log(pos)}
/>
```

### Step 4: Clip Implementation
```typescript
// Calculate clip bounds based on slider position
const bounds = map.getBounds();
const clipLng = calculateClipLongitude(sliderPosition);

// Create clip polygon (left side visible)
const clipPolygon = [
  [bounds.getWest(), bounds.getNorth()],
  [clipLng, bounds.getNorth()],
  [clipLng, bounds.getSouth()],
  [bounds.getWest(), bounds.getSouth()],
  [bounds.getWest(), bounds.getNorth()]
];

// Apply to layer using filter or custom rendering
```

## Implementation Files

1. **`LayerSwipeControl.tsx`** - Main swipe UI component
2. **`useLayerClip.ts`** - Hook for clipping logic
3. **`MapboxGolfCourseMap.tsx`** - Integration point
4. **`layerStackManager.ts`** - Layer order management

## Integration into MapboxGolfCourseMap

### Add State
```typescript
const [swipeEnabled, setSwipeEnabled] = useState(false);
const [swipeLayerId, setSwipeLayerId] = useState<string | null>(null);
```

### Add UI Toggle
```typescript
<Button onClick={() => setSwipeEnabled(!swipeEnabled)}>
  {swipeEnabled ? 'Exit Swipe Mode' : 'Enable Swipe Mode'}
</Button>
```

### Render Swipe Control
```typescript
{swipeEnabled && swipeLayerId && (
  <LayerSwipeControl
    map={map.current}
    topLayerId={swipeLayerId}
    enabled={swipeEnabled}
  />
)}
```

## Layer Priority for Swipe

When swipe is enabled, determine top layer:
1. If health maps visible → health map layer
2. Else if vector layers visible → topmost vector layer
3. Else if raster layers visible → topmost raster layer
4. Else → disable swipe (only base map)

## Next Steps

1. ✅ Create `LayerSwipeControl` component with UI
2. ⏳ Implement clip logic using Mapbox filters
3. ⏳ Integrate into `MapboxGolfCourseMap`
4. ⏳ Add layer stack detection
5. ⏳ Test with all layer types
6. ⏳ Optimize performance

## Alternative: Use Mapbox Compare Plugin Pattern

If custom implementation is complex, we can adapt the Mapbox GL Compare plugin:
- Create two synchronized map instances
- Clip one map's container
- Keep them in sync for pan/zoom

This is the most robust but uses more resources.
