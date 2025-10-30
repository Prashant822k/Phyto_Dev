# Quick Start: Upload Your Tile Folder

## What You Need

1. **Your tiles folder** with z/x/y.png structure
2. **A metadata.json file** describing the tileset

## Step 1: Prepare metadata.json

Create a `metadata.json` file in your tiles root folder:

```json
{
  "name": "Your Golf Club - Main Course",
  "description": "High-resolution aerial imagery",
  "bounds": [-111.930, 33.505, -111.905, 33.520],
  "center": [-111.9175, 33.5125, 17],
  "minzoom": 14,
  "maxzoom": 20,
  "tileSize": 256,
  "attribution": "© Your Golf Club"
}
```

**Field Guide:**
- `bounds`: [minLon, minLat, maxLon, maxLat]
- `center`: [lon, lat, defaultZoom]
- `minzoom`/`maxzoom`: Zoom levels where tiles exist
- `tileSize`: Usually 256 or 512

## Step 2: Upload via Admin Dashboard

1. Log in as admin
2. Go to **Upload Tiles** tab
3. Select your **golf course**
4. Click **"Choose Folder"** and select your tiles directory
5. Upload your **metadata.json** file
6. Click **"Upload [N] Tiles"**

## What Happens

- All tiles upload to R2 maintaining z/x/y structure
- Metadata creates a tileset entry in the database
- Clients can view the map immediately after upload

## Folder Structure (Before & After)

**Your Local Folder:**
```
my-golf-course-tiles/
├── metadata.json
├── 14/
│   └── 4823/
│       ├── 6209.png
│       └── 6210.png
├── 15/
│   └── 9646/
│       └── 12418.png
└── 16/
    └── ...
```

**In R2 After Upload:**
```
map-stats-tiles-prod/
└── your-golf-course/
    └── tiles/
        ├── 14/
        │   └── 4823/
        │       ├── 6209.png
        │       └── 6210.png
        ├── 15/
        │   └── 9646/
        │       └── 12418.png
        └── 16/
            └── ...
```

## Alternative: Simpler metadata.json

You can also use a simpler format:

```json
{
  "name": "Summer 2024",
  "minLat": 33.505,
  "maxLat": 33.520,
  "minLon": -111.930,
  "maxLon": -111.905,
  "centerLat": 33.5125,
  "centerLon": -111.9175,
  "minZoom": 14,
  "maxZoom": 20,
  "defaultZoom": 17
}
```

Both formats work - the uploader auto-detects which you're using.

## Tips

- **Large uploads**: Browser might timeout for 1000+ tiles. Upload in batches if needed.
- **File path**: Make sure to select the folder containing your z/ directories
- **Metadata**: The component will show a preview after you upload metadata.json
- **Progress**: Watch the progress bar - it shows current file being uploaded

## Troubleshooting

**Folder upload not working?**
- Use Chrome or Edge (Safari/Firefox may not support folder upload)
- Make sure you're selecting the folder, not individual files

**Upload stuck?**
- Check browser console for errors
- Verify R2 credentials in Supabase edge function
- Try uploading a small batch first (one zoom level)

**Tiles don't show on map?**
- Verify bounds are correct (minLat < maxLat, minLon < maxLon)
- Check tile-proxy edge function is deployed
- Inspect network tab - tiles should return 200 or show placeholder

## Next: View Your Map

After upload, clients assigned to that golf club will see the tileset in their dashboard map!

Admins can preview by using the MapboxGolfCourseMap component:

```tsx
<MapboxGolfCourseMap
  golfClubId="your-club-uuid"
  mapboxAccessToken={yourToken}
/>
```

