# 🧪 Quick Test Guide - Layer Selection & Swipe

## 🚀 Quick Start (5 Minutes)

### Step 1: Run Database Migration (1 min)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `add-datetime-to-tilesets.sql`
3. Click **Run**
4. ✅ Should see "Success. No rows returned"

### Step 2: Create Test Data (2 min)

1. In **Supabase SQL Editor**, run:
   ```sql
   SELECT id, golf_club_id, name FROM golf_course_tilesets ORDER BY created_at DESC LIMIT 1;
   ```

2. Copy the `id` value

3. Open `create-test-tilesets.sql`

4. Replace **all 3 instances** of `'YOUR_TILESET_ID'` with your actual ID

5. Run the modified SQL in Supabase

6. ✅ Should see 2 new rows inserted

### Step 3: Start Dev Server (1 min)

```bash
npm run dev
```

### Step 4: Test the UI (1 min)

1. Open browser: `http://localhost:5173/test-layers`

2. **You should see:**
   - Golf course selector dropdown
   - Map component loading
   - "Layers" button showing count (e.g., "Layers (3)")

3. **Click "Layers" button:**
   - Layer selector panel appears
   - See your tilesets with dates/times
   - Toggle switches for each layer

4. **Enable 2 layers:**
   - Click toggle switches to enable 2 layers
   - "Swipe Compare" button appears

5. **Test swipe:**
   - Click "Swipe Compare"
   - Drag the vertical slider left/right
   - See layers switch as you drag

---

## ✅ What Should Work

| Feature | Expected Behavior |
|---------|-------------------|
| **Layer Selector** | Shows all tilesets with dates/times |
| **Toggle Switches** | Enable/disable individual layers |
| **Layer Counter** | Shows "X/2" selected layers |
| **Swipe Button** | Appears when exactly 2 layers selected |
| **Swipe Slider** | Draggable vertical line with handle |
| **Layer Comparison** | Left/right sides show different layers |

---

## 🎯 Testing Checklist

- [ ] Database migration ran without errors
- [ ] 2+ test tilesets created successfully
- [ ] Dev server running (`npm run dev`)
- [ ] Test page loads at `/test-layers`
- [ ] Map component displays
- [ ] "Layers" button shows correct count
- [ ] Layer selector opens when clicked
- [ ] Tilesets show with dates and times
- [ ] Can toggle layers on/off
- [ ] Maximum 2 layers can be selected
- [ ] "Swipe Compare" button appears with 2 layers
- [ ] Swipe slider is draggable
- [ ] Layers switch as slider moves

---

## 📸 Expected UI

### Layer Selector Panel
```
┌─────────────────────────────────┐
│ Map Overlays              [2/2] │
├─────────────────────────────────┤
│ Golf Course Name                │
│                                 │
│ 📅 Nov 3, 2024  🕐 14:30  [ON] │
│ Test Flight - November 3rd      │
│                                 │
│ 📅 Nov 1, 2024  🕐 10:30  [ON] │
│ Test Flight - November 1st      │
│                                 │
│ (No date)               [OFF]   │
│ Original tileset                │
└─────────────────────────────────┘
```

### Map Controls
```
┌─────────────────────────────────┐
│ [Layers (3)]  [Swipe Compare]   │
│                    [−] [+] [⛶]  │
└─────────────────────────────────┘
```

### Swipe Mode Active
```
┌─────────────────────────────────┐
│        MAP         │    MAP     │
│     (Layer 1)      │ (Layer 2)  │
│                    │            │
│                   ◉◉◉           │
│                    │            │
│                    │            │
└─────────────────────────────────┘
         ← Drag slider →
```

---

## 🐛 Troubleshooting

### Issue: "No tilesets found"

**Check:**
```sql
SELECT COUNT(*) FROM golf_course_tilesets;
```

**Solution:** Run `create-test-tilesets.sql` to create test data

---

### Issue: Layers button shows "Layers (0)"

**Check:**
```sql
SELECT golf_club_id FROM golf_course_tilesets LIMIT 1;
```

**Solution:** Make sure the golf_club_id in the dropdown matches your tilesets

---

### Issue: Swipe button doesn't appear

**Check:** Exactly 2 layers must be toggled ON

**Solution:** 
1. Click layer selector
2. Turn OFF all layers
3. Turn ON exactly 2 layers
4. Swipe button should appear

---

### Issue: TypeScript errors

**Solution:**
```bash
npm install
```

---

### Issue: Map doesn't load

**Check console for errors:**
- Missing Mapbox token?
- Network errors?
- Authentication errors?

**Solution:**
1. Check `.env` file has `VITE_MAPBOX_ACCESS_TOKEN`
2. Check Supabase connection
3. Check browser console for specific errors

---

### Issue: Tiles don't show

**This is expected!** 

The tiles won't load because:
1. Test tilesets use the same `r2_folder_path`
2. Tile upload hasn't been updated yet
3. This is just testing the **UI functionality**

**What works:** Layer selection, swipe slider, UI interactions  
**What doesn't work yet:** Actual different tile imagery

---

## 🎨 UI Components Tested

### ✅ LayerSelector Component
- **Location:** `src/components/LayerSelector.tsx`
- **Features:**
  - Displays all tilesets
  - Groups by base name
  - Shows date/time with icons
  - Toggle switches
  - Selection counter
  - Max 2 layers limit

### ✅ MapSwipeControl Component
- **Location:** `src/components/MapSwipeControl.tsx`
- **Features:**
  - Toggle button
  - Draggable slider
  - Visual handle
  - Left/right layer comparison

### ✅ MapboxGolfCourseMap Component
- **Location:** `src/components/MapboxGolfCourseMap.tsx`
- **Features:**
  - Multi-layer support
  - Dynamic layer loading
  - Layer visibility control
  - Integration with LayerSelector
  - Integration with MapSwipeControl

---

## 📊 Verify Data

### Check tilesets were created:
```sql
SELECT 
  name,
  description,
  flight_date,
  flight_time,
  flight_datetime,
  is_active
FROM golf_course_tilesets
ORDER BY flight_datetime DESC NULLS LAST;
```

### Check trigger is working:
```sql
-- flight_datetime should be automatically calculated
SELECT 
  flight_date,
  flight_time,
  flight_datetime
FROM golf_course_tilesets
WHERE flight_date IS NOT NULL;
```

Expected: `flight_datetime` = `flight_date` + `flight_time`

---

## 🎯 Next Steps After Testing

Once UI testing is complete:

1. ✅ **Verify layer selection works**
2. ✅ **Verify swipe comparison works**
3. ⏭️ **Fix tile upload** to support date/time paths
4. ⏭️ **Upload real tiles** with new structure
5. ⏭️ **Test with actual imagery** from different dates

---

## 📝 Notes

- **Test tilesets use same R2 path** - This is intentional for UI testing
- **Tiles will look identical** - Because they point to same files
- **UI functionality is what we're testing** - Not the actual imagery
- **Real tiles need new upload flow** - See `R2_UPLOAD_VERIFICATION.md`

---

## 🆘 Need Help?

1. Check browser console for errors
2. Check Supabase logs
3. Verify database migration ran successfully
4. Ensure test data was created
5. Check all environment variables are set

---

**Ready to test?** 

1. ✅ Run migration
2. ✅ Create test data  
3. ✅ Start dev server
4. ✅ Visit `/test-layers`
5. ✅ Test layer selection
6. ✅ Test swipe comparison

**Let me know what you see!** 🚀
