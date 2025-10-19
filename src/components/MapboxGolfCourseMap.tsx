import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Layers, ZoomIn, ZoomOut, Maximize2, AlertCircle } from 'lucide-react';
import { TilesetService } from '@/lib/tilesetService';
import { R2Service } from '@/lib/r2Service';
import type { Database } from '@/lib/supabase';

type GolfCourseTileset = Database['public']['Tables']['golf_course_tilesets']['Row'];

interface MapboxGolfCourseMapProps {
  golfClubId: string;
  mapboxAccessToken: string;
  baseStyle?: string; // Default: "mapbox://styles/mapbox/satellite-streets-v12"
  showControls?: boolean;
  className?: string;
}

const MapboxGolfCourseMap = ({
  golfClubId,
  mapboxAccessToken,
  baseStyle = 'mapbox://styles/mapbox/satellite-streets-v12',
  showControls = true,
  className = ''
}: MapboxGolfCourseMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [tileset, setTileset] = useState<GolfCourseTileset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [showOverlay, setShowOverlay] = useState(true);

  // Set Mapbox access token
  mapboxgl.accessToken = mapboxAccessToken;

  // Load tileset metadata
  useEffect(() => {
    const loadTileset = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const tilesetData = await TilesetService.getTilesetForGolfClub(golfClubId);
        
        if (!tilesetData) {
          setError('No tileset found for this golf course');
          setIsLoading(false);
          return;
        }

        setTileset(tilesetData);
      } catch (err) {
        console.error('Failed to load tileset:', err);
        setError('Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };

    loadTileset();
  }, [golfClubId]);

  // Initialize map and add custom tile overlay
  useEffect(() => {
    if (!mapContainer.current || !tileset || map.current) return;

    try {
      // Initialize the map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: baseStyle,
        center: [tileset.center_lon, tileset.center_lat],
        zoom: tileset.default_zoom,
        minZoom: tileset.min_zoom,
        maxZoom: tileset.max_zoom,
        bounds: [
          [tileset.min_lon, tileset.min_lat],
          [tileset.max_lon, tileset.max_lat]
        ],
        fitBoundsOptions: {
          padding: 50
        }
      });

      // Add navigation controls
      if (showControls) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      }

      // Track zoom changes
      map.current.on('zoom', () => {
        if (map.current) {
          setCurrentZoom(Math.round(map.current.getZoom()));
        }
      });

      // Wait for map to load, then add custom tile layer
      map.current.on('load', async () => {
        if (!map.current || !tileset) return;

        // Use Supabase edge function as tile proxy
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy/${tileset.r2_folder_path}/${tileset.tile_url_pattern}`;
        
        map.current!.addSource('golf-course-tiles', {
          type: 'raster',
          tiles: [tileUrlTemplate],
          tileSize: tileset.tile_size || 256,
          minzoom: tileset.min_zoom,
          maxzoom: tileset.max_zoom,
          bounds: [
            tileset.min_lon,
            tileset.min_lat,
            tileset.max_lon,
            tileset.max_lat
          ]
        });

        map.current!.addLayer({
          id: 'golf-course-overlay',
          type: 'raster',
          source: 'golf-course-tiles',
          paint: {
            'raster-opacity': 0.85
          }
        });
      });

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [tileset, baseStyle, showControls]);

  // Toggle overlay visibility
  const toggleOverlay = () => {
    if (!map.current) return;
    
    const newVisibility = !showOverlay;
    map.current.setLayoutProperty(
      'golf-course-overlay',
      'visibility',
      newVisibility ? 'visible' : 'none'
    );
    setShowOverlay(newVisibility);
  };

  // Zoom controls
  const zoomIn = () => {
    map.current?.zoomIn();
  };

  const zoomOut = () => {
    map.current?.zoomOut();
  };

  const resetView = () => {
    if (!map.current || !tileset) return;
    
    map.current.flyTo({
      center: [tileset.center_lon, tileset.center_lat],
      zoom: tileset.default_zoom,
      essential: true
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="animate-spin w-16 h-16 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <h3 className="text-lg font-medium">Loading Map</h3>
            <p className="text-muted-foreground">Fetching golf course data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !tileset) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium">Map Not Available</h3>
            <p className="text-muted-foreground">
              {error || 'No map data found for this golf course'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {tileset.name}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Zoom: {currentZoom}
            </Badge>
            {tileset.attribution && (
              <Badge variant="outline" className="text-xs">
                {tileset.attribution}
              </Badge>
            )}
          </div>
        </CardTitle>

        {/* Map Controls */}
        {showControls && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant={showOverlay ? 'default' : 'outline'}
                size="sm"
                onClick={toggleOverlay}
              >
                <Layers className="w-4 h-4 mr-1" />
                {showOverlay ? 'Hide' : 'Show'} Overlay
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetView}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div 
          ref={mapContainer} 
          className="w-full h-[600px] rounded-lg overflow-hidden border"
        />
        {tileset.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {tileset.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MapboxGolfCourseMap;

