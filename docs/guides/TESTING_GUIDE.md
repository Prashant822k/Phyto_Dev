# Testing Guide for Multi-Layer Swipe System

## Quick Start Testing

### Test 1: Vector Layers Display
**Expected**: Vector layers should be visible immediately after loading.

1. Load the application
2. Navigate to a golf course with vector layers
3. **Verify**: Vector layers are visible on the map
4. **Verify**: "Vector Layers" section shows count (e.g., "11 / 11")
5. Click "Manage Layers" button
6. **Verify**: Panel opens showing all vector layers with checkboxes
7. Uncheck a layer
8. **Verify**: Layer disappears from map
9. Check it again
10. **Verify**: Layer reappears

**Success Criteria**: ✅ All vector layers visible by default, toggle works correctly

---

### Test 2: Single Health Map
**Expected**: Single health map loads, swipe reveals raster beneath.

1. Toggle "Health Maps" ON
2. **Verify**: Health map list appears
3. Check ONE health map (e.g., "2024-11-29 12:35")
4. **Verify**: Health map loads on map
5. **Verify**: Stack visualization shows 1 layer
6. Click "Swipe Mode"
7. **Verify**: Second map loads (may take 1-2 seconds)
8. **Verify**: Slider appears at 50%
9. **Verify**: Left label shows health map name and date
10. **Verify**: Right label shows raster layer name and date
11. Drag slider left/right
12. **Verify**: Left side shows health map, right side shows raster
13. Click "Exit Swipe"
14. **Verify**: Second map removed, back to single map

**Success Criteria**: ✅ Single health map swipe works, dates display correctly

---

### Test 3: Multiple Health Maps Stack
**Expected**: Multiple health maps stack correctly, swipe reveals layer beneath.

1. Toggle "Health Maps" ON
2. Check THREE health maps in order:
   - First: "2024-11-27"
   - Second: "2024-11-28"  
   - Third: "2024-11-29"
3. **Verify**: All 3 load on map
4. **Verify**: Stack visualization shows:
   - Layer 3 (Top) - 2024-11-29 - "Swipe Target"
   - Layer 2 - 2024-11-28
   - Layer 1 - 2024-11-27
5. Click "Swipe Mode"
6. **Verify**: Left label = "2024-11-29"
7. **Verify**: Right label = "2024-11-28"
8. Drag slider
9. **Verify**: Left shows Nov 29, right shows Nov 28
10. Click "Exit Swipe"
11. Uncheck "2024-11-29" (top layer)
12. **Verify**: Nov 29 removed from map
13. **Verify**: Stack now shows Layer 2 (Top) = Nov 28
14. Click "Swipe Mode" again
15. **Verify**: Left label = "2024-11-28"
16. **Verify**: Right label = "2024-11-27"
17. Drag slider
18. **Verify**: Left shows Nov 28, right shows Nov 27

**Success Criteria**: ✅ Stacking works, swipe always compares top vs beneath

---

### Test 4: Health Map + Vector Layers
**Expected**: When health map is top, swipe reveals vector beneath.

1. Toggle "Vector Layers" ON
2. Select some vector layers (e.g., "Fairways", "Greens")
3. Toggle "Health Maps" ON
4. Check ONE health map
5. **Verify**: Health map appears on top of vectors
6. Click "Swipe Mode"
7. **Verify**: Left label = Health map name/date
8. **Verify**: Right label = Vector layer name
9. Drag slider
10. **Verify**: Left shows health map, right shows vectors

**Success Criteria**: ✅ Health map on top, vector beneath visible in swipe

---

### Test 5: Opacity Control
**Expected**: Opacity slider affects all selected health maps.

1. Toggle "Health Maps" ON
2. Check TWO health maps
3. **Verify**: Both visible on map
4. Adjust opacity slider to 50%
5. **Verify**: Both health maps become semi-transparent
6. Adjust to 100%
7. **Verify**: Both become fully opaque
8. Adjust to 0%
9. **Verify**: Both become invisible

**Success Criteria**: ✅ Opacity applies to all selected health maps simultaneously

---

### Test 6: Layer Removal
**Expected**: Removing a layer updates stack and swipe correctly.

1. Toggle "Health Maps" ON
2. Check THREE health maps (A, B, C in that order)
3. **Verify**: Stack shows C (top), B, A
4. Click X button on layer B (middle layer)
5. **Verify**: B removed from map
6. **Verify**: Stack now shows C (top), A
7. Click "Swipe Mode"
8. **Verify**: Swipe compares C vs A (skips removed B)

**Success Criteria**: ✅ Removing middle layer works, stack updates correctly

---

### Test 7: Vector Layer Swipe
**Expected**: Vector layers work in swipe mode.

1. Toggle "Vector Layers" ON
2. Select multiple vector layers
3. Click "Swipe Mode"
4. **Verify**: Swipe button NOT disabled
5. **Verify**: Vector layer panel still accessible
6. **Verify**: Top vector layer is swipe target
7. **Verify**: Left label shows vector name/date
8. **Verify**: Right label shows raster name/date
9. Drag slider
10. **Verify**: Comparison works correctly

**Success Criteria**: ✅ Vector layers work in swipe mode without restrictions

---

### Test 8: Map Synchronization
**Expected**: Both maps stay synchronized during navigation.

1. Toggle "Health Maps" ON
2. Check one health map
3. Click "Swipe Mode"
4. Pan the map (drag to move)
5. **Verify**: Both sides move together
6. Zoom in/out
7. **Verify**: Both sides zoom together
8. Rotate the map (right-click + drag)
9. **Verify**: Both sides rotate together
10. Tilt the map (Ctrl + drag)
11. **Verify**: Both sides tilt together

**Success Criteria**: ✅ Maps stay perfectly synchronized

---

### Test 9: Date Display Accuracy
**Expected**: Dates match the actual layer data.

1. Toggle "Health Maps" ON
2. Note the date/time of a health map in the list
3. Check that health map
4. Click "Swipe Mode"
5. **Verify**: Left label date matches the health map's date
6. Check database `health_maps` table
7. **Verify**: `analysis_date` and `analysis_time` match label
8. Exit swipe, uncheck health map
9. Click "Swipe Mode" with only raster
10. **Verify**: Left label shows raster layer name
11. Check database `golf_course_tilesets` table
12. **Verify**: `created_at` date matches label

**Success Criteria**: ✅ Dates are fetched from correct tables and display accurately

---

### Test 10: UI Responsiveness
**Expected**: UI updates smoothly without lag.

1. Rapidly check/uncheck multiple health maps
2. **Verify**: No lag, all updates smooth
3. Rapidly toggle swipe mode on/off
4. **Verify**: No errors, clean transitions
5. Drag slider rapidly back and forth
6. **Verify**: Smooth animation, no flickering
7. Adjust opacity slider rapidly
8. **Verify**: Smooth opacity changes

**Success Criteria**: ✅ All UI interactions are smooth and responsive

---

## Edge Cases to Test

### Edge Case 1: No Layers Selected
1. Toggle "Health Maps" ON
2. Don't check any health maps
3. Click "Swipe Mode"
4. **Expected**: Swipe uses raster or vector as top layer

### Edge Case 2: Only One Raster Layer
1. Ensure only one raster layer loaded
2. Click "Swipe Mode"
3. **Expected**: Swipe still works (compares raster vs base map)

### Edge Case 3: Rapid Selection Changes
1. Rapidly check/uncheck health maps while swipe is active
2. **Expected**: No crashes, swipe target updates correctly

### Edge Case 4: All Layers Removed
1. Check multiple health maps
2. Click "Swipe Mode"
3. Uncheck all health maps while swipe is active
4. **Expected**: Swipe falls back to raster or disables gracefully

---

## Performance Testing

### Memory Usage
1. Check multiple health maps (e.g., 5 maps)
2. Enable swipe mode
3. Monitor browser memory
4. **Expected**: Memory usage reasonable (< 500MB increase)
5. Disable swipe mode
6. **Expected**: Memory released (second map removed)

### Load Time
1. Time how long it takes to:
   - Load vector layers: **Expected < 2 seconds**
   - Load health map: **Expected < 1 second**
   - Create second map for swipe: **Expected < 2 seconds**

---

## Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

---

## Known Limitations

1. **Vector Layer Reordering**: Currently selection order determines stack. Drag-and-drop reordering not implemented.
2. **Mobile Touch**: Touch gestures work but may need refinement for optimal mobile UX.
3. **Large Datasets**: Performance may degrade with 10+ health maps selected simultaneously.

---

## Reporting Issues

If you find a bug, please report:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and version
5. Console errors (if any)
6. Screenshots

---

## Success Metrics

All tests should pass with:
- ✅ No console errors
- ✅ Smooth performance
- ✅ Correct visual output
- ✅ Accurate data display
- ✅ Intuitive user experience

---

## Quick Smoke Test (5 minutes)

1. Load app → Vector layers visible ✅
2. Check 1 health map → Loads correctly ✅
3. Enable swipe → Second map appears ✅
4. Drag slider → Comparison works ✅
5. Check dates → Accurate ✅
6. Check 2 more health maps → Stack shows 3 ✅
7. Swipe → Compares top vs 2nd ✅
8. Uncheck top → Stack updates ✅
9. Adjust opacity → All maps affected ✅
10. Exit swipe → Clean cleanup ✅

If all 10 pass → **System is working correctly!** ✅
