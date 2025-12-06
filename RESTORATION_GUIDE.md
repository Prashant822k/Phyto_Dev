# MapboxGolfCourseMap.tsx Restoration Guide

## What Was Lost
You restored an old backup that's missing:

1. ❌ **Vector Layers** - All vector layer functionality
2. ❌ **Health Map Stacking** - Multiple health maps with array selection
3. ❌ **DualMapSwipe Component** - Side-by-side swipe comparison
4. ❌ **Raster Toggle** - Show/hide raster layers
5. ❌ **Vector Layer Panel** - Sliding panel to manage vector layers
6. ❌ **Swipe Mode Controls** - Enable/disable swipe with X button
7. ❌ **Layer Sync** - Synchronization between main and swipe maps

## Current State (OLD VERSION)
- ✅ Basic map with PNG tiles
- ✅ Single health map selection (dropdown)
- ✅ Opacity slider
- ✅ Swipe animations (horizontal/vertical)
- ❌ NO vector layers
- ❌ NO health map stacking
- ❌ NO dual map swipe
- ❌ NO modern swipe controls

## What Needs to Be Restored

### 1. Add Missing Imports
```typescript
import { X, MoveHorizontal } from 'lucide-react';
import DualMapSwipe from '@/components/DualMapSwipe';
import HealthMapStack from '@/components/HealthMapStack';
import { ScrollArea } from '@/components/ui/scroll-area';
```

### 2. Add Vector Layer Type
```typescript
interface VectorLayer {
  id: string;
  name: string;
  description: string;
  layer_type: string;
  r2_key: string;
  golf_club_id: string;
  course_name: string;
  is_active: boolean;
  z_index: number;
  created_at: string;
  updated_at: string;
}
```

### 3. Add Missing State Variables
```typescript
// Vector layer states
const [vectorLayers, setVectorLayers] = useState<VectorLayer[]>([]);
const [visibleVectorLayers, setVisibleVectorLayers] = useState<Set<string>>(new Set());
const [showVectorLayerPanel, setShowVectorLayerPanel] = useState(false);
const [vectorLayersAboveHealth, setVectorLayersAboveHealth] = useState(true);
const vectorLayersLoadedRef = useRef(false);
const mapInitializedRef = useRef(false);
const [mapReady, setMapReady] = useState(false);

// Change health map from single to array
const [selectedHealthMapIds, setSelectedHealthMapIds] = useState<string[]>([]); // NOT selectedHealthMapId

// Raster layer control
const [showRasterLayers, setShowRasterLayers] = useState(true);
const [rasterLayersLoaded, setRasterLayersLoaded] = useState(false);

// Layer swipe control
const [swipeEnabled, setSwipeEnabled] = useState(false);
const [swipeLayerId, setSwipeLayerId] = useState<string | null>(null);
```

### 4. Load Vector Layers in useEffect
Add to the tileset loading effect:
```typescript
// Load vector layers
console.log('Loading vector layers for golf_club_id:', golfClubId);
const { data: vectorLayersData, error: vectorError } = await supabase
  .from('vector_layers')
  .select('*')
  .eq('golf_club_id', golfClubId)
  .eq('is_active', true)
  .order('z_index', { ascending: true });

if (vectorError) {
  console.error('Error loading vector layers:', vectorError);
} else if (vectorLayersData && vectorLayersData.length > 0) {
  console.log('Loaded vector layers:', vectorLayersData);
  setVectorLayers(vectorLayersData);
}
```

### 5. Add Vector Layer Loading Effect
### 6. Add Health Map Stacking Logic
### 7. Add Swipe Layer Determination
### 8. Add DualMapSwipe Component
### 9. Add Vector Layer Panel UI
### 10. Add Swipe Controls

## Recovery Steps

**OPTION 1: Use Git (if available)**
```bash
git reflog
git checkout <commit-hash> -- src/components/MapboxGolfCourseMap.tsx
```

**OPTION 2: Manual Restoration**
I can restore all features by making systematic edits to add back:
1. All missing imports
2. All missing state variables
3. All missing effects
4. All missing UI components

Would you like me to proceed with the manual restoration?
