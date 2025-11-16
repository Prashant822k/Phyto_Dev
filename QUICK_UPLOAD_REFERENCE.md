# 🚀 Quick Upload Reference Card

## For test20 Golf Course

### **What You'll See on Frontend**

```
┌─────────────────────────────────────────────────────────┐
│ Upload Map Tiles                                        │
│                                                         │
│ Path format: course-id/YYYY-MM-DD/HH-MM/tiles/z/x/y.png
│                                                         │
│ Course ID: [test20                                   ]  │
│ Flight Date: [2024-11-05]  Flight Time: [14:30     ]  │
│                                                         │
│ ℹ️ test20/2024-11-05/14-30/tiles/z/x/y.png            │
│                                                         │
│ [📦 Select ZIP]  [📁 Select Folder]                    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Upload Steps (3 Minutes)

### **1. Deploy Edge Function** (One-time)
```bash
npx supabase functions deploy r2-sign
```

### **2. Go to Upload Page**
```
http://localhost:5173/tile-upload
```

### **3. Fill Form**
```
Course ID: test20
Flight Date: 2024-11-05  ← Match your metadata!
Flight Time: 14:30       ← Match your metadata!
```

### **4. Verify Path**
```
✓ Shows: test20/2024-11-05/14-30/tiles/z/x/y.png
```

### **5. Upload Tiles**
```
Click: Select ZIP or Select Folder
Choose: Your tiles file/folder
Wait: Upload completes
```

### **6. Success**
```
✓ Upload successful!
1234 tiles uploaded to test20
```

---

## 📁 Tile Structure Required

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
    10484/
      25326.png
  ...
  20/
    (zoom 20 tiles)
```

**Options:**
- Compress to `tiles.zip` → Upload ZIP
- Keep as folder → Upload Folder

---

## 🔑 Critical Points

| Item | Value | Why |
|------|-------|-----|
| **Course ID** | `test20` | Must match golf course name |
| **Flight Date** | `2024-11-05` | Must match metadata date |
| **Flight Time** | `14:30` | Must match metadata time |
| **Tile Structure** | `z/x/y.png` | Required format |
| **Zoom Levels** | 14-20 | All levels in one upload |

---

## 🎯 Expected Result

### **In R2 Bucket:**
```
test20/2024-11-05/14-30/tiles/
  14/2621/6331.png
  15/5242/12663.png
  15/5242/12664.png
  16/10485/25327.png
  ...
  20/(zoom 20 tiles)
```

### **On Map:**
```
Primary Layer: 📅 Nov 5, 2024  🕐 14:30
Map displays all tiles at all zoom levels
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Tiles go to old path | Deploy edge function: `npx supabase functions deploy r2-sign` |
| Date/time mismatch | Use exact same date/time as metadata |
| "No tiles found" | Check z/x/y structure and .png format |
| Tiles not showing on map | Upload metadata with same date/time |

---

## 📋 Pre-Upload Checklist

- [ ] Edge function deployed
- [ ] Metadata uploaded (test20, 2024-11-05, 14:30)
- [ ] Tiles ready (z/x/y structure)
- [ ] Date matches metadata
- [ ] Time matches metadata
- [ ] Logged in

---

## 🚀 Go Upload!

```
1. npx supabase functions deploy r2-sign
2. Go to http://localhost:5173/tile-upload
3. Enter: test20, 2024-11-05, 14:30
4. Upload tiles
5. View on map
```

**Done in 5 minutes!** ✨
