import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, File, CheckCircle } from "lucide-react";
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Golf course selection
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  
  const { toast } = useToast();

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

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('golf_clubs').select('id, name').order('name');
        if (!error && data) {
          setCourses(data as any);
        }
      } catch {}
    })();
  }, []);

  const handleFileUpload = async (files: File[]) => {
    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) return;

    // Validate required metadata
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        toast({ title: "Not authenticated", description: "Please log in again.", variant: "destructive" });
        return;
      }
      const { data: me } = await supabase.from('users').select('role').eq('id', sess.session.user.id).single();
      if (me?.role !== 'admin') {
        toast({ title: "Forbidden", description: "Only admins can upload tiles.", variant: "destructive" });
        return;
      }
    } catch {}

    if (!selectedCourse.trim()) {
      toast({ title: "Select a golf course", description: "Please choose a course for these tiles.", variant: "destructive" });
      return;
    }
    // z/x/y will be parsed from filename per file when available.

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
        
        // Attempt to parse z/x/y from file name patterns: z-x-y.png or z_x_y.png
        let zVal: number | undefined = undefined;
        let xVal: number | undefined = undefined;
        let yVal: number | undefined = undefined;
        const base = file.name.replace(/\.png$/i, '');
        const m = base.match(/(\d+)[_-](\d+)[_-](\d+)$/);
        if (m) {
          zVal = parseInt(m[1]);
          xVal = parseInt(m[2]);
          yVal = parseInt(m[3]);
        }
        const metadata = {
          zoomLevel: zVal,
          tileX: xVal,
          tileY: yVal,
          golfCourseName: selectedCourse || undefined,
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
      
      if (results.length === 0) {
        toast({
          title: "No files uploaded",
          description: "None of the selected files were uploaded. Check z/x/y values or filename pattern and try again.",
          variant: "destructive",
        });
        return;
      }

      setUploadProgress("All uploads successful! Processing will begin shortly...");

      toast({
        title: "PNG Tiles Uploaded Successfully",
        description: `${results.length} PNG tile(s) uploaded.`,
      });
      
      // Call appropriate callback(s)
      if (results.length === 1) {
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
      setSelectedFiles(files as File[]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files as File[]);
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
          Upload PNG tiles for analysis. Supports single or multiple file uploads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Golf Course Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-2">
            <Label>Golf Course</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder={courses.length ? 'Select a golf course' : 'No courses found'} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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

        {/* No geographic metadata fields; z/x/y inferred from filename when present */}

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
                  setSelectedFiles([]);
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
                  Only PNG files are supported
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
              {selectedFiles.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Selected: {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}</span>
                  <Button onClick={() => handleFileUpload(selectedFiles)} disabled={isProcessing}>
                    Submit Upload
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;