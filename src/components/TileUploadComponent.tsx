import { useState, useRef } from 'react';
import { TileUploader, extractTilesFromZip, extractTilesFromFiles, UploadProgress } from '@/lib/tile-upload';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FolderOpen, FileArchive, CheckCircle2, AlertCircle } from 'lucide-react';

export function TileUploadComponent() {
  const [courseId, setCourseId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [tileUrl, setTileUrl] = useState('');
  const [error, setError] = useState('');
  const [tileCount, setTileCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) {
      setError('Please enter a course ID');
      return;
    }

    setUploading(true);
    setProgress(null);
    setError('');

    try {
      const uploader = new TileUploader(courseId);
      const tiles = await extractTilesFromZip(file);
      
      if (tiles.length === 0) {
        throw new Error('No tiles found in ZIP file. Expected structure: z/x/y.png');
      }

      setTileCount(tiles.length);

      await uploader.uploadTiles(tiles, (p) => {
        setProgress(p);
      });

      setTileUrl(uploader.getTileUrl());
    } catch (err) {
      console.error('Upload failed:', err);
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !courseId) {
      setError('Please enter a course ID and select a folder');
      return;
    }

    setUploading(true);
    setProgress(null);
    setError('');

    try {
      const uploader = new TileUploader(courseId);
      const tiles = await extractTilesFromFiles(files);
      
      if (tiles.length === 0) {
        throw new Error('No tiles found in folder. Expected structure: z/x/y.png');
      }

      setTileCount(tiles.length);

      await uploader.uploadTiles(tiles, (p) => {
        setProgress(p);
      });

      setTileUrl(uploader.getTileUrl());
    } catch (err) {
      console.error('Upload failed:', err);
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Map Tiles</CardTitle>
        <CardDescription>
          Upload tiles for a golf course to Cloudflare R2. Tiles must follow the z/x/y.png structure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Course ID Input */}
        <div className="space-y-2">
          <Label htmlFor="courseId">Course ID</Label>
          <Input
            id="courseId"
            placeholder="e.g., the-best-golf"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={uploading}
          />
          <p className="text-xs text-gray-500">
            Use lowercase with hyphens (e.g., the-best-golf)
          </p>
        </div>

        {/* Upload Options */}
        <div className="grid grid-cols-2 gap-4">
          {/* ZIP Upload */}
          <div className="space-y-2">
            <Label>Upload ZIP File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleZipUpload}
              disabled={!courseId || uploading}
              className="hidden"
              id="zip-upload"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={!courseId || uploading}
            >
              <FileArchive className="w-4 h-4 mr-2" />
              Select ZIP
            </Button>
          </div>

          {/* Folder Upload */}
          <div className="space-y-2">
            <Label>Upload Folder</Label>
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore - webkitdirectory is not in types
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderUpload}
              disabled={!courseId || uploading}
              className="hidden"
              id="folder-upload"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => folderInputRef.current?.click()}
              disabled={!courseId || uploading}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Select Folder
            </Button>
          </div>
        </div>

        {/* Progress */}
        {uploading && progress && (
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Uploading tiles...</span>
              <span className="text-gray-600">
                {progress.uploaded} / {progress.total}
              </span>
            </div>
            <Progress value={progress.percentage} />
            <div className="flex justify-between text-xs text-gray-600">
              <span>{progress.percentage.toFixed(1)}%</span>
              {progress.currentTile && (
                <span className="font-mono">{progress.currentTile}</span>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Upload failed</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success */}
        {tileUrl && !uploading && (
          <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="font-medium text-green-800">Upload successful!</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-green-700">
                {tileCount} tiles uploaded to <code className="font-mono bg-green-100 px-1 rounded">{courseId}</code>
              </p>
              <div className="space-y-1">
                <Label className="text-xs text-green-700">Tile URL for Mapbox:</Label>
                <code className="text-xs bg-white p-2 block rounded border border-green-200 break-all">
                  {tileUrl}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded">
          <p className="font-medium">Expected tile structure:</p>
          <code className="block pl-4">
            z/x/y.png<br />
            15/5242/12663.png<br />
            15/5242/12664.png<br />
            16/10484/25326.png
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
