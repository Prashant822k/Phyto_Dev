# Mapbox Integration Setup Guide

This guide will help you set up Mapbox integration for the PhytoMaps application.

## Prerequisites

- Mapbox account (free tier available)
- Access to Mapbox dashboard
- Mapbox access token

## Step 1: Create Mapbox Account

1. Go to [Mapbox](https://www.mapbox.com/)
2. Click **Sign up** to create a free account
3. Verify your email address
4. Complete the account setup

## Step 2: Generate Access Token

1. Log in to your Mapbox account
2. Go to [Account page](https://account.mapbox.com/)
3. Navigate to **Access tokens**
4. Copy your **Default public token** or create a new one
5. Note: The token should start with `pk.`

## Step 3: Configure Environment Variables

Update your `.env` file with the Mapbox token:

```env
# Mapbox Configuration
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
```

## Step 4: Test Mapbox Integration

1. Start your development server: `npm run dev`
2. Open the application in your browser
3. Navigate to the dashboard
4. Upload a PNG tile or use the demo data generator
5. The map should display with Mapbox base layers

## Map Styles Available

The application supports three map styles:

1. **Terrain** (`mapbox://styles/mapbox/outdoors-v12`)
   - Best for agricultural analysis
   - Shows terrain features and elevation

2. **Satellite** (`mapbox://styles/mapbox/satellite-v9`)
   - High-resolution satellite imagery
   - Good for detailed analysis

3. **Hybrid** (`mapbox://styles/mapbox/satellite-streets-v12`)
   - Satellite imagery with street labels
   - Combines imagery with navigation features

## Custom Map Styles (Optional)

To use custom map styles:

1. Go to [Mapbox Studio](https://studio.mapbox.com/)
2. Create a new style or duplicate an existing one
3. Customize the style for your needs
4. Publish the style
5. Copy the style URL
6. Update the `getMapStyle()` function in `MapboxMap.tsx`

## Features Implemented

### Base Map Integration
- ✅ Mapbox GL JS integration
- ✅ Multiple map styles (terrain, satellite, hybrid)
- ✅ Zoom and pan controls
- ✅ Responsive design

### PNG Tile Overlay
- ✅ Raster source integration
- ✅ Custom tile opacity
- ✅ Geographic positioning

### Interactive Features
- ✅ Zone markers with health indicators
- ✅ Popup information on click
- ✅ Hover tooltips
- ✅ Legend display

### Real-time Updates
- ✅ Processing status overlays
- ✅ Dynamic marker updates
- ✅ Error handling

## Customization Options

### Map Controls
```typescript
// Customize zoom levels
const [viewState, setViewState] = useState({
  longitude: 77.5946,
  latitude: 12.9716,
  zoom: 15, // Adjust initial zoom
  minZoom: 10, // Minimum zoom level
  maxZoom: 20  // Maximum zoom level
});
```

### Marker Styling
```typescript
// Customize marker appearance
const getHealthColor = (health: string) => {
  switch (health) {
    case "healthy": return "#22c55e";
    case "moderate": return "#f59e0b";
    case "poor": return "#ef4444";
    default: return "#6b7280";
  }
};
```

### Popup Content
```typescript
// Customize popup information
<Popup
  longitude={zone.lng}
  latitude={zone.lat}
  onClose={() => setSelectedZone(null)}
>
  {/* Custom popup content */}
</Popup>
```

## Performance Optimization

### Tile Loading
- Use appropriate zoom levels for your data
- Implement tile caching
- Consider tile size optimization

### Marker Clustering
For large datasets, implement marker clustering:

```typescript
import { Cluster } from 'react-map-gl';

<Cluster>
  {/* Your markers */}
</Cluster>
```

## Troubleshooting

### Common Issues

1. **"Mapbox Token Required" error**
   - Check that `VITE_MAPBOX_ACCESS_TOKEN` is set
   - Verify the token is valid and active
   - Ensure the token has the correct permissions

2. **Map not loading**
   - Check browser console for errors
   - Verify internet connection
   - Check if the token has expired

3. **Tiles not displaying**
   - Verify PNG tile URLs are accessible
   - Check CORS settings for tile servers
   - Ensure tile format is compatible

### Debug Steps

1. Check if Mapbox token is loaded:
   ```javascript
   console.log('Mapbox Token:', import.meta.env.VITE_MAPBOX_ACCESS_TOKEN);
   ```

2. Verify map initialization:
   ```javascript
   // Add to MapboxMap component
   useEffect(() => {
     console.log('Map initialized with token:', mapboxToken);
   }, [mapboxToken]);
   ```

3. Test tile loading:
   ```javascript
   // Check if tiles are accessible
   fetch(imageUrl)
     .then(response => console.log('Tile accessible:', response.ok))
     .catch(error => console.error('Tile error:', error));
   ```

## Security Considerations

1. **Never expose private tokens** in client-side code
2. **Use public tokens** for frontend applications
3. **Set up token restrictions** in Mapbox dashboard
4. **Monitor token usage** and set up alerts
5. **Rotate tokens regularly**

## Cost Management

### Free Tier Limits
- 50,000 map loads per month
- 50,000 geocoding requests per month
- 50,000 directions requests per month

### Optimization Tips
1. **Cache map tiles** when possible
2. **Use appropriate zoom levels** to reduce tile requests
3. **Implement user-based rate limiting**
4. **Monitor usage** in Mapbox dashboard

## Advanced Features

### Custom Layers
```typescript
// Add custom data layers
<Source id="custom-data" type="geojson" data={geoJsonData}>
  <Layer
    id="custom-layer"
    type="fill"
    paint={{
      'fill-color': '#ff0000',
      'fill-opacity': 0.5
    }}
  />
</Source>
```

### Real-time Data
```typescript
// Update markers in real-time
useEffect(() => {
  const interval = setInterval(() => {
    // Update marker positions
    setMarkers(updatedMarkers);
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

## Support

For Mapbox-related issues:
1. Check [Mapbox documentation](https://docs.mapbox.com/)
2. Visit [Mapbox support](https://support.mapbox.com/)
3. Check [Mapbox community forum](https://community.mapbox.com/)

For application-specific issues:
1. Check browser console for errors
2. Verify environment variables
3. Test with different map styles
4. Check network connectivity
