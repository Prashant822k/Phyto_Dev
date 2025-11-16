/**
 * EXIF Metadata Extraction Utility
 * Extracts date/time information from PNG tiles
 */

export interface ExifMetadata {
  dateTime?: string;
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  gpsDateTime?: string;
}

export interface ExtractedDateTime {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  datetime: string; // ISO 8601
}

/**
 * Extract EXIF metadata from a PNG file
 * PNG files can contain tEXt chunks with metadata
 */
export async function extractPngMetadata(file: File | Blob): Promise<ExifMetadata> {
  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  
  const metadata: ExifMetadata = {};
  
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < pngSignature.length; i++) {
    if (dataView.getUint8(i) !== pngSignature[i]) {
      throw new Error('Not a valid PNG file');
    }
  }
  
  let offset = 8; // Skip PNG signature
  
  // Read PNG chunks
  while (offset < dataView.byteLength) {
    const chunkLength = dataView.getUint32(offset);
    const chunkType = String.fromCharCode(
      dataView.getUint8(offset + 4),
      dataView.getUint8(offset + 5),
      dataView.getUint8(offset + 6),
      dataView.getUint8(offset + 7)
    );
    
    // Look for tEXt or zTXt chunks that might contain EXIF data
    if (chunkType === 'tEXt' || chunkType === 'iTXt') {
      const chunkData = new Uint8Array(arrayBuffer, offset + 8, chunkLength);
      const text = new TextDecoder('latin1').decode(chunkData);
      
      // Parse key-value pairs
      const nullIndex = text.indexOf('\0');
      if (nullIndex > 0) {
        const key = text.substring(0, nullIndex);
        const value = text.substring(nullIndex + 1);
        
        // Check for common EXIF date/time fields
        if (key.toLowerCase().includes('datetime') || key.toLowerCase().includes('date')) {
          if (key.toLowerCase().includes('original')) {
            metadata.dateTimeOriginal = value;
          } else if (key.toLowerCase().includes('digitized')) {
            metadata.dateTimeDigitized = value;
          } else {
            metadata.dateTime = value;
          }
        }
      }
    }
    
    // Move to next chunk (length + type + data + CRC)
    offset += 12 + chunkLength;
    
    // Stop at IEND chunk
    if (chunkType === 'IEND') break;
  }
  
  return metadata;
}

/**
 * Parse EXIF datetime string to structured format
 * EXIF format: "YYYY:MM:DD HH:MM:SS"
 */
export function parseExifDateTime(exifDateTime: string): ExtractedDateTime | null {
  if (!exifDateTime) return null;
  
  // Try EXIF format: "YYYY:MM:DD HH:MM:SS"
  const exifMatch = exifDateTime.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (exifMatch) {
    const [, year, month, day, hour, minute] = exifMatch;
    const date = `${year}-${month}-${day}`;
    const time = `${hour}:${minute}`;
    const datetime = `${date}T${time}:00`;
    return { date, time, datetime };
  }
  
  // Try ISO format: "YYYY-MM-DDTHH:MM:SS"
  const isoMatch = exifDateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    const [, year, month, day, hour, minute] = isoMatch;
    const date = `${year}-${month}-${day}`;
    const time = `${hour}:${minute}`;
    const datetime = `${date}T${time}:00`;
    return { date, time, datetime };
  }
  
  return null;
}

/**
 * Extract date and time from a PNG tile file
 * Returns the best available date/time information
 */
export async function extractDateTimeFromPng(file: File | Blob): Promise<ExtractedDateTime | null> {
  try {
    const metadata = await extractPngMetadata(file);
    
    // Try different EXIF fields in order of preference
    const dateTimeString = 
      metadata.dateTimeOriginal || 
      metadata.dateTimeDigitized || 
      metadata.dateTime ||
      metadata.gpsDateTime;
    
    if (dateTimeString) {
      return parseExifDateTime(dateTimeString);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to extract EXIF metadata:', error);
    return null;
  }
}

/**
 * Fallback: Use file modification time if EXIF is not available
 */
export function getFileDateTime(file: File): ExtractedDateTime {
  const date = new Date(file.lastModified);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(':').slice(0, 2).join(':'); // HH:MM
  const datetime = date.toISOString();
  
  return { date: dateStr, time: timeStr, datetime };
}

/**
 * Extract date/time from PNG with fallback to file modification time
 */
export async function extractOrFallbackDateTime(file: File): Promise<ExtractedDateTime> {
  const exifDateTime = await extractDateTimeFromPng(file);
  
  if (exifDateTime) {
    return exifDateTime;
  }
  
  // Fallback to file modification time
  console.warn('No EXIF data found, using file modification time');
  return getFileDateTime(file);
}

/**
 * Format time for R2 folder path (HH-MM format)
 */
export function formatTimeForPath(time: string): string {
  return time.replace(':', '-');
}

/**
 * Generate R2 folder path with date and time
 * Format: {courseName}/{YYYY-MM-DD}/{HH-MM}/tiles
 */
export function generateR2FolderPath(
  courseName: string, 
  date: string, 
  time: string
): string {
  const formattedTime = formatTimeForPath(time);
  return `${courseName}/${date}/${formattedTime}/tiles`;
}
