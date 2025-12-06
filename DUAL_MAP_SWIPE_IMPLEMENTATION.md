# Dual Map Swipe Implementation

## Overview
Implemented a TRUE layer comparison swipe feature that only activates when needed.

## How It Works

### Normal Mode (Default)
- ✅ Single map instance
- ✅ All layers visible
- ✅ Normal memory usage
- ✅ Regular map interactions

### Swipe Mode (When Enabled)
1. **Click "Swipe Mode" button**
2. **Second map instance created** behind the scenes
3. **Right map**: Shows layers BENEATH (top layer removed)
4. **Left map**: Shows ALL layers (clipped by slider position)
5. **Slider**: Controls the divider position
6. **Maps synchronized**: Pan/zoom together

### Exit Swipe Mode
1. **Click "Exit Swipe" button**
2. **Second map removed** from memory
3. **Back to single map** mode

## Technical Implementation

### Component: `DualMapSwipe.tsx`

**Key Features:**
- Creates second Mapbox instance only when `enabled={true}`
- Clones the main map's style, center, zoom, bearing, pitch
- Removes the top layer from right map
- Synchronizes both maps (pan, zoom, rotate, pitch)
- Uses CSS `clip-path` to show left map up to slider position
- Cleans up second map when disabled

### Integration

```typescript
<DualMapSwipe
  map={map.current}
  layerId={swipeLayerId}  // Layer to hide on right map
  enabled={swipeEnabled}
  onToggle={() => setSwipeEnabled(!swipeEnabled)}
  mapboxAccessToken={mapboxAccessToken}
/>
```

### Visual Layout

```
┌─────────────────────────────────────┐
│                                     │
│  Left Map (All Layers)  │  Right   │
│  ◄──────────────────────┼─────────► │
│         SLIDER          │  Map     │
│                         │ (Beneath)│
│                                     │
└─────────────────────────────────────┘
```

## User Experience

### Before Swipe Mode
```
[Single Map with All Layers]
[Swipe Mode] button
```

### After Clicking "Swipe Mode"
```
[Left: All Layers] | [Right: Layers Beneath]
        ◄─────────┼─────────►
           SLIDER
[Exit Swipe] button
```

### Dragging Slider
- **Drag left**: See more of right map (layers beneath)
- **Drag right**: See more of left map (all layers)
- **50%**: Split view comparison

## Performance

### Memory Usage
- **Normal**: 1 map instance
- **Swipe Mode**: 2 map instances (temporary)
- **Exit Swipe**: Back to 1 map instance

### Optimization
- Second map only created when needed
- Automatic cleanup on disable
- Synchronized efficiently (prevents infinite loops)
- Uses hardware-accelerated CSS clip-path

## Benefits

✅ **True Comparison**: See exact areas, not just opacity
✅ **On-Demand**: Only uses extra memory when comparing
✅ **Smooth**: No flickering or performance issues
✅ **Intuitive**: Drag slider to compare
✅ **Clean**: Automatic cleanup when done

## Files Modified

1. ✅ `src/components/DualMapSwipe.tsx` - New component
2. ✅ `src/components/MapboxGolfCourseMap.tsx` - Updated to use DualMapSwipe

## Usage

1. Load your layers (raster, health, vector)
2. Click "Swipe Mode" button
3. Drag the slider to compare
4. Click "Exit Swipe" when done

The second map is automatically created and destroyed as needed!
