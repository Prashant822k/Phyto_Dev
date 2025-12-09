import { Database } from '@/lib/supabase';

export type VectorLayer = Database['public']['Tables']['vector_layers']['Row'];

export interface VectorLayerFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any[];
  };
  properties: Record<string, any>;
}

export interface VectorLayerStyle {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  pointRadius?: number;
  pointColor?: string;
  pointOpacity?: number;
  labelField?: string;
  labelSize?: number;
  labelColor?: string;
  labelHaloColor?: string;
  labelHaloWidth?: number;
}

export interface VectorLayerWithFeatures extends Omit<VectorLayer, 'geojson' | 'style'> {
  geojson: {
    type: 'FeatureCollection';
    features: VectorLayerFeature[];
  };
  style: VectorLayerStyle;
}

export interface VectorLayerUpload {
  golf_course_id: string;
  name: string;
  description?: string;
  layer_type: string;
  geojson: any;
  style?: VectorLayerStyle;
  z_index?: number;
}

export interface UpdateVectorLayerOrder {
  layerId: string;
  z_index: number;
}
