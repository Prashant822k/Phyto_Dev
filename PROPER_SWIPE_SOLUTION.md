# Proper Layer Swipe Solution

## The Problem

You want to **drag a slider to compare selective areas** of layers, but:
- ❌ Opacity changes just dim the layer (not a true comparison)
- ❌ CSS clip on canvas clips the ENTIRE map (not individual layers)
- ❌ Mapbox renders all layers on ONE canvas (can't clip individual layers)

## The ONLY Working Solution

### **Dual Map Approach** (Like Mapbox GL Compare)

This is how ALL professional map comparison tools work:

```
┌─────────────────────────────────┐
│  LEFT MAP    │    RIGHT MAP     │
│  (All layers)│  (Without top)   │
│              │                  │
│    ◄─────────┼─────────►        │
│         SLIDER DIVIDER          │
└─────────────────────────────────┘
```

**How it works:**
1. Create TWO separate Mapbox instances
2. **Left map**: Shows ALL layers (including top layer)
3. **Right map**: Shows layers BENEATH (without top layer)
4. **Slider**: Controls the width of left map container
5. **Sync**: Both maps pan/zoom together

## Implementation Steps

### 1. Create Comparison Component

```typescript
<MapComparison
  leftLayers={['base', 'raster', 'health', 'vectors']}
  rightLayers={['base', 'raster', 'vectors']} // No health map
  bounds={courseBounds}
/>
```

### 2. Two Map Containers

```tsx
<div className="relative">
  {/* Left map - shows top layer */}
  <div 
    className="absolute inset-0"
    style={{ clipPath: `inset(0 ${100-position}% 0 0)` }}
  >
    <Map layers={allLayers} />
  </div>
  
  {/* Right map - shows beneath */}
  <div className="absolute inset-0">
    <Map layers={layersBeneath} />
  </div>
  
  {/* Slider */}
  <Slider position={position} />
</div>
```

### 3. Synchronize Maps

```typescript
// When left map moves, move right map
leftMap.on('move', () => {
  rightMap.jumpTo({
    center: leftMap.getCenter(),
    zoom: leftMap.getZoom(),
    bearing: leftMap.getBearing(),
    pitch: leftMap.getPitch()
  });
});

// And vice versa
```

## Why This Works

✅ **True comparison**: You see EXACTLY what's beneath
✅ **No flickering**: No adding/removing layers
✅ **Smooth**: CSS clip-path is hardware accelerated
✅ **Works with all layers**: Raster, vector, anything

## Alternative: Toggle Mode

If dual maps are too complex, use **instant toggle**:

```typescript
// Button 1: Show Health Map
// Button 2: Hide Health Map (reveal beneath)
// = Instant comparison, no swipe
```

This is simpler but less visual than swipe.

## Recommendation

For your use case, I recommend:

**Option A**: Implement dual-map swipe (proper solution, more work)
**Option B**: Use toggle buttons (simpler, instant comparison)
**Option C**: Keep opacity slider (current, but not true comparison)

Which would you prefer?
