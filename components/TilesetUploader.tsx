import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { R2Service } from '@/lib/r2Service'
import { TilesetService } from '@/lib/tilesetService';
import { sanitizeGolfCourseName } from '@/lib/utils';
import { Upload, MapPin, Loader2, CheckCircle, FolderUp } from 'lucide-react';

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
  bounds?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center?: [number, number, number]; // [lon, lat, zoom]
}

const TilesetUploader = () => {
  const [golfClubs, setGolfClubs] = useState<GolfClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedClubName, setSelectedClubName] = useState<string>('');
  
  // Tile folder upload (multiple files maintaining structure)
  const [tileFiles, setTileFiles] = useState<File[]>([]);
  const [metadataFile, setMetadataFile] = useState<File | null>(null);
  const [parsedMetadata, setParsedMetadata] = useState<TileMetadata | null>(null);
  
  // Upload state
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [filesUploaded, setFilesUploaded] = useState(0);
  
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
  
  const handleTileFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log(`Selected ${files.length} files from input`);
    
    // Filter only PNG files
    const pngFiles = files.filter(f => f.name.endsWith('.png'));
    console.log(`Filtered to ${pngFiles.length} PNG tiles`);
    
    if (pngFiles.length === 0) {
      toast({
        title: 'No PNG Files Found',
        description: 'Please select a folder containing PNG tiles',
        variant: 'destructive'
      });
      return;
    }
    
    setTileFiles(pngFiles);
    toast({
      title: 'Tiles Selected',
      description: `${pngFiles.length} PNG tiles ready to upload (will upload in batches of 50)`,
    });
  };
  
  const handleMetadataSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const metadata = JSON.parse(text) as TileMetadata;
      setParsedMetadata(metadata);
      setMetadataFile(file);
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
  
  const validateInputs = (): boolean => {
    if (!selectedClubId) {
      toast({
        title: 'Golf Course Required',
        description: 'Please select a golf course',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!parsedMetadata) {
      toast({
        title: 'Metadata Required',
        description: 'Please upload a metadata.json file',
        variant: 'destructive'
      });
      return false;
    }
    
    // Tiles are optional if already uploaded via script
    
    return true;
  };
  
  const handleUploadTiles = async () => {
    if (!validateInputs()) return;
    
    setIsProcessing(true);
    setUploadProgress(0);
    setFilesUploaded(0);
    
    try {
      const sanitizedName = sanitizeGolfCourseName(selectedClubName);
      const totalFiles = tileFiles.length; // Move outside if block
      
      // If no tiles selected, skip tile upload (metadata only)
      if (totalFiles === 0) {
        setCurrentStep('Skipping tile upload - tiles already in R2');
        setUploadProgress(80);
      } else {
        setCurrentStep('Uploading tiles to R2...');
        
        console.log(`Starting upload of ${totalFiles} tiles...`);
        
        // Upload in batches of 50 for better performance
        const BATCH_SIZE = 50;
        let failedUploads = 0;
        
        for (let i = 0; i < tileFiles.length; i += BATCH_SIZE) {
          const batch = tileFiles.slice(i, Math.min(i + BATCH_SIZE, tileFiles.length));
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);
          
          setCurrentStep(`Uploading batch ${batchNum}/${totalBatches}...`);
          
          // Upload batch in parallel
          const uploadPromises = batch.map(async (file, batchIndex) => {
            const globalIndex = i + batchIndex;
            const relativePath = (file as any).webkitRelativePath || file.name;
            const pathParts = relativePath.split('/');
            const tilePath = pathParts.slice(-3).join('/');
            const key = `${sanitizedName}/tiles/${tilePath}`;
            
            try {
              const uploadResult = await R2Service.uploadFile(key, file);
              if (!uploadResult.success) {
                console.error(`Failed to upload ${tilePath}`);
                return false;
              }
              return true;
            } catch (error) {
              console.error(`Error uploading ${tilePath}:`, error);
              return false;
            }
          });
          
          const results = await Promise.all(uploadPromises);
          failedUploads += results.filter(r => !r).length;
          
          setFilesUploaded(Math.min(i + BATCH_SIZE, totalFiles));
          setUploadProgress(Math.floor(((i + BATCH_SIZE) / totalFiles) * 80));
          
          // Small delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < totalFiles) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        if (failedUploads > 0) {
          console.warn(`${failedUploads} tiles failed to upload`);
        }
      }
      
      // Create tileset metadata from parsed JSON
      setCurrentStep('Creating tileset metadata...');
      
      const meta = parsedMetadata!;
      
      // Parse bounds - support both formats
      let minLat, maxLat, minLon, maxLon, centerLat, centerLon, minZoom, maxZoom, defaultZoom;
      
      if (meta.bounds) {
        // TileJSON format: [minLon, minLat, maxLon, maxLat]
        [minLon, minLat, maxLon, maxLat] = meta.bounds;
      } else {
        // Direct format
        minLat = meta.minLat!;
        maxLat = meta.maxLat!;
        minLon = meta.minLon!;
        maxLon = meta.maxLon!;
      }
      
      if (meta.center) {
        // TileJSON format: [lon, lat, zoom]
        [centerLon, centerLat, defaultZoom] = meta.center;
      } else {
        centerLat = meta.centerLat || (minLat + maxLat) / 2;
        centerLon = meta.centerLon || (minLon + maxLon) / 2;
        defaultZoom = meta.defaultZoom || 16;
      }
      
      minZoom = meta.minZoom || 14;
      maxZoom = meta.maxZoom || 20;
      
      const metadata = {
        name: meta.name || `${selectedClubName} - Tileset`,
        description: meta.description,
        bounds: { minLat, maxLat, minLon, maxLon },
        center: { lat: centerLat, lon: centerLon },
        zoom: { min: minZoom, max: maxZoom, default: defaultZoom },
        r2FolderPath: `${sanitizedName}/tiles`,
        tileUrlPattern: '{z}/{x}/{y}.png',
        tileSize: meta.tileSize || 256,
        format: 'png' as const,
        attribution: meta.attribution
      };
      
      const tileset = await TilesetService.createTileset(selectedClubId, metadata);
      
      if (!tileset) {
        throw new Error('Failed to create tileset metadata');
      }
      
      setUploadProgress(100);
      setCurrentStep('Complete!');
      
      toast({
        title: 'Success!',
        description: `Uploaded ${totalFiles} tiles successfully`,
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
    setMetadataFile(null);
    setParsedMetadata(null);
    setUploadProgress(0);
    setCurrentStep('');
    setFilesUploaded(0);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderUp className="w-5 h-5" />
          Bulk Upload Tiles with Metadata
        </CardTitle>
        <CardDescription>
          Upload your existing z/x/y.png tile folder structure with metadata.json
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
          {selectedClubName && (
            <p className="text-sm text-muted-foreground">
              R2 Path: {sanitizeGolfCourseName(selectedClubName)}/tiles/z/x/y.png
            </p>
          )}
        </div>
        
        {/* Tile Folder Upload */}
        <div className="space-y-2">
          <Label htmlFor="tileFolder">Tile Folder (z/x/y.png structure) *</Label>
          <Input
            id="tileFolder"
            type="file"
            /* @ts-ignore */
            webkitdirectory=""
            directory=""
            multiple
            accept=".png"
            onChange={handleTileFilesSelect}
            disabled={isProcessing}
          />
          {tileFiles.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {tileFiles.length} PNG tiles selected
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Select your tile folder - the structure (z/x/y.png) will be preserved in R2
          </p>
        </div>
        
        {/* Metadata JSON Upload */}
        <div className="space-y-2">
          <Label htmlFor="metadata">Metadata JSON File *</Label>
          <Input
            id="metadata"
            type="file"
            accept=".json,application/json"
            onChange={handleMetadataSelect}
            disabled={isProcessing}
          />
          {parsedMetadata && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Metadata loaded</p>
              {parsedMetadata.name && <p className="text-xs">Name: {parsedMetadata.name}</p>}
              {parsedMetadata.bounds && (
                <p className="text-xs">Bounds: [{parsedMetadata.bounds.join(', ')}]</p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Upload metadata.json with bounds, zoom levels, and tileset info
          </p>
        </div>
        
        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">{currentStep}</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
            {filesUploaded > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Uploaded {filesUploaded} of {tileFiles.length} tiles
              </p>
            )}
          </div>
        )}
        
        {/* Submit Button */}
        <Button
          onClick={handleUploadTiles}
          disabled={isProcessing || !parsedMetadata || !selectedClubId}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {tileFiles.length > 0 ? 'Uploading Tiles...' : 'Creating Tileset...'}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {tileFiles.length > 0 ? `Upload ${tileFiles.length} Tiles` : 'Create Tileset (Metadata Only)'}
            </>
          )}
        </Button>
        
        {currentStep === 'Complete!' && (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Tileset created successfully!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TilesetUploader;

