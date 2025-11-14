import { TileUploadComponent } from '@/components/TileUploadComponent';

export default function TileUploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Map Tile Upload
          </h1>
          <p className="text-gray-600">
            Upload tiles to Cloudflare R2 for Mapbox integration
          </p>
        </div>

        <TileUploadComponent />

        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">How to use</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium mb-2">1. Prepare your tiles</h3>
              <p className="text-gray-600">
                Tiles must follow the standard XYZ structure: <code className="bg-gray-100 px-1 rounded">z/x/y.png</code>
              </p>
              <p className="text-gray-600 mt-1">
                Example: <code className="bg-gray-100 px-1 rounded">15/5242/12663.png</code>
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">2. Choose upload method</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li><strong>ZIP file:</strong> Upload a ZIP containing tiles in z/x/y.png structure</li>
                <li><strong>Folder:</strong> Select a folder with tiles (browser will upload all files)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">3. Enter Course ID</h3>
              <p className="text-gray-600">
                Use a unique identifier for your golf course (e.g., <code className="bg-gray-100 px-1 rounded">the-best-golf</code>)
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">4. Upload and integrate</h3>
              <p className="text-gray-600">
                After upload, copy the tile URL and use it in your Mapbox configuration
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Mapbox Integration</h3>
          <p className="text-sm text-blue-800 mb-3">
            Use the generated tile URL in your Mapbox GL configuration:
          </p>
          <pre className="text-xs bg-white p-3 rounded border border-blue-200 overflow-x-auto">
{`map.addSource('golf-tiles', {
  type: 'raster',
  tiles: ['YOUR_TILE_URL'],
  tileSize: 256,
  maxzoom: 20
});

map.addLayer({
  id: 'golf-overlay',
  type: 'raster',
  source: 'golf-tiles',
  paint: { 'raster-opacity': 0.8 }
});`}
          </pre>
        </div>
      </div>
    </div>
  );
}
