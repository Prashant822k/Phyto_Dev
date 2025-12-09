import { useState, useEffect } from 'react';
import MapboxGolfCourseMap from '@/components/MapboxGolfCourseMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Test page for Layer Selection and Swipe functionality
 * 
 * Usage:
 * 1. Run database migration (add-datetime-to-tilesets.sql)
 * 2. Create 2+ tilesets for the same golf course with different dates
 * 3. Visit this page to test layer selection and swipe
 */
const TestLayers = () => {
  const [golfClubs, setGolfClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load golf clubs
  useEffect(() => {
    const loadGolfClubs = async () => {
      const { data, error } = await supabase
        .from('golf_clubs')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error loading golf clubs:', error);
      } else if (data && data.length > 0) {
        setGolfClubs(data);
        setSelectedClubId(data[0].id);
      }
      setLoading(false);
    };

    loadGolfClubs();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (golfClubs.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No golf clubs found. Please create a golf club first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Layer Selection & Swipe Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Testing Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Make sure you've run the database migration</li>
                <li>Create 2+ tilesets for the same golf course with different dates</li>
                <li>Click the "Layers" button to see all available tilesets</li>
                <li>Toggle 2 layers on to enable swipe comparison</li>
                <li>Click "Swipe Compare" and drag the slider</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Golf Club Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Golf Course:</label>
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {golfClubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Map Component */}
      {selectedClubId && (
        <MapboxGolfCourseMap
          golfClubId={selectedClubId}
          mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''}
          showControls={true}
        />
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Behavior</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>✅ Layer Selector:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>Shows all tilesets for the selected golf course</li>
              <li>Displays date and time for each tileset</li>
              <li>Toggle switches to enable/disable layers</li>
              <li>Maximum 2 layers can be selected</li>
            </ul>
          </div>
          <div>
            <strong>✅ Swipe Comparison:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>Appears when exactly 2 layers are selected</li>
              <li>Click "Swipe Compare" to activate</li>
              <li>Drag the vertical slider to compare layers</li>
              <li>Left side shows first layer, right side shows second layer</li>
            </ul>
          </div>
          <div>
            <strong>⚠️ Known Limitations:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>Tiles must exist in R2 with correct path structure</li>
              <li>Tile upload needs updating to support date/time paths</li>
              <li>For testing, use duplicate tilesets pointing to same R2 path</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestLayers;
