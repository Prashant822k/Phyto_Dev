# Layer Swipe Flickering Issue - Analysis & Solution

## Problem
The layer swipe feature is causing continuous flickering and dimming because:

1. **Excessive Re-renders**: The clip is being recalculated on every `move` and `zoom` event
2. **Layer Duplication**: Creating/removing duplicate layers repeatedly
3. **Source/Layer Conflicts**: Adding/removing sources and layers causes Mapbox to re-render
4. **No Proper Clipping**: Mapbox GL JS doesn't support native layer clipping

## Why Current Approach Fails

```typescript
// This runs on EVERY map move/zoom
map.on('move', handleMapMove);
map.on('zoom', handleMapMove);

// Inside handleMapMove:
- Remove layer
- Remove source  
- Add source
- Add layer
// = Causes flickering!
```

## Correct Solution: Use CSS Clip on Container

Mapbox GL Compare plugin uses a different approach:
- **Two map instances** side by side
- **CSS clip-path** on the container (not the canvas)
- **Synchronized pan/zoom**
- **One slider** to control the clip boundary

## Recommended Implementation

### Option 1: Simple CSS Clip (Best for Single Layer)
Use CSS `clip-path` on a wrapper div around the map container:

```typescript
// Wrapper div with clip
<div style={{ clipPath: `inset(0 ${100-position}% 0 0)` }}>
  {/* Map renders here */}
</div>
```

### Option 2: Mapbox GL Compare Pattern (Best for Multiple Layers)
Create two map instances:
1. **Left Map**: Shows all layers
2. **Right Map**: Shows layers beneath (without top layer)
3. **Slider**: Controls the width of left map container

This is how professional map comparison tools work.

## Why Our Current Approach Doesn't Work

1. **Raster layers can't be clipped individually** in Mapbox GL JS
2. **Creating duplicate layers** causes performance issues
3. **Removing/adding on every move** causes flickering
4. **Geographic bounds approach** doesn't actually clip rendering

## Next Steps

We need to either:
1. Use CSS clip on the entire map (simpler but clips everything)
2. Implement dual-map approach (more complex but proper solution)
3. Use layer visibility toggle instead of clip (instant switch, no swipe)

The Mapbox documentation mentions using `setPaintProperty` and `setLayoutProperty` for **toggling** layers, not **clipping** them. True swipe requires dual maps or CSS clip.
