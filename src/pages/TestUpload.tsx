import { LargeFileUpload } from '@/components/LargeFileUpload';

export default function TestUpload() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-2">
          Large File Upload Test
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Upload files up to 5GB directly to Cloudflare R2
        </p>
        
        <LargeFileUpload />

        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ <strong>Small files (&lt; 100MB):</strong> Direct presigned URL upload</li>
            <li>✅ <strong>Large files (&gt; 100MB):</strong> Chunked multipart upload (100MB chunks)</li>
            <li>✅ <strong>Parallel uploads:</strong> 3 concurrent chunks for faster speeds</li>
            <li>✅ <strong>Progress tracking:</strong> Real-time percentage and speed</li>
            <li>✅ <strong>Resumable:</strong> Can be extended to resume interrupted uploads</li>
          </ul>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Configuration Check</h3>
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">Worker URL:</span>{' '}
              <code className="bg-blue-100 px-2 py-1 rounded">
                {import.meta.env.VITE_WORKER_URL || 'NOT CONFIGURED'}
              </code>
            </p>
            {!import.meta.env.VITE_WORKER_URL && (
              <p className="text-red-600 mt-2">
                ⚠️ Add VITE_WORKER_URL to your .env file
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
