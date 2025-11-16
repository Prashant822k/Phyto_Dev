# 🚀 Upload Tiles with Date/Time - Complete Guide

## Your Current Situation

✅ **Golf Course Created:** test20  
✅ **User Assigned:** 125@gmail.com  
✅ **Metadata Uploaded:** With date/time  
❓ **Tiles Upload:** Need to upload with date/time structure  

---

## ⚠️ IMPORTANT: Deploy Edge Function First

Before uploading tiles, you **MUST** deploy the updated `r2-sign` edge function that supports date/time paths.

### **Step 1: Deploy Edge Function**

Open terminal and run:

```bash
cd "c:\Users\PRASHANT KUMAR\Desktop\new\Phyto_Dev"
npx supabase functions deploy r2-sign
```

**Expected Output:**
```
Deploying r2-sign (project ref: your-project-ref)
✓ Deployed r2-sign function
```

**Why?** The edge function generates presigned URLs for R2 uploads. Without deploying it, tiles will go to the old path structure.

---

## 📋 Complete Upload Process

### **Step 2: Prepare Your Tiles**

Your tiles should be in this structure:

```
tiles/
  14/
    2621/
      6331.png
  15/
    5242/
      12663.png
      12664.png
  16/
    10485/
      25327.png
  ...
  20/
    (zoom 20 tiles)
```

**Options:**
1. **ZIP File:** Compress the entire `tiles` folder into `tiles.zip`
2. **Folder:** Keep as a folder (browser will upload all files)

---

### **Step 3: Go to Tile Upload Page**

Navigate to:
```
http://localhost:5173/tile-upload
```

Or wherever your `TileUploadComponent` is mounted.

---

### **Step 4: Fill in the Form**

#### **Course ID:**
```
test20
```
*(Must match your golf course name)*

#### **Flight Date:**
```
2024-11-05
```
*(Or whatever date you used in metadata)*

#### **Flight Time:**
```
14:30
```
*(Or whatever time you used in metadata)*

**CRITICAL:** The date and time here **MUST MATCH** what you entered in the TilesetMetadataUploader!

---

### **Step 5: Verify R2 Path Preview**

You should see:
```
New Structure: Tiles will be uploaded to
test20/2024-11-05/14-30/tiles/z/x/y.png
```

**Check:**
- ✅ Course ID is correct
- ✅ Date matches metadata
- ✅ Time matches metadata (with colon replaced by hyphen)

---

### **Step 6: Upload Tiles**

**Option A: ZIP File**
1. Click **"Select ZIP"** button
2. Choose your `tiles.zip` file
3. Wait for upload to complete

**Option B: Folder**
1. Click **"Select Folder"** button
2. Choose your `tiles` folder
3. Browser will read all files
4. Wait for upload to complete

---

### **Step 7: Monitor Progress**

You'll see:
```
Uploading tiles...
[Progress Bar]
45.2%
15/5242/12663.png
```

**Wait until:**
```
✓ Upload successful!
1234 tiles uploaded to test20
```

---

### **Step 8: Verify in R2**

Your tiles should now be in R2 at:
```
test20/2024-11-05/14-30/tiles/
  14/
    2621/
      6331.png
  15/
    5242/
      12663.png
  ...
```

---

### **Step 9: View on Map**

1. Go to your map page
2. Select golf course: **test20**
3. You should see your tileset in the dropdown:
   ```
   📅 Nov 5, 2024  🕐 14:30
   ```
4. Map displays your tiles!

---

## 🔍 Troubleshooting

### **Problem: "Upload failed" error**

**Possible Causes:**

1. **Edge function not deployed**
   ```bash
   npx supabase functions deploy r2-sign
   ```

2. **Date/time mismatch**
   - Check metadata date/time
   - Check upload form date/time
   - They must match exactly

3. **Wrong course ID**
   - Must match golf course name
   - Use lowercase with hyphens

4. **Not authenticated**
   - Make sure you're logged in
   - Check browser console for auth errors

---

### **Problem: Tiles go to wrong path**

**Symptom:** Tiles uploaded to `test20/tiles/` instead of `test20/2024-11-05/14-30/tiles/`

**Solution:**
1. Edge function not deployed → Deploy it
2. Date/time fields empty → Fill them in
3. Old browser cache → Hard refresh (Ctrl+Shift+R)

---

### **Problem: "No tiles found" error**

**Symptom:** Upload says "No tiles found in ZIP/folder"

**Solution:**
1. Check tile structure is `z/x/y.png`
2. Make sure files are `.png` format
3. Verify folder structure:
   ```
   tiles/
     15/
       5242/
         12663.png  ← Must be at this depth
   ```

---

### **Problem: Tiles uploaded but not showing on map**

**Possible Causes:**

1. **Metadata not uploaded**
   - Go to TilesetMetadataUploader
   - Upload metadata.json with same date/time

2. **Date/time mismatch**
   - Metadata date: 2024-11-05
   - Tiles date: 2024-11-06 ← MISMATCH!
   - They must be identical

3. **Tileset not active**
   - Check database: `golf_course_tilesets`
   - Verify `is_active = true`

---

## ✅ Complete Checklist

Before uploading tiles:

- [ ] Edge function deployed (`npx supabase functions deploy r2-sign`)
- [ ] Metadata uploaded with date/time
- [ ] Golf course exists (test20)
- [ ] User assigned (125@gmail.com)
- [ ] Tiles prepared in z/x/y.png structure
- [ ] Date matches metadata date
- [ ] Time matches metadata time
- [ ] Logged in to application

During upload:

- [ ] Course ID entered: test20
- [ ] Flight Date entered: (same as metadata)
- [ ] Flight Time entered: (same as metadata)
- [ ] R2 path preview shows correct structure
- [ ] ZIP or folder selected
- [ ] Upload progress shows
- [ ] Success message appears

After upload:

- [ ] Check R2 bucket for correct path
- [ ] Go to map page
- [ ] Select test20 golf course
- [ ] See tileset in dropdown
- [ ] Map displays tiles
- [ ] Zoom in/out works
- [ ] All zoom levels (14-20) work

---

## 📝 Example: Complete Workflow

### **Your Specific Case:**

```
Golf Course: test20
User: 125@gmail.com
Metadata Date: 2024-11-05 (example)
Metadata Time: 14:30 (example)
```

### **Step-by-Step:**

1. **Deploy edge function:**
   ```bash
   npx supabase functions deploy r2-sign
   ```

2. **Go to tile upload:**
   ```
   http://localhost:5173/tile-upload
   ```

3. **Fill form:**
   - Course ID: `test20`
   - Flight Date: `2024-11-05`
   - Flight Time: `14:30`

4. **Verify preview:**
   ```
   test20/2024-11-05/14-30/tiles/z/x/y.png
   ```

5. **Upload tiles:**
   - Click "Select ZIP" or "Select Folder"
   - Choose your tiles
   - Wait for completion

6. **Verify success:**
   ```
   ✓ Upload successful!
   1234 tiles uploaded to test20
   ```

7. **Check map:**
   - Go to map page
   - Select test20
   - See: 📅 Nov 5, 2024  🕐 14:30
   - Map displays tiles

---

## 🎯 Quick Command Reference

```bash
# Deploy edge function
npx supabase functions deploy r2-sign

# Start dev server (if not running)
npm run dev

# Check Supabase status
npx supabase status

# View edge function logs
npx supabase functions logs r2-sign
```

---

## 📞 Need Help?

If you encounter issues:

1. **Check browser console** (F12) for errors
2. **Check edge function logs:**
   ```bash
   npx supabase functions logs r2-sign
   ```
3. **Verify database:**
   - Check `golf_course_tilesets` table
   - Verify `r2_folder_path` includes date/time
4. **Check R2 bucket** in Cloudflare dashboard

---

## 🚀 Ready to Upload!

You have everything you need:

✅ Component supports date/time  
✅ Edge function code ready  
✅ Database schema ready  
✅ Golf course created  
✅ Metadata uploaded  

**Next Step:** Deploy the edge function and upload your tiles!

```bash
npx supabase functions deploy r2-sign
```

Then go to `/tile-upload` and follow the steps above! 🎉
