// Extend R2Bucket with presigned URL method (exists at runtime)
interface R2Bucket {
  createPresignedUrl(
    key: string,
    options: { expiresIn: number; method: 'PUT' | 'GET' }
  ): Promise<string>;
}
