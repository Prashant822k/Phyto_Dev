import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, RefreshCw, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface VectorLayer {
  id: string;
  name: string;
  description: string;
  layer_type: string;
  r2_key: string;
  golf_club_id: string;
  course_name: string;
  is_active: boolean;
  z_index: number;
  created_at: string;
  updated_at: string;
}

interface VectorLayerComparisonProps {
  golfClubId: string;
  mapboxAccessToken: string;
  baseStyle?: string;
  className?: string;
}

const VectorLayerComparison = ({
  golfClubId,
  mapboxAccessToken,
  baseStyle = 'mapbox://styles/mapbox/satellite-streets-v12',
  className = ''
}: VectorLayerComparisonProps) => {
  const leftMapContainer = useRef<HTMLDivElement>(null);
  const rightMapContainer = useRef<HTMLDivElement>(null);
  const leftMap = useRef<mapboxgl.Map | null>(null);
  const rightMap = useRef<mapboxgl.Map | null>(null);
  
  const [vectorLayers, setVectorLayers] = useState<VectorLayer[]>([]);
  const [leftLayerId, setLeftLayerId] = useState<string>('');
  const [rightLayerId, setRightLayerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseBounds, setCourseBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [courseCenter, setCourseCenter] = useState<[number, number] | null>(null);

  // Set Mapbox access token
  mapboxgl.accessToken = mapboxAccessToken;

  // Load vector layers and course bounds
  const loadVectorLayers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Get golf course tileset for bounds
      const { data: tileset, error: tilesetError } = await supabase
        .from('golf_course_tilesets')
        .select('*')
        .eq('golf_club_id', golfClubId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!tilesetError && tileset) {
        const bounds: [[number, number], [number, number]] = [
          [tileset.min_lon, tileset.min_lat],
          [tileset.max_lon, tileset.max_lat]
        ];
        const center: [number, number] = [tileset.center_lon, tileset.center_lat];
        
        console.log('📍 Comparison: Setting course bounds and center:', { bounds, center });
        setCourseBounds(bounds);
        setCourseCenter(center);
      } else {
        console.error('❌ Comparison: Failed to load tileset:', tilesetError);
      }

      // Get vector layers from database
      const { data: layers, error: layersError } = await supabase
        .from('vector_layers')
        .select('*')
        .eq('golf_club_id', golfClubId)
        .eq('is_active', true)
        .order('z_index', { ascending: true });

      if (layersError) throw layersError;

      if (!layers || layers.length === 0) {
        setError('No vector layers found for this golf course');
        setIsLoading(false);
        return;
      }

      setVectorLayers(layers);
      
      // Auto-select first two layers if available
      if (layers.length >= 2) {
        setLeftLayerId(layers[0].id);
        setRightLayerId(layers[1].id);
      } else if (layers.length === 1) {
        setLeftLayerId(layers[0].id);
      }
    } catch (err) {
      console.error('Failed to load vector layers:', err);
      setError('Failed to load vector layers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVectorLayers();
  }, [golfClubId]);

  // Initialize maps
  useEffect(() => {
    console.log('🔍 Comparison map init check:', {
      hasLeftContainer: !!leftMapContainer.current,
      hasRightContainer: !!rightMapContainer.current,
      hasCourseCenter: !!courseCenter,
      courseCenter,
      hasLeftMap: !!leftMap.current,
      hasRightMap: !!rightMap.current
    });
    
    if (!leftMapContainer.current || !rightMapContainer.current || !courseCenter || leftMap.current || rightMap.current) {
      console.log('⏸️ Comparison maps not ready to initialize');
      return;
    }

    try {
      const mapConfig: any = {
        style: baseStyle,
        center: courseCenter,
        zoom: 15,
      };

      if (courseBounds) {
        mapConfig.bounds = courseBounds;
        mapConfig.fitBoundsOptions = { padding: 50 };
      }

      console.log('🗺️ Initializing comparison maps with config:', mapConfig);

      // Initialize left map
      leftMap.current = new mapboxgl.Map({
        container: leftMapContainer.current,
        ...mapConfig
      });

      // Add controls to left map
      leftMap.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      leftMap.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      // Initialize right map
      rightMap.current = new mapboxgl.Map({
        container: rightMapContainer.current,
        ...mapConfig
      });

      // Add controls to right map
      rightMap.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      rightMap.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      leftMap.current.on('load', () => {
        console.log('✅ Left comparison map loaded');
      });

      rightMap.current.on('load', () => {
        console.log('✅ Right comparison map loaded');
      });

      // Sync maps - when one moves, move the other
      let isSyncing = false;
      
      const syncMaps = (source: mapboxgl.Map, target: mapboxgl.Map) => {
        if (isSyncing) return;
        isSyncing = true;
        
        target.jumpTo({
          center: source.getCenter(),
          zoom: source.getZoom(),
          bearing: source.getBearing(),
          pitch: source.getPitch()
        });
        
        setTimeout(() => {
          isSyncing = false;
        }, 50);
      };

      leftMap.current.on('move', () => {
        if (leftMap.current && rightMap.current) {
          syncMaps(leftMap.current, rightMap.current);
        }
      });

      rightMap.current.on('move', () => {
        if (rightMap.current && leftMap.current) {
          syncMaps(rightMap.current, leftMap.current);
        }
      });

      console.log('Comparison maps initialized');
    } catch (err) {
      console.error('Failed to initialize comparison maps:', err);
      setError('Failed to initialize maps');
    }

    return () => {
      leftMap.current?.remove();
      rightMap.current?.remove();
      leftMap.current = null;
      rightMap.current = null;
    };
  }, [courseCenter, courseBounds, baseStyle]);

  // Load layer on map
  const loadLayerOnMap = async (map: mapboxgl.Map, layerId: string) => {
    if (!map.loaded()) {
      map.once('load', () => loadLayerOnMap(map, layerId));
      return;
    }

    const layer = vectorLayers.find(l => l.id === layerId);
    if (!layer) return;

    const sourceId = `vector-source-${layerId}`;
    const mapLayerId = `vector-layer-${layerId}`;

    // Remove existing layers/source if present (remove outline first!)
    const outlineLayerId = `${mapLayerId}-outline`;
    if (map.getLayer(outlineLayerId)) {
      map.removeLayer(outlineLayerId);
    }
    if (map.getLayer(mapLayerId)) {
      map.removeLayer(mapLayerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    try {
      const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
      let geojsonData;

      if (r2PublicUrl) {
        const geojsonUrl = `${r2PublicUrl}/${layer.r2_key}`;
        const response = await fetch(geojsonUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${layer.name}: ${response.statusText}`);
        }
        geojsonData = await response.json();
      } else {
        // Fallback: Use edge function
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/get-vector-layers?golf_course_id=${golfClubId}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch layers');
        const result = await response.json();
        const layerData = result.data.find((l: any) => l.id === layer.id);
        if (!layerData) throw new Error(`Layer ${layer.name} not found`);

        const geoResponse = await fetch(layerData.urlWithCache || layerData.url);
        if (!geoResponse.ok) throw new Error('Failed to fetch GeoJSON');
        geojsonData = await geoResponse.json();
      }

      // Add source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData
      });

      // Determine layer style based on geometry type
      const geometryType = geojsonData.features[0]?.geometry?.type;
      const layerColor = getLayerColor(layer.name);

      if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        map.addLayer({
          id: mapLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': layerColor,
            'fill-opacity': 0.4
          }
        });

        map.addLayer({
          id: `${mapLayerId}-outline`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': layerColor,
            'line-width': 2
          }
        });
      } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
        map.addLayer({
          id: mapLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': layerColor,
            'line-width': 3
          }
        });
      } else if (geometryType === 'Point' || geometryType === 'MultiPoint') {
        map.addLayer({
          id: mapLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 6,
            'circle-color': layerColor,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      }

      console.log(`✅ Loaded layer: ${layer.name} on comparison map`);
    } catch (error) {
      console.error(`Failed to load layer ${layer.name}:`, error);
    }
  };

  // Load left layer
  useEffect(() => {
    if (!leftMap.current || !leftLayerId) {
      console.log('⏸️ Left map not ready:', { hasMap: !!leftMap.current, layerId: leftLayerId });
      return;
    }
    console.log('🔄 Loading left layer:', leftLayerId);
    loadLayerOnMap(leftMap.current, leftLayerId);
  }, [leftLayerId, leftMap.current, vectorLayers]);

  // Load right layer
  useEffect(() => {
    if (!rightMap.current || !rightLayerId) {
      console.log('⏸️ Right map not ready:', { hasMap: !!rightMap.current, layerId: rightLayerId });
      return;
    }
    console.log('🔄 Loading right layer:', rightLayerId);
    loadLayerOnMap(rightMap.current, rightLayerId);
  }, [rightLayerId, rightMap.current, vectorLayers]);

  // Get color for layer based on name
  const getLayerColor = (name: string): string => {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('fairway')) return '#90EE90';
    if (lowerName.includes('green')) return '#228B22';
    if (lowerName.includes('tee')) return '#FFD700';
    if (lowerName.includes('bunker') || lowerName.includes('sand')) return '#F4A460';
    if (lowerName.includes('water') || lowerName.includes('hazard')) return '#4169E1';
    if (lowerName.includes('rough')) return '#8B4513';
    if (lowerName.includes('boundary') || lowerName.includes('course')) return '#FF4500';
    if (lowerName.includes('path') || lowerName.includes('cart')) return '#A9A9A9';
    if (lowerName.includes('tree') || lowerName.includes('wood')) return '#006400';

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Swap layers
  const swapLayers = () => {
    const temp = leftLayerId;
    setLeftLayerId(rightLayerId);
    setRightLayerId(temp);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="animate-spin w-16 h-16 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <h3 className="text-lg font-medium">Loading Vector Layers</h3>
            <p className="text-muted-foreground">Preparing comparison view...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || vectorLayers.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No Vector Layers</h3>
            <p className="text-muted-foreground">
              {error || 'No vector layers available for comparison'}
            </p>
            <Button onClick={loadVectorLayers} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
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
            <Layers className="w-5 h-5" />
            Vector Layer Comparison
          </div>
          <Badge variant="secondary" className="text-xs">
            Side-by-Side View
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Layer Selection Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Left Layer</label>
            <Select value={leftLayerId} onValueChange={setLeftLayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select layer" />
              </SelectTrigger>
              <SelectContent>
                {vectorLayers.map((layer) => (
                  <SelectItem key={layer.id} value={layer.id}>
                    {layer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={swapLayers}
            className="mt-6"
            disabled={!leftLayerId || !rightLayerId}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Button>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Right Layer</label>
            <Select value={rightLayerId} onValueChange={setRightLayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select layer" />
              </SelectTrigger>
              <SelectContent>
                {vectorLayers.map((layer) => (
                  <SelectItem key={layer.id} value={layer.id}>
                    {layer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Side-by-Side Maps */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <div
              ref={leftMapContainer}
              className="w-full h-[400px] rounded-lg overflow-hidden border"
            />
            {leftLayerId && (
              <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1 rounded-md shadow-md">
                <p className="text-sm font-medium">
                  {vectorLayers.find(l => l.id === leftLayerId)?.name}
                </p>
              </div>
            )}
          </div>

          <div className="relative">
            <div
              ref={rightMapContainer}
              className="w-full h-[400px] rounded-lg overflow-hidden border"
            />
            {rightLayerId && (
              <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1 rounded-md shadow-md">
                <p className="text-sm font-medium">
                  {vectorLayers.find(l => l.id === rightLayerId)?.name}
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Maps are synchronized - zoom and pan on one map will affect the other
        </p>
      </CardContent>
    </Card>
  );
};

export default VectorLayerComparison;
