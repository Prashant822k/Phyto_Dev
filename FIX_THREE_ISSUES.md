# Fix Three Issues in MapboxGolfCourseMap.tsx

## Issue 1: Raster Layers Don't Deselect

**Problem:** The `loadRasterLayers` state controls loading, not visibility. Once loaded, toggling doesn't hide them.

**Solution:** Add a raster visibility control effect.

**Find line ~79:**
```typescript
// Raster layer loading control
const [loadRasterLayers, setLoadRasterLayers] = useState(false);
const [rasterLayersLoaded, setRasterLayersLoaded] = useState(false);
```

**Change to:**
```typescript
// Raster layer control
const [showRasterLayers, setShowRasterLayers] = useState(true); // Show/hide raster layers
const [rasterLayersLoaded, setRasterLayersLoaded] = useState(false);
```

**Then find line ~317 (after the loadRasterTiles effect) and ADD this new effect:**
```typescript
// Control raster layer visibility
useEffect(() => {
  if (!map.current || !rasterLayersLoaded) return;

  const visibility = showRasterLayers ? 'visible' : 'none';
  
  selectedLayers.forEach(tilesetId => {
    const layerId = `tileset-layer-${tilesetId}`;
    if (map.current!.getLayer(layerId)) {
      try {
        map.current!.setLayoutProperty(layerId, 'visibility', visibility);
      } catch (e) {
        console.warn(`Could not set visibility for ${layerId}:`, e);
      }
    }
  });
  
  console.log(`🎚️ Raster layers ${showRasterLayers ? 'shown' : 'hidden'}`);
}, [showRasterLayers, selectedLayers, rasterLayersLoaded]);
```

**Update UI (find line ~1050):**
```typescript
// OLD:
<Switch
  checked={loadRasterLayers}
  onCheckedChange={setLoadRasterLayers}
/>

// NEW:
<Switch
  checked={showRasterLayers}
  onCheckedChange={setShowRasterLayers}
/>
```

**Also update the badge text (line ~1055):**
```typescript
// OLD:
{loadRasterLayers ? 'Loaded' : 'Not Loaded'}

// NEW:
{showRasterLayers ? 'Visible' : 'Hidden'}
```

---

## Issue 2: Vector Layers Load Automatically

**Problem:** Vector layers load on page load. They should only load when toggled visible.

**Solution:** Change the vector loading effect to depend on `visibleVectorLayers`.

**Find line ~560 (vector loading effect):**
```typescript
// Load vector layers onto map
useEffect(() => {
  console.log('🔍 Vector layer effect check:', {
    hasMap: !!map.current,
    vectorLayersCount: vectorLayers.length,
    alreadyLoaded: vectorLayersLoadedRef.current,
    mapInitialized: mapInitializedRef.current,
    mapLoaded: map.current?.loaded(),
    styleLoaded: map.current?.isStyleLoaded()
  });
  
  if (!map.current || vectorLayers.length === 0 || vectorLayersLoadedRef.current || !mapInitializedRef.current) {
    console.log('⏸️ Skipping vector layer load');
    return;
  }
```

**Change to:**
```typescript
// Load vector layers onto map (only when toggled visible)
useEffect(() => {
  if (!map.current || !mapInitializedRef.current || vectorLayers.length === 0) {
    return;
  }

  if (!map.current.loaded() || !map.current.isStyleLoaded()) {
    return;
  }
```

**Then find line ~593:**
```typescript
console.log(`🔄 Loading ${vectorLayers.length} vector layers...`);
vectorLayersLoadedRef.current = true;

const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;

for (const layer of vectorLayers) {
```

**Change to:**
```typescript
const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;

// Load only visible vector layers
visibleVectorLayers.forEach(async (layerId) => {
  const layer = vectorLayers.find(l => l.id === layerId);
  if (!layer) return;
```

**Find line ~600:**
```typescript
const sourceId = `vector-source-${layer.id}`;
const layerId = `vector-layer-${layer.id}`;

if (map.current!.getSource(sourceId)) {
  console.log(`   ⏭️ Skipping ${layer.name} (already loaded)`);
  continue;
}

console.log(`   Loading: ${layer.name}`);
```

**Change to:**
```typescript
const sourceId = `vector-source-${layer.id}`;
const vectorLayerId = `vector-layer-${layer.id}`;

// Skip if already loaded
if (map.current!.getSource(sourceId)) {
  return;
}

console.log(`🔄 Loading vector layer: ${layer.name}`);
```

**Find the end of the vector loading loop (line ~665):**
```typescript
      }
      
      console.log(`✅ Finished loading all ${vectorLayers.length} vector layers`);
    };

    loadVectorLayers();
  }, [vectorLayers, golfClubId, mapReady]);
```

**Change to:**
```typescript
      }
    });
  }, [visibleVectorLayers, vectorLayers, golfClubId, mapReady]);
```

**IMPORTANT:** Also remove `vectorLayersLoadedRef.current = true;` line (~594) since we're not using it anymore.

---

## Issue 3: Health Maps Don't Remove Individually

**Problem:** Health maps only hide when toggle is off, but don't remove when deselected from the stack.

**Solution:** The code already removes them (lines 484-496), but the toggle-off section only hides them.

**Find line ~464:**
```typescript
// If toggling off, hide all health map layers
if (!showHealthMaps) {
  selectedHealthMapIds.forEach(id => {
    const layerId = `health-map-layer-${id}`;
    if (map.current!.getLayer(layerId)) {
      map.current!.setLayoutProperty(layerId, 'visibility', 'none');
    }
  });
  console.log('🙈 All health map layers hidden');
  return;
}
```

**Change to:**
```typescript
// If toggling off, remove all health map layers
if (!showHealthMaps) {
  healthMapTilesets.forEach(hm => {
    const layerId = `health-map-layer-${hm.id}`;
    const sourceId = `health-map-source-${hm.id}`;
    
    if (map.current!.getLayer(layerId)) {
      map.current!.removeLayer(layerId);
    }
    if (map.current!.getSource(sourceId)) {
      map.current!.removeSource(sourceId);
    }
  });
  console.log('🗑️ All health map layers removed');
  return;
}
```

---

## Regarding Swipe Mode

**Your Question:** Should layer toggling be disabled during swipe mode?

**My Recommendation:** **NO, keep toggles enabled during swipe mode.**

**Reasoning:**
1. **Vector layers are NOT swipeable** - they appear on both sides, so toggling them on/off during swipe is useful
2. **Health map stack** - users might want to add/remove health maps from the stack while in swipe mode
3. **Better UX** - Users expect controls to work unless there's a good reason to disable them

**However**, if you find it confusing, you could:
- Add a note in the UI: "Vector layers appear on both sides during swipe"
- Or disable ONLY the health map stack controls during swipe (but keep vector toggles active)

---

## Summary of Changes

1. **Raster visibility**: Change `loadRasterLayers` to `showRasterLayers`, add visibility control effect
2. **Vector loading**: Change from auto-load to load-on-toggle by depending on `visibleVectorLayers`
3. **Health map removal**: Change from hide to remove when toggle is off

All three fixes are independent and can be applied in any order.
