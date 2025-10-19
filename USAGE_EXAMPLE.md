# Mapbox Golf Course Map - Usage Examples

This document provides practical examples of using the MapboxGolfCourseMap component in your React application.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Adding Tileset Metadata](#adding-tileset-metadata)
3. [Using the Component](#using-the-component)
4. [Complete Example](#complete-example)
5. [Admin Upload Interface](#admin-upload-interface)

## Basic Setup

### 1. Environment Variables

Add your Mapbox token to `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiY...your-mapbox-token
```

### 2. Database Setup

Run the SQL schema in your Supabase SQL Editor:

```bash
# Run tileset-metadata-schema.sql
```

### 3. Deploy Edge Function

Deploy the tile proxy function:

```bash
cd Phyto_Dev
supabase functions deploy tile-proxy --no-verify-jwt
```

Note: `--no-verify-jwt` allows public access to tiles (they're just map imagery). If you want authentication, remove this flag.

## Adding Tileset Metadata

### Method 1: SQL Insert

```sql
-- First, get your golf club ID
SELECT id, name FROM public.golf_clubs;

-- Insert tileset metadata
INSERT INTO public.golf_course_tilesets (
  golf_club_id,
  name,
  description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path,
  tile_url_pattern,
  tile_size,
  format,
  attribution
) VALUES (
  '12345678-1234-1234-1234-123456789012',  -- Your golf club UUID
  'Main Course - Summer 2024',
  'High-resolution aerial imagery captured in July 2024',
  33.505, 33.520,  -- min_lat, max_lat (adjust to your course)
  -111.930, -111.905,  -- min_lon, max_lon
  33.5125, -111.9175,  -- center_lat, center_lon
  14, 20, 17,  -- min_zoom, max_zoom, default_zoom
  'augusta-national-golf-club/tiles',
  '{z}/{x}/{y}.png',
  256,
  'png',
  '© Augusta National Golf Club'
);
```

### Method 2: TypeScript Service

```typescript
import { TilesetService } from '@/lib/tilesetService';

const metadata = {
  name: 'Main Course - Summer 2024',
  description: 'High-resolution aerial imagery captured in July 2024',
  bounds: {
    minLat: 33.505,
    maxLat: 33.520,
    minLon: -111.930,
    maxLon: -111.905
  },
  center: {
    lat: 33.5125,
    lon: -111.9175
  },
  zoom: {
    min: 14,
    max: 20,
    default: 17
  },
  r2FolderPath: 'augusta-national-golf-club/tiles',
  tileUrlPattern: '{z}/{x}/{y}.png',
  tileSize: 256,
  format: 'png' as const,
  attribution: '© Augusta National Golf Club'
};

const tileset = await TilesetService.createTileset(golfClubId, metadata);
```

### Method 3: Import from JSON

```typescript
import { TilesetService } from '@/lib/tilesetService';

// Load JSON file
const response = await fetch('/path/to/metadata.json');
const jsonContent = await response.text();

const tileset = await TilesetService.uploadTilesetMetadataFromJSON(
  golfClubId,
  jsonContent
);
```

## Using the Component

### Basic Usage

```tsx
import MapboxGolfCourseMap from '@/components/MapboxGolfCourseMap';

function MyGolfCoursePage() {
  const golfClubId = 'your-golf-club-uuid';
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  return (
    <div className="container mx-auto p-4">
      <h1>Course Map</h1>
      <MapboxGolfCourseMap
        golfClubId={golfClubId}
        mapboxAccessToken={mapboxToken}
      />
    </div>
  );
}
```

### With Custom Base Style

```tsx
<MapboxGolfCourseMap
  golfClubId={golfClubId}
  mapboxAccessToken={mapboxToken}
  baseStyle="mapbox://styles/mapbox/satellite-v9"  // Pure satellite
/>
```

Available Mapbox styles:
- `mapbox://styles/mapbox/satellite-streets-v12` (default - satellite with labels)
- `mapbox://styles/mapbox/satellite-v9` (pure satellite)
- `mapbox://styles/mapbox/streets-v12` (street map)
- `mapbox://styles/mapbox/outdoors-v12` (topographic)
- `mapbox://styles/mapbox/light-v11` (minimal light)
- `mapbox://styles/mapbox/dark-v11` (dark theme)

### Without Built-in Controls

```tsx
<MapboxGolfCourseMap
  golfClubId={golfClubId}
  mapboxAccessToken={mapboxToken}
  showControls={false}  // Hide zoom/navigation controls
/>
```

### Full-Screen Map

```tsx
<div className="h-screen">
  <MapboxGolfCourseMap
    golfClubId={golfClubId}
    mapboxAccessToken={mapboxToken}
    className="h-full"
  />
</div>
```

## Complete Example

Here's a complete client dashboard page with the map:

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MapboxGolfCourseMap from '@/components/MapboxGolfCourseMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface User {
  club_id: string | null;
}

export default function ClientDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: userData } = await supabase
          .from('users')
          .select('club_id')
          .eq('id', authUser.id)
          .single();

        setUser(userData);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!user?.club_id) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No golf club assigned to your account
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Course Map</h1>
        <p className="text-muted-foreground">
          View high-resolution imagery of your golf course
        </p>
      </div>

      <MapboxGolfCourseMap
        golfClubId={user.club_id}
        mapboxAccessToken={mapboxToken}
        baseStyle="mapbox://styles/mapbox/satellite-streets-v12"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View detailed information about each hole and feature
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Latest changes and improvements to course imagery
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Advanced terrain and vegetation analysis coming soon
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## Admin Upload Interface

Example admin page for uploading tiles and managing tilesets:

```tsx
import { useState } from 'react';
import { TilesetService } from '@/lib/tilesetService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AdminTilesetManagement() {
  const [golfClubId, setGolfClubId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    minLat: '',
    maxLat: '',
    minLon: '',
    maxLon: '',
    centerLat: '',
    centerLon: '',
    minZoom: '14',
    maxZoom: '20',
    defaultZoom: '17',
    r2FolderPath: '',
    attribution: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const metadata = {
      name: formData.name,
      description: formData.description,
      bounds: {
        minLat: parseFloat(formData.minLat),
        maxLat: parseFloat(formData.maxLat),
        minLon: parseFloat(formData.minLon),
        maxLon: parseFloat(formData.maxLon)
      },
      center: {
        lat: parseFloat(formData.centerLat),
        lon: parseFloat(formData.centerLon)
      },
      zoom: {
        min: parseInt(formData.minZoom),
        max: parseInt(formData.maxZoom),
        default: parseInt(formData.defaultZoom)
      },
      r2FolderPath: formData.r2FolderPath,
      tileUrlPattern: '{z}/{x}/{y}.png',
      attribution: formData.attribution
    };

    const tileset = await TilesetService.createTileset(golfClubId, metadata);
    
    if (tileset) {
      alert('Tileset created successfully!');
    } else {
      alert('Failed to create tileset');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add New Tileset</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Tileset Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Main Course - Summer 2024"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="High-resolution aerial imagery..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minLat">Min Latitude</Label>
            <Input
              id="minLat"
              type="number"
              step="0.000001"
              value={formData.minLat}
              onChange={(e) => setFormData({ ...formData, minLat: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="maxLat">Max Latitude</Label>
            <Input
              id="maxLat"
              type="number"
              step="0.000001"
              value={formData.maxLat}
              onChange={(e) => setFormData({ ...formData, maxLat: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minLon">Min Longitude</Label>
            <Input
              id="minLon"
              type="number"
              step="0.000001"
              value={formData.minLon}
              onChange={(e) => setFormData({ ...formData, minLon: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="maxLon">Max Longitude</Label>
            <Input
              id="maxLon"
              type="number"
              step="0.000001"
              value={formData.maxLon}
              onChange={(e) => setFormData({ ...formData, maxLon: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="r2FolderPath">R2 Folder Path</Label>
          <Input
            id="r2FolderPath"
            value={formData.r2FolderPath}
            onChange={(e) => setFormData({ ...formData, r2FolderPath: e.target.value })}
            placeholder="pine-valley-golf-club/tiles"
            required
          />
        </div>

        <Button type="submit" className="w-full">
          Create Tileset
        </Button>
      </form>
    </div>
  );
}
```

## Uploading Tiles to R2

### Using Cloudflare Dashboard

1. Log in to Cloudflare Dashboard
2. Navigate to R2 → Your Bucket
3. Create folder structure: `{golf-course-name}/tiles/`
4. Upload tiles maintaining the z/x/y.png structure

### Using AWS CLI (Recommended)

```bash
# Configure AWS CLI for R2
aws configure --profile r2
# Enter your R2 access key ID and secret

# Upload tiles
aws s3 sync ./local-tiles/ s3://map-stats-tiles-prod/pine-valley-golf-club/tiles/ \
  --endpoint-url=https://<your-account-id>.r2.cloudflarestorage.com \
  --profile=r2 \
  --content-type "image/png"
```

## Troubleshooting

### Map doesn't load

1. Check console for errors
2. Verify Mapbox token is set in `.env`
3. Check that tileset exists for the golf club ID

### Tiles don't show

1. Verify tiles are uploaded to correct R2 path
2. Check tile-proxy function is deployed
3. Verify R2 credentials in Supabase edge function secrets
4. Check browser network tab for 404s

### Tiles in wrong location

1. Verify bounds are correct (min < max)
2. Check that tiles were generated with correct projection (Web Mercator EPSG:3857)
3. Verify center coordinates are within bounds


