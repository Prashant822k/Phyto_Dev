# Large Tile Upload (4500+ tiles)

For 4500+ tiles, browser upload has limitations. Use CLI upload instead:

## Option 1: AWS CLI (Recommended)

```bash
# Install AWS CLI
# Windows: https://aws.amazon.com/cli/
# Mac: brew install awscli

# Configure for R2
aws configure --profile r2
# Enter:
# Access Key: YOUR_R2_ACCESS_KEY
# Secret Key: YOUR_R2_SECRET_KEY
# Region: auto

# Upload entire folder
aws s3 sync ./your-tiles-folder/ s3://map-stats-tiles-prod/your-golf-club/tiles/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --profile r2 \
  --content-type "image/png"
```

Replace:
- `YOUR_ACCOUNT_ID`: Your Cloudflare account ID
- `your-tiles-folder/`: Path to your local tiles
- `your-golf-club`: Sanitized golf club name

## Option 2: Rclone (Faster)

```bash
# Install rclone
# https://rclone.org/install/

# Configure
rclone config
# Choose: s3
# Provider: Cloudflare
# Enter R2 credentials

# Upload
rclone sync ./your-tiles-folder/ r2:map-stats-tiles-prod/your-golf-club/tiles/ \
  --progress \
  --transfers 32
```

## After CLI Upload

1. Create `metadata.json` locally
2. Use admin UI to **just upload metadata** (skip tile upload)
3. Or insert tileset directly in database:

```sql
INSERT INTO golf_course_tilesets (
  golf_club_id,
  name,
  description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path,
  tile_url_pattern
) VALUES (
  'your-club-id',
  'Main Course',
  'Description',
  33.505, 33.520, -111.930, -111.905,
  33.5125, -111.9175,
  14, 20, 17,
  'your-golf-club/tiles',
  '{z}/{x}/{y}.png'
);
```

## Estimate Upload Time

- 4553 tiles × 50KB avg = ~225MB
- AWS CLI: ~5-10 minutes
- Rclone (32 parallel): ~2-3 minutes
- Browser: 30+ minutes (if it works)

**Recommendation**: Use Rclone for large uploads.

