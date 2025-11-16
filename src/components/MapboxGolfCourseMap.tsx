import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Layers, ZoomIn, ZoomOut, Maximize2, AlertCircle } from 'lucide-react';
import { TilesetService } from '@/lib/tilesetService';
import { supabase } from '@/lib/supabase';
import DateLayerDropdown from '@/components/DateLayerDropdown';
import MapSwipeControl from '@/components/MapSwipeControl';
import type { Database } from '@/lib/supabase';

type GolfCourseTileset = Database['public']['Tables']['golf_course_tilesets']['Row'];

interface MapboxGolfCourseMapProps {
  golfClubId: string;
  mapboxAccessToken: string;
  baseStyle?: string;
  showControls?: boolean;
  className?: string;
  // Map sync callback
  onMapReady?: (map: mapboxgl.Map) => void;
}

const MapboxGolfCourseMap = ({
  golfClubId,
  mapboxAccessToken,
  baseStyle = 'mapbox://styles/mapbox/satellite-streets-v12',
  showControls = true,
  className = '',
  onMapReady
}: MapboxGolfCourseMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [tilesets, setTilesets] = useState<GolfCourseTileset[]>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [swipeMode, setSwipeMode] = useState(false);

  // Set Mapbox access token
  mapboxgl.accessToken = mapboxAccessToken;

  // Load all tilesets for the golf club
  useEffect(() => {
    const loadTilesets = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const tilesetsData = await TilesetService.getTilesetsForGolfClub(golfClubId);
        
        if (!tilesetsData || tilesetsData.length === 0) {
          setError('No tilesets found for this golf course');
          setIsLoading(false);
          return;
        }

        setTilesets(tilesetsData);
        // Auto-select the most recent tileset
        if (tilesetsData.length > 0) {
          setSelectedLayers([tilesetsData[0].id]);
        }
      } catch (err) {
        console.error('Failed to load tilesets:', err);
        setError('Failed to load map data');
      } finally {
        setIsLoading(false);
      }
    };

    loadTilesets();
  }, [golfClubId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || tilesets.length === 0 || map.current) return;

    const primaryTileset = tilesets[0];

    try {
      // Initialize the map with primary tileset bounds
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: baseStyle,
        center: [primaryTileset.center_lon, primaryTileset.center_lat],
        zoom: primaryTileset.default_zoom,
        minZoom: primaryTileset.min_zoom,
        maxZoom: primaryTileset.max_zoom,
        bounds: [
          [primaryTileset.min_lon, primaryTileset.min_lat],
          [primaryTileset.max_lon, primaryTileset.max_lat]
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

      // Map is ready
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        // Notify parent that map is ready for sync
        if (onMapReady && map.current) {
          onMapReady(map.current);
        }
      });

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [tilesets, baseStyle, showControls]);

  // Manage layers based on selectedLayers
  useEffect(() => {
    if (!map.current) {
      console.log('❌ Map not initialized yet');
      return;
    }

    const updateLayers = async () => {
      // Wait for map to be ready
      if (!map.current!.loaded()) {
        console.log('⏳ Waiting for map to load...');
        const handleLoad = () => {
          console.log('✅ Map loaded, updating layers');
          updateLayers();
        };
        map.current!.once('load', handleLoad);
        return;
      }

      console.log('🗺️ Updating layers...');
      console.log('  Selected layers:', selectedLayers);
      console.log('  Available tilesets:', tilesets.length);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session for tile loading');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log('  Supabase URL:', supabaseUrl);

      // Remove all existing tileset layers
      tilesets.forEach(tileset => {
        const sourceId = `tileset-source-${tileset.id}`;
        const layerId = `tileset-layer-${tileset.id}`;
        
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
      });

      // Add selected layers
      console.log('  Adding', selectedLayers.length, 'layers...');
      
      selectedLayers.forEach((tilesetId, index) => {
        const tileset = tilesets.find(t => t.id === tilesetId);
        if (!tileset) {
          console.warn(`  ⚠️ Tileset not found for ID: ${tilesetId}`);
          return;
        }

        const sourceId = `tileset-source-${tileset.id}`;
        const layerId = `tileset-layer-${tileset.id}`;

        // Use tilesetId instead of courseId for new tile-proxy format
        const tileUrlTemplate = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${tileset.id}&z={z}&x={x}&y={y}&token=${session.access_token}`;

        console.log(`  ✅ Adding layer: ${tileset.name} (${tileset.flight_date || 'no date'})`);
        console.log(`     Source ID: ${sourceId}`);
        console.log(`     Layer ID: ${layerId}`);
        console.log(`     R2 Path: ${tileset.r2_folder_path}`);
        console.log(`     Tile URL: ${tileUrlTemplate.replace('{z}', '15').replace('{x}', '5242').replace('{y}', '12663')}`);
        console.log(`     Bounds: [${tileset.min_lon}, ${tileset.min_lat}, ${tileset.max_lon}, ${tileset.max_lat}]`);
        console.log(`     Zoom: ${tileset.min_zoom} - ${tileset.max_zoom}`);

        try {
          // Add source
          map.current!.addSource(sourceId, {
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

          // Add layer
          map.current!.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-opacity': 0.85
            }
          });

          console.log(`     ✅ Layer added successfully`);
        } catch (error) {
          console.error(`     ❌ Error adding layer:`, error);
        }
      });

      console.log('✅ Layer update complete');
    };

    updateLayers();
  }, [selectedLayers, tilesets]);

  // Handle layer change from dropdown
  const handleLayerChange = (leftLayerId: string, rightLayerId: string | null) => {
    if (rightLayerId) {
      setSelectedLayers([leftLayerId, rightLayerId]);
      setSwipeMode(true); // Auto-enable swipe when 2 layers selected
    } else {
      setSelectedLayers([leftLayerId]);
      setSwipeMode(false);
    }
  };

  // Zoom controls
  const zoomIn = () => {
    map.current?.zoomIn();
  };

  const zoomOut = () => {
    map.current?.zoomOut();
  };

  const resetView = () => {
    if (!map.current || tilesets.length === 0) return;
    
    const primaryTileset = tilesets[0];
    map.current.flyTo({
      center: [primaryTileset.center_lon, primaryTileset.center_lat],
      zoom: primaryTileset.default_zoom,
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

  if (error || tilesets.length === 0) {
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

  const primaryTileset = tilesets[0];
  const canSwipe = selectedLayers.length === 2;

  return (
    <div className="space-y-4">
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Golf Course Map
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Zoom: {currentZoom}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedLayers.length} {selectedLayers.length === 1 ? 'Layer' : 'Layers'}
              </Badge>
            </div>
          </CardTitle>

          {/* Map Controls */}
          {showControls && (
            <div className="flex items-center justify-end pt-2 gap-1">
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
          )}
        </CardHeader>

        <CardContent>
          <div 
            ref={mapContainer} 
            className="w-full h-[600px] rounded-lg overflow-hidden border"
          />
        </CardContent>
      </Card>

      {/* Date Layer Dropdown */}
      <DateLayerDropdown
        tilesets={tilesets}
        selectedLayers={selectedLayers}
        onLayerChange={handleLayerChange}
      />

      {/* Swipe Control (shown when 2 layers selected) */}
      {canSwipe && swipeMode && (
        <MapSwipeControl
          map={map.current}
          leftLayerId={`tileset-layer-${selectedLayers[0]}`}
          rightLayerId={`tileset-layer-${selectedLayers[1]}`}
          isActive={swipeMode}
          onToggle={() => setSwipeMode(!swipeMode)}
        />
      )}
    </div>
  );
};

export default MapboxGolfCourseMap;