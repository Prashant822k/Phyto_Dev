import { useState, useRef } from 'react';
import { uploadToR2, UploadProgress } from '@/lib/r2-upload';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X } from 'lucide-react';

export function LargeFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setUploadedKey(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(null);

    try {
      const key = `uploads/${Date.now()}-${file.name}`;
      const result = await uploadToR2(file, key, (p) => setProgress(p));
      setUploadedKey(result);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatSpeed = (bytesPerSecond?: number) => {
    if (!bytesPerSecond) return '';
    return formatSize(bytesPerSecond) + '/s';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center space-y-2"
        >
          <Upload className="w-12 h-12 text-gray-400" />
          <span className="text-sm text-gray-600">
            Click to select file (supports files over 1GB)
          </span>
        </label>
      </div>

      {file && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
            </div>
            {!uploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {uploading && progress && (
            <div className="space-y-2">
              <Progress value={progress.percentage} />
              <div className="flex justify-between text-xs text-gray-600">
                <span>
                  {formatSize(progress.loaded)} / {formatSize(progress.total)}
                </span>
                <span>{progress.percentage.toFixed(1)}%</span>
                <span>{formatSpeed(progress.speed)}</span>
              </div>
            </div>
          )}

          {!uploading && (
            <Button onClick={handleUpload} className="w-full">
              Upload to R2
            </Button>
          )}

          {uploading && (
            <Button variant="outline" className="w-full" disabled>
              Uploading...
            </Button>
          )}
        </div>
      )}

      {uploadedKey && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-800">Upload successful!</p>
          <p className="text-xs text-green-600 mt-1 break-all">{uploadedKey}</p>
        </div>
      )}
    </div>
  );
}
