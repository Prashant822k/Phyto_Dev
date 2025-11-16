# 📅 Date Layer Dropdown - User Guide

## Overview

The new **DateLayerDropdown** component provides an intuitive dropdown interface for selecting and comparing golf course layers from different dates.

---

## Features

### ✅ **Dual Dropdown System**

1. **Primary Layer Dropdown**
   - Select the main layer to display
   - Shows all available dates/times
   - Always visible and required

2. **Compare With Dropdown**
   - Optional second layer for comparison
   - Automatically enables swipe mode when selected
   - Filters out the primary layer from options

### ✅ **Automatic Swipe Activation**

- When you select a second layer, swipe mode activates automatically
- No need to click a separate "Swipe" button
- Drag the slider on the map to compare layers

### ✅ **Date/Time Display**

- Dates formatted as: "Nov 3, 2024"
- Times formatted as: "14:30"
- Combined display: "Nov 3, 2024 at 14:30"

---

## How to Use

### **Step 1: Select Primary Layer**

```
┌─────────────────────────────────────┐
│ Primary Layer                       │
├─────────────────────────────────────┤
│ [Select primary layer ▼]            │
│                                     │
│ Options:                            │
│ 📅 Nov 3, 2024  🕐 14:30           │
│ 📅 Nov 1, 2024  🕐 10:30           │
│ 📅 Oct 28, 2024 🕐 09:15           │
└─────────────────────────────────────┘
```

**Action:** Click dropdown and select a date

**Result:** Map displays tiles from that date

---

### **Step 2: (Optional) Select Comparison Layer**

```
┌─────────────────────────────────────┐
│ Compare With (Optional)             │
├─────────────────────────────────────┤
│ [Select layer to compare ▼]         │
│                                     │
│ Options:                            │
│ None (Single layer)                 │
│ 📅 Nov 1, 2024  🕐 10:30           │
│ 📅 Oct 28, 2024 🕐 09:15           │
└─────────────────────────────────────┘
```

**Action:** Click dropdown and select a second date

**Result:** 
- Swipe mode activates automatically
- Vertical slider appears on map
- Info box shows which dates are being compared

---

### **Step 3: Compare Layers**

```
┌─────────────────────────────────────┐
│ ℹ️ Swipe Mode Active:                │
│                                     │
│ Drag the slider on the map to      │
│ compare Nov 3, 2024 at 14:30 (left)│
│ vs Nov 1, 2024 at 10:30 (right)    │
└─────────────────────────────────────┘
```

**Action:** Drag the vertical slider on the map

**Result:** 
- Left side shows first date
- Right side shows second date
- Compare changes over time

---

## UI Layout

### **Complete Interface**

```
┌─────────────────────────────────────────────┐
│ Golf Course Map                             │
│                                             │
│ [Zoom: 16] [2 Layers]        [-] [+] [⛶]  │
├─────────────────────────────────────────────┤
│                                             │
│              MAP DISPLAY                    │
│                                             │
│         (with swipe slider)                 │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Primary Layer                               │
│ [📅 Nov 3, 2024  🕐 14:30 ▼]               │
│                                             │
│ Compare With (Optional)                     │
│ [📅 Nov 1, 2024  🕐 10:30 ▼]               │
│                                             │
│ ℹ️ Swipe Mode Active: Drag the slider...   │
└─────────────────────────────────────────────┘
```

---

## Behavior

### **Single Layer Mode**

```
Primary Layer: Nov 3, 2024 at 14:30
Compare With: None (Single layer)

Map Display:
├── Shows only Nov 3 tiles
├── No swipe slider
└── Can zoom in/out normally
```

### **Comparison Mode**

```
Primary Layer: Nov 3, 2024 at 14:30
Compare With: Nov 1, 2024 at 10:30

Map Display:
├── Left side: Nov 3 tiles
├── Right side: Nov 1 tiles
├── Vertical swipe slider
└── Drag slider to compare
```

---

## Advantages Over Old System

| Feature | Old (LayerSelector) | New (DateLayerDropdown) |
|---------|---------------------|-------------------------|
| **UI Type** | Panel with toggles | Dropdown selectors |
| **Space** | Takes up screen space | Compact, always visible |
| **Selection** | Toggle on/off | Direct selection |
| **Swipe Activation** | Manual button click | Automatic |
| **Layer Limit** | Shows all, limits to 2 | Shows relevant options only |
| **User Flow** | 3 steps | 2 steps |
| **Clarity** | Can be confusing | Clear and intuitive |

---

## Technical Details

### **Component Props**

```typescript
interface DateLayerDropdownProps {
  tilesets: GolfCourseTileset[]        // All available tilesets
  selectedLayers: string[]              // [leftLayerId, rightLayerId?]
  onLayerChange: (                      // Callback when selection changes
    leftLayerId: string, 
    rightLayerId: string | null
  ) => void
}
```

### **State Management**

```typescript
// In MapboxGolfCourseMap
const [selectedLayers, setSelectedLayers] = useState<string[]>([])
const [swipeMode, setSwipeMode] = useState(false)

// Handler
const handleLayerChange = (leftLayerId: string, rightLayerId: string | null) => {
  if (rightLayerId) {
    setSelectedLayers([leftLayerId, rightLayerId])
    setSwipeMode(true)  // Auto-enable swipe
  } else {
    setSelectedLayers([leftLayerId])
    setSwipeMode(false)
  }
}
```

### **Automatic Swipe Logic**

```typescript
// When 2 layers selected → swipe mode ON
// When 1 layer selected → swipe mode OFF
// No manual button needed!
```

---

## User Workflow

### **Scenario 1: View Single Date**

```
1. User opens map
2. Primary layer dropdown shows most recent date
3. Map displays that date's tiles
4. User can zoom/pan normally
```

### **Scenario 2: Compare Two Dates**

```
1. User selects primary layer: Nov 3, 2024
2. User selects compare layer: Nov 1, 2024
3. Swipe mode activates automatically
4. Slider appears on map
5. User drags slider to compare
6. User can zoom while comparing
```

### **Scenario 3: Switch Comparison**

```
1. Currently comparing: Nov 3 vs Nov 1
2. User changes compare layer to: Oct 28
3. Map updates to show: Nov 3 vs Oct 28
4. Swipe continues working
5. Slider position maintained
```

### **Scenario 4: Return to Single Layer**

```
1. Currently comparing: Nov 3 vs Nov 1
2. User selects "None (Single layer)" in compare dropdown
3. Swipe mode deactivates
4. Map shows only Nov 3
5. Slider disappears
```

---

## Keyboard Shortcuts (Future Enhancement)

```
Planned shortcuts:
- Tab: Switch between dropdowns
- Arrow Keys: Navigate dropdown options
- Enter: Select option
- Escape: Close dropdown
```

---

## Mobile Responsiveness

```
Desktop:
├── Dropdowns side by side
└── Full width map

Tablet:
├── Dropdowns stacked
└── Full width map

Mobile:
├── Dropdowns stacked
├── Smaller map height
└── Touch-friendly slider
```

---

## Accessibility

```
✅ Keyboard navigable
✅ Screen reader friendly
✅ ARIA labels
✅ Focus indicators
✅ High contrast support
```

---

## Testing Checklist

- [ ] Primary dropdown shows all dates
- [ ] Compare dropdown excludes selected primary
- [ ] Selecting 2 layers activates swipe
- [ ] Selecting "None" deactivates swipe
- [ ] Info box shows correct dates
- [ ] Dates formatted correctly
- [ ] Times formatted correctly
- [ ] Zoom works in both modes
- [ ] Slider works smoothly
- [ ] Dropdown closes after selection

---

## Troubleshooting

### **Dropdown is empty**

**Cause:** No tilesets available for golf course

**Solution:** Upload tilesets with dates/times

### **Compare dropdown disabled**

**Cause:** No primary layer selected

**Solution:** Select a primary layer first

### **Swipe not working**

**Cause:** Only one layer selected

**Solution:** Select a second layer in compare dropdown

### **Dates not showing**

**Cause:** Tilesets missing `flight_date` field

**Solution:** Re-upload metadata with date/time

---

## Summary

The **DateLayerDropdown** provides:

✅ **Intuitive** - Clear dropdown interface  
✅ **Automatic** - Swipe activates when needed  
✅ **Compact** - Doesn't take up screen space  
✅ **Flexible** - Easy to switch between layers  
✅ **Informative** - Shows what's being compared  

**Perfect for monitoring golf course changes over time!** 🎯
