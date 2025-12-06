# Multi-Health Map Implementation Plan

## Current State
- Single health map selection (`selectedHealthMapId`)
- Single layer on map (`health-map-layer`)
- Simple toggle on/off

## Target State
- Multiple health maps selectable (`selectedHealthMapIds: string[]`)
- Multiple layers on map (`health-map-layer-{id}`)
- Stacking order (latest selection on top)
- Swipe removes top layer only

## Implementation Steps

### 1. State Changes
- ✅ Change `selectedHealthMapId` → `selectedHealthMapIds: string[]`
- Array represents stack order (index 0 = bottom, last = top)

### 2. Health Map Loading
- Load each selected health map as separate layer
- Layer ID: `health-map-layer-{healthMapId}`
- Source ID: `health-map-source-{healthMapId}`
- Z-index based on array position

### 3. Selection UI
- Multi-select checkboxes instead of dropdown
- Show stack order visually
- Drag to reorder (optional v2)

### 4. Swipe Logic
- Top layer = `selectedHealthMapIds[selectedHealthMapIds.length - 1]`
- Swipe removes top layer from right map
- If only 1 health map, swipe reveals raster

### 5. Date Display
- Left container: Show date of all visible layers (top layer)
- Right container: Show date of layer beneath (or raster date)
- Fetch from correct table based on layer type

## Files to Modify
1. `MapboxGolfCourseMap.tsx` - Main logic
2. `DualMapSwipe.tsx` - Handle multiple layers
3. New component: `HealthMapStack.tsx` - UI for stack management

## Data Structure
```typescript
selectedHealthMapIds: string[] = ['id1', 'id2', 'id3']
// Rendering order:
// - id1 (bottom)
// - id2 (middle)
// - id3 (top) ← swipe target
```
