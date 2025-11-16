import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { TilesetService } from '@/lib/tilesetService';
import { TileUploader, extractTilesFromZip, extractTilesFromFiles, UploadProgress } from '@/lib/tile-upload';
import { extractOrFallbackDateTime } from '@/lib/exifExtractor';
import { sanitizeGolfCourseName } from '@/lib/utils';
import { Upload, MapPin, Loader2, CheckCircle, FolderUp, Calendar, Clock, FileJson, AlertCircle, Info } from 'lucide-react';

interface GolfClub {
  id: string;
  name: string;
}

interface TileMetadata {
  name?: string;
  description?: string;
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
  centerLat?: number;
  centerLon?: number;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  tileSize?: number;
  attribution?: string;
  bounds?: [number, number, number, number];
  center?: [number, number, number];
  minzoom?: number;
  maxzoom?: number;
}

const UnifiedTilesetUploader = () => {
  const [golfClubs, setGolfClubs] = useState<GolfClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedClubName, setSelectedClubName] = useState<string>('');
  
  // Date/Time fields
  const [flightDate, setFlightDate] = useState<string>('');
  const [flightTime, setFlightTime] = useState<string>('');
  const [sampleTileFile, setSampleTileFile] = useState<File | null>(null);
  const [isExtractingTime, setIsExtractingTime] = useState(false);
  
  // Metadata
  const [metadataJson, setMetadataJson] = useState<string>('');
  const [parsedMetadata, setParsedMetadata] = useState<TileMetadata | null>(null);
  
  // Tiles
  const [tileFiles, setTileFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  
  // Upload state
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  
  const { toast } = useToast();
  
  useEffect(() => {
    loadGolfClubs();
  }, []);
  
  const loadGolfClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('golf_clubs')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setGolfClubs(data || []);
    } catch (error) {
      console.error('Error loading golf clubs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load golf clubs',
        variant: 'destructive'
      });
    }
  };
  
  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId);
    const club = golfClubs.find(c => c.id === clubId);
    if (club) {
      setSelectedClubName(club.name);
    }
  };
  
  // Extract time from sample tile
  const handleSampleTileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSampleTileFile(file);
    setIsExtractingTime(true);
    
    try {
      const { date, time } = await extractOrFallbackDateTime(file);
      setFlightDate(date);
      setFlightTime(time);
      
      toast({
        title: 'Time Extracted',
        description: `Date: ${date}, Time: ${time}`,
      });
    } catch (error) {
      toast({
        title: 'Extraction Failed',
        description: 'Could not extract time from image. Using current date/time.',
        variant: 'destructive'
      });
    } finally {
      setIsExtractingTime(false);
    }
  };
  
  // Load metadata from file
  const handleMetadataFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      setMetadataJson(text);
      const metadata = JSON.parse(text) as TileMetadata;
      setParsedMetadata(metadata);
      
      toast({
        title: 'Metadata Loaded',
        description: 'Tileset metadata parsed successfully',
      });
    } catch (error) {
      toast({
        title: 'Invalid Metadata',
        description: 'Failed to parse metadata.json file',
        variant: 'destructive'
      });
    }
  };
  
  // Parse metadata from textarea
  const handleMetadataChange = (value: string) => {
    setMetadataJson(value);
    try {
      if (value.trim()) {
        const metadata = JSON.parse(value) as TileMetadata;
        setParsedMetadata(metadata);
      } else {
        setParsedMetadata(null);
      }
    } catch (error) {
      setParsedMetadata(null);
    }
  };
  
  // Handle tile folder selection
  const handleTileFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pngFiles = files.filter(f => f.name.endsWith('.png'));
    
    if (pngFiles.length === 0) {
      toast({
        title: 'No PNG Files Found',
        description: 'Please select a folder containing PNG tiles',
        variant: 'destructive'
      });
      return;
    }
    
    setTileFiles(pngFiles);
    setZipFile(null); // Clear ZIP if folder selected
    
    toast({
      title: 'Tiles Selected',
      description: `${pngFiles.length} PNG tiles ready to upload`,
    });
  };
  
  // Handle ZIP file selection
  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setZipFile(file);
    setTileFiles([]); // Clear folder if ZIP selected
    
    toast({
      title: 'ZIP Selected',
      description: `${file.name} ready to upload`,
    });
  };
  
  // Validate inputs
  const validateInputs = (): boolean => {
    if (!selectedClubId) {
      toast({
        title: 'Golf Course Required',
        description: 'Please select a golf course',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!flightDate || !flightTime) {
      toast({
        title: 'Date/Time Required',
        description: 'Please provide flight date and time',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!parsedMetadata) {
      toast({
        title: 'Metadata Required',
        description: 'Please provide valid metadata JSON',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!zipFile && tileFiles.length === 0) {
      toast({
        title: 'Tiles Required',
        description: 'Please select tiles (ZIP or folder)',
        variant: 'destructive'
      });
      return false;
    }
    
    return true;
  };
  
  // Main upload handler
  const handleUpload = async () => {
    if (!validateInputs()) return;
    
    setIsProcessing(true);
    setCurrentStep('Preparing upload...');
    
    try {
      const courseId = sanitizeGolfCourseName(selectedClubName);
      
      // Step 1: Upload tiles to R2
      setCurrentStep('Uploading tiles to R2...');
      
      const uploader = new TileUploader(courseId, flightDate, flightTime);
      
      let tiles;
      if (zipFile) {
        tiles = await extractTilesFromZip(zipFile);
      } else {
        // Convert File[] to FileList-like object
        const fileList = {
          length: tileFiles.length,
          item: (index: number) => tileFiles[index] || null,
          [Symbol.iterator]: function* () {
            for (const file of tileFiles) {
              yield file;
            }
          }
        } as unknown as FileList;
        tiles = await extractTilesFromFiles(fileList);
      }
      
      if (tiles.length === 0) {
        throw new Error('No tiles found. Expected structure: z/x/y.png');
      }
      
      await uploader.uploadTiles(tiles, (progress) => {
        setUploadProgress(progress);
      });
      
      // Step 2: Create tileset metadata in database
      setCurrentStep('Creating tileset metadata...');
      
      const meta = parsedMetadata!;
      
      // Parse bounds
      let minLat, maxLat, minLon, maxLon, centerLat, centerLon, minZoom, maxZoom, defaultZoom;
      
      if (meta.bounds) {
        [minLon, minLat, maxLon, maxLat] = meta.bounds;
      } else {
        minLat = meta.minLat!;
        maxLat = meta.maxLat!;
        minLon = meta.minLon!;
        maxLon = meta.maxLon!;
      }
      
      if (meta.center) {
        [centerLon, centerLat, defaultZoom] = meta.center;
      } else {
        centerLat = meta.centerLat || (minLat + maxLat) / 2;
        centerLon = meta.centerLon || (minLon + maxLon) / 2;
        defaultZoom = meta.defaultZoom || 16;
      }
      
      minZoom = meta.minzoom || meta.minZoom || 14;
      maxZoom = meta.maxzoom || meta.maxZoom || 20;
      
      const metadata = {
        name: meta.name || `${selectedClubName} - ${flightDate}`,
        description: meta.description,
        bounds: { minLat, maxLat, minLon, maxLon },
        center: { lat: centerLat, lon: centerLon },
        zoom: { min: minZoom, max: maxZoom, default: defaultZoom },
        tileSize: meta.tileSize || 256,
        format: 'png' as const,
        attribution: meta.attribution,
        flightDate: flightDate,
        flightTime: flightTime
      };
      
      const tileset = await TilesetService.createTileset(selectedClubId, metadata);
      
      if (!tileset) {
        throw new Error('Failed to create tileset metadata');
      }
      
      setCurrentStep('Complete!');
      
      toast({
        title: 'Success!',
        description: `Uploaded ${tiles.length} tiles for ${flightDate} ${flightTime}`,
      });
      
      setTimeout(() => {
        resetForm();
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      setCurrentStep('Failed');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetForm = () => {
    setTileFiles([]);
    setZipFile(null);
    setMetadataJson('');
    setParsedMetadata(null);
    setUploadProgress(null);
    setCurrentStep('');
    setFlightDate('');
    setFlightTime('');
    setSampleTileFile(null);
  };
  
  // Generate R2 path preview
  const getR2PathPreview = () => {
    if (!selectedClubName) return 'Select a golf course';
    const courseId = sanitizeGolfCourseName(selectedClubName);
    if (flightDate && flightTime) {
      const formattedTime = flightTime.replace(':', '-');
      return `${courseId}/${flightDate}/${formattedTime}/tiles/z/x/y.png`;
    }
    return `${courseId}/tiles/z/x/y.png (legacy - add date/time!)`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderUp className="w-5 h-5" />
          Upload Tileset with Date/Time
        </CardTitle>
        <CardDescription>
          Upload tiles and metadata for a specific date/time to enable multi-temporal layer comparison
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Golf Club Selection */}
        <div className="space-y-2">
          <Label htmlFor="golfClub">Golf Course *</Label>
          <Select value={selectedClubId} onValueChange={handleClubChange}>
            <SelectTrigger id="golfClub">
              <SelectValue placeholder="Select a golf course" />
            </SelectTrigger>
            <SelectContent>
              {golfClubs.map(club => (
                <SelectItem key={club.id} value={club.id}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="flightDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Flight Date *
            </Label>
            <Input
              id="flightDate"
              type="date"
              value={flightDate}
              onChange={(e) => setFlightDate(e.target.value)}
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground">
              Date when the drone flight was conducted
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="flightTime" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Flight Time *
            </Label>
            <Input
              id="flightTime"
              type="time"
              value={flightTime}
              onChange={(e) => setFlightTime(e.target.value)}
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground">
              Approximate time of flight
            </p>
          </div>
        </div>
        
        {/* Extract Time from Sample Tile (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="sampleTile">Extract Time from Sample Tile (Optional)</Label>
          <Input
            id="sampleTile"
            type="file"
            accept=".png"
            onChange={handleSampleTileUpload}
            disabled={isProcessing || isExtractingTime}
          />
          <p className="text-xs text-muted-foreground">
            Upload a PNG tile to automatically extract date/time from EXIF metadata
          </p>
        </div>
        
        {/* R2 Path Preview */}
        {selectedClubName && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>R2 Path:</strong> <code className="bg-muted px-1 rounded">{getR2PathPreview()}</code>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Metadata Input */}
        <div className="space-y-2">
          <Label htmlFor="metadataFile" className="flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            Metadata JSON *
          </Label>
          <Input
            id="metadataFile"
            type="file"
            accept=".json,application/json"
            onChange={handleMetadataFileUpload}
            disabled={isProcessing}
          />
          <Textarea
            placeholder='{"name": "Course Name", "bounds": [minLon, minLat, maxLon, maxLat], "center": [lon, lat, zoom], "minzoom": 14, "maxzoom": 20}'
            value={metadataJson}
            onChange={(e) => handleMetadataChange(e.target.value)}
            rows={6}
            disabled={isProcessing}
          />
          {parsedMetadata && (
            <div className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Metadata valid</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Upload a JSON file or paste metadata. Supports TileJSON format.
          </p>
        </div>
        
        {/* Tiles Upload */}
        <Tabs defaultValue="zip" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="zip">ZIP File</TabsTrigger>
            <TabsTrigger value="folder">Folder</TabsTrigger>
          </TabsList>
          <TabsContent value="zip" className="space-y-2">
            <Label htmlFor="zipFile">Upload ZIP File *</Label>
            <Input
              id="zipFile"
              type="file"
              accept=".zip"
              onChange={handleZipSelect}
              disabled={isProcessing}
            />
            {zipFile && (
              <p className="text-sm text-muted-foreground">
                {zipFile.name} selected
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              ZIP file containing tiles in z/x/y.png structure
            </p>
          </TabsContent>
          <TabsContent value="folder" className="space-y-2">
            <Label htmlFor="tileFolder">Select Tile Folder *</Label>
            <Input
              id="tileFolder"
              type="file"
              /* @ts-ignore */
              webkitdirectory=""
              directory=""
              multiple
              accept=".png"
              onChange={handleTileFolderSelect}
              disabled={isProcessing}
            />
            {tileFiles.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {tileFiles.length} PNG tiles selected
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Select folder containing tiles in z/x/y.png structure
            </p>
          </TabsContent>
        </Tabs>
        
        {/* Progress */}
        {isProcessing && uploadProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{currentStep}</span>
              <span className="font-medium">{uploadProgress.percentage.toFixed(1)}%</span>
            </div>
            <Progress value={uploadProgress.percentage} className="w-full" />
            <p className="text-xs text-muted-foreground text-center">
              {uploadProgress.uploaded} / {uploadProgress.total} tiles
            </p>
            {uploadProgress.currentTile && (
              <p className="text-xs text-muted-foreground text-center font-mono">
                {uploadProgress.currentTile}
              </p>
            )}
          </div>
        )}
        
        {/* Submit Button */}
        <Button
          onClick={handleUpload}
          disabled={isProcessing || !parsedMetadata || !selectedClubId || !flightDate || !flightTime || (!zipFile && tileFiles.length === 0)}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Tileset for {flightDate || 'Date'} {flightTime || 'Time'}
            </>
          )}
        </Button>
        
        {currentStep === 'Complete!' && (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Tileset uploaded successfully!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedTilesetUploader;
