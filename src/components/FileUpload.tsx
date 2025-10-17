import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, File, CheckCircle, AlertCircle, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageService, type UploadResult } from "@/lib/imageService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

interface FileUploadProps {
  onFileProcessed: (imageId: string, imageUrl: string) => void;
  onMultipleFilesProcessed?: (results: Array<{imageId: string, imageUrl: string}>) => void;
}

const FileUpload = ({ onFileProcessed, onMultipleFilesProcessed }: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, id: string, url: string}>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [uploadMode, setUploadMode] = useState<'single' | 'multiple'>('single');
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [totalUploads, setTotalUploads] = useState(0);
  
  // Golf course selection
  const [golfClubs, setGolfClubs] = useState<Array<{id: string, name: string}>>([]);
  const [selectedGolfClub, setSelectedGolfClub] = useState<string>("");
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  
  // Geographic metadata inputs
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [zoomLevel, setZoomLevel] = useState<string>("");
  const [tileX, setTileX] = useState<string>("");
  const [tileY, setTileY] = useState<string>("");
  
  const { toast } = useToast();

  // Fetch golf clubs on component mount
  useEffect(() => {
    const fetchGolfClubs = async () => {
      try {
        const { data, error } = await supabase
          .from('golf_clubs')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        
        setGolfClubs(data || []);
        if (data && data.length > 0) {
          setSelectedGolfClub(data[0].name);
        }
      } catch (error) {
        console.error('Error fetching golf clubs:', error);
        toast({
          title: "Error Loading Golf Courses",
          description: "Failed to load golf courses. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingClubs(false);
      }
    };

    fetchGolfClubs();
  }, [toast]);

  const validateFile = (file: File): boolean => {
    if (!file.type.includes('image/png')) {
      toast({
        title: "Invalid File Type",
        description: "Only PNG files are allowed for tile uploads.",
        variant: "destructive",
      });
      return false;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File Too Large",
        description: "File size must be less than 50MB.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleFileUpload = async (files: File[]) => {
    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) return;
    
    // Validate golf club selection
    if (!selectedGolfClub) {
      toast({
        title: "Golf Course Required",
        description: "Please select a golf course before uploading.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    setTotalUploads(validFiles.length);
    setCurrentUploadIndex(0);
    setUploadedFiles([]);
    
    const results: Array<{imageId: string, imageUrl: string}> = [];
    
    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setCurrentUploadIndex(i + 1);
        setUploadProgress(`Uploading ${file.name} (${i + 1}/${validFiles.length})...`);
        
        // Parse geographic metadata (can be different for each file)
        const metadata = {
          lat: lat ? parseFloat(lat) : undefined,
          lon: lon ? parseFloat(lon) : undefined,
          zoomLevel: zoomLevel ? parseInt(zoomLevel) : undefined,
          tileX: tileX ? parseInt(tileX) : undefined,
          tileY: tileY ? parseInt(tileY) : undefined,
          golfCourseName: selectedGolfClub,
        };
        
        console.log('Uploading file with metadata:', { fileName: file.name, metadata });
        const result: UploadResult = await ImageService.uploadTile(file, metadata);
        
        if (result.success && result.image) {
          const signedUrl = await ImageService.getImageUrl(result.image);
          const uploadedFile = {
            name: file.name,
            id: result.image.id,
            url: signedUrl
          };
          
          setUploadedFiles(prev => [...prev, uploadedFile]);
          results.push({ imageId: result.image.id, imageUrl: signedUrl });
        } else {
          throw new Error(result.error || `Upload failed for ${file.name}`);
        }
      }
      
      setUploadProgress("All uploads successful! Processing will begin shortly...");
      
      toast({
        title: "PNG Tiles Uploaded Successfully",
        description: `${validFiles.length} PNG tile(s) uploaded and queued for analysis.`,
      });
      
      // Call appropriate callback
      if (validFiles.length === 1) {
        onFileProcessed(results[0].imageId, results[0].imageUrl);
      } else if (onMultipleFilesProcessed) {
        onMultipleFilesProcessed(results);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
      setUploadedFiles([]);
    } finally {
      setIsProcessing(false);
      setUploadProgress("");
      setCurrentUploadIndex(0);
      setTotalUploads(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Agricultural Data
        </CardTitle>
        <CardDescription>
          Upload PNG tiles from tiled TIFF images for agricultural analysis. Supports single or multiple file uploads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Golf Course Selection */}
        {uploadedFiles.length === 0 && (
          <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
            <Label htmlFor="golf-course" className="text-base font-semibold mb-2 block">
              Select Golf Course *
            </Label>
            <Select
              value={selectedGolfClub}
              onValueChange={setSelectedGolfClub}
              disabled={isLoadingClubs}
            >
              <SelectTrigger id="golf-course" className="w-full">
                <SelectValue placeholder="Choose a golf course" />
              </SelectTrigger>
              <SelectContent>
                {golfClubs.map((club) => (
                  <SelectItem key={club.id} value={club.name}>
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Files will be organized in the folder: <span className="font-mono text-primary">{selectedGolfClub || 'golf-course-name'}</span>
            </p>
          </div>
        )}

        {/* Upload Mode Toggle */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <Label htmlFor="upload-mode">Upload Mode:</Label>
          <div className="flex gap-2">
            <Button
              variant={uploadMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('single')}
            >
              Single File
            </Button>
            <Button
              variant={uploadMode === 'multiple' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('multiple')}
            >
              Multiple Files
            </Button>
          </div>
        </div>

        {/* Geographic Metadata Form */}
        {uploadedFiles.length === 0 && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude (optional)</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                placeholder="e.g., 12.9716"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lon">Longitude (optional)</Label>
              <Input
                id="lon"
                type="number"
                step="any"
                placeholder="e.g., 77.5946"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoom">Zoom Level (optional)</Label>
              <Input
                id="zoom"
                type="number"
                placeholder="e.g., 15"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tile-x">Tile X (optional)</Label>
              <Input
                id="tile-x"
                type="number"
                placeholder="e.g., 12345"
                value={tileX}
                onChange={(e) => setTileX(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tile-y">Tile Y (optional)</Label>
              <Input
                id="tile-y"
                type="number"
                placeholder="e.g., 67890"
                value={tileY}
                onChange={(e) => setTileY(e.target.value)}
              />
            </div>
            <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              Geographic metadata helps with analysis and tile positioning
            </div>
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Uploading {totalUploads > 1 ? `${currentUploadIndex}/${totalUploads}` : 'file'}...
                </p>
                {uploadProgress && (
                  <p className="text-xs text-muted-foreground mt-1">{uploadProgress}</p>
                )}
                {totalUploads > 1 && (
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(currentUploadIndex / totalUploads) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : uploadedFiles.length > 0 ? (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="w-12 h-12 text-terrain-healthy" />
              <div className="text-center">
                <p className="font-medium">
                  {uploadedFiles.length === 1 ? 'PNG Tile' : `${uploadedFiles.length} PNG Tiles`} Uploaded Successfully
                </p>
                <div className="mt-2 space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <p key={index} className="text-sm text-muted-foreground">{file.name}</p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Processing will begin automatically
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setUploadedFiles([]);
                  setLat("");
                  setLon("");
                  setZoomLevel("");
                  setTileX("");
                  setTileY("");
                }}
              >
                Upload {uploadedFiles.length === 1 ? 'Another' : 'More'} Tile{uploadedFiles.length === 1 ? '' : 's'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <File className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">
                  Drop PNG tiles here or click to upload
                </p>
                <p className="text-sm text-muted-foreground">
                  Only PNG files from tiled TIFF images are supported
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max file size: 50MB per file • {uploadMode === 'multiple' ? 'Multiple files supported' : 'Single file mode'}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                id="file-upload"
                accept=".png"
                multiple={uploadMode === 'multiple'}
                onChange={handleFileInput}
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose PNG Tile{uploadMode === 'multiple' ? 's' : ''}
                </label>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;