# Vector Layer Loading Fix

## Problem
Vector layers were not loading at all - no console logs appeared even when toggling layers in the panel.

## Root Cause
The vector layer loading effect had these dependencies:
```typescript
}, [vectorLayers, golfClubId]);
```

**The Issue:**
- `vectorLayers` loads early (from database)
- `golfClubId` is set early
- Effect runs BEFORE map is initialized
- Check `!mapInitializedRef.current` returns early
- Effect never runs again because dependencies don't change

**The Problem with Refs:**
- `mapInitializedRef.current` changes from `false` to `true`
- But refs don't trigger re-renders or effect re-runs
- So the effect never knows the map became ready

## Solution

### Added `mapReady` State
```typescript
const [mapReady, setMapReady] = useState(false); // Track when map is ready for layers
```

### Set State When Map Loads
```typescript
map.current.on('load', async () => {
  console.log('Map loaded successfully');
  
  // Set map ready state to trigger vector layer loading
  setMapReady(true); // ✅ This triggers effects that depend on it
  
  // ... rest of code
});
```

### Added to Effect Dependencies
```typescript
}, [vectorLayers, golfClubId, mapReady]); // ✅ Now runs when map becomes ready
```

## How It Works

### Initialization Flow:
1. **Component mounts**
   - `vectorLayers` loads from database (11 layers)
   - `mapReady` is `false`
   - Vector layer effect runs but skips (map not ready)

2. **Map initializes**
   - Map container mounts
   - Map instance created
   - `mapInitializedRef.current = true`

3. **Map loads**
   - `load` event fires
   - `setMapReady(true)` ✅
   - **Vector layer effect runs again** (dependency changed)

4. **Vector layers load**
   - Effect checks: map exists ✅, layers exist ✅, not loaded yet ✅, map initialized ✅
   - Loads all 11 vector layers
   - Sets `vectorLayersLoadedRef.current = true`

5. **User toggles layers**
   - Visibility management effect handles showing/hiding
   - Z-index management works (above/below health maps)

## Why State Instead of Ref?

| Aspect | Ref (`useRef`) | State (`useState`) |
|--------|---------------|-------------------|
| **Triggers re-render** | ❌ No | ✅ Yes |
| **Triggers effects** | ❌ No | ✅ Yes |
| **Persists across renders** | ✅ Yes | ✅ Yes |
| **Use case** | Track values without re-rendering | Track values that should trigger updates |

**For vector layer loading:**
- Need to trigger effect when map becomes ready ✅
- State is the right choice ✅

**For preventing re-initialization:**
- Don't want to trigger re-renders ✅
- Ref is the right choice ✅

## Expected Behavior After Fix

### ✅ Vector Layer Loading
1. Map loads
2. Console shows: `🔍 Vector layer effect check: {mapReady: true, ...}`
3. Console shows: `🔄 Loading 11 vector layers...`
4. Console shows: `✅ Loaded: [layer name]` for each layer
5. Console shows: `✅ Finished loading all 11 vector layers`

### ✅ Vector Layer Visibility
1. Open "Manage Layers" panel
2. Toggle individual layers on/off
3. Layers appear/disappear on map
4. "Show All" / "Hide All" works

### ✅ Vector Layer Z-Index
1. Load health maps
2. Vector layers section shows "Position" buttons
3. Click "Above Health" - vectors render on top
4. Click "Below Health" - vectors render underneath

## Files Modified
- ✅ `src/components/MapboxGolfCourseMap.tsx`
  - Added `mapReady` state variable
  - Set `mapReady = true` in map load event
  - Added `mapReady` to vector layer effect dependencies

## Key Takeaway

**Use the right tool for the job:**
- **Refs** for values that shouldn't trigger updates (like initialization flags)
- **State** for values that should trigger effects/re-renders (like readiness flags)

When you need an effect to run when something becomes ready, use state, not refs!
