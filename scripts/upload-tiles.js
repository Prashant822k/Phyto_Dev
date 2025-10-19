#!/usr/bin/env node

/**
 * Automated Tile Upload Script
 * 
 * Usage: node scripts/upload-tiles.js <tiles-folder> <golf-club-name>
 * Example: node scripts/upload-tiles.js ./my-tiles "Pine Valley Golf Club"
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Configuration
const BATCH_SIZE = 100; // Upload 100 tiles at a time
const PARALLEL_UPLOADS = 20; // 20 concurrent uploads per batch

// R2 Configuration from environment
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'map-stats-tiles-prod';

// Validate environment
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
  console.error('❌ Missing R2 credentials in .env file');
  console.error('Required: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  process.exit(1);
}

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// Sanitize golf club name for folder path
function sanitizeGolfCourseName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Find all PNG files recursively
function findPngFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findPngFiles(filePath, fileList);
    } else if (file.endsWith('.png')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Extract z/x/y path from file path
function extractTilePath(fullPath, baseDir) {
  const relativePath = path.relative(baseDir, fullPath);
  const parts = relativePath.split(path.sep);
  
  // Look for z/x/y.png pattern
  if (parts.length >= 3) {
    const z = parts[parts.length - 3];
    const x = parts[parts.length - 2];
    const y = parts[parts.length - 1];
    
    // Validate it looks like tile coordinates
    if (!isNaN(z) && !isNaN(x)) {
      return `${z}/${x}/${y}`;
    }
  }
  
  // Fallback: use last 3 parts
  return parts.slice(-3).join('/');
}

// Upload a single file to R2
async function uploadFile(localPath, r2Key) {
  const fileContent = fs.readFileSync(localPath);
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    Body: fileContent,
    ContentType: 'image/png',
  });
  
  await r2Client.send(command);
}

// Upload files in parallel batches
async function uploadBatch(files, baseDir, r2BasePath, batchNum, totalBatches) {
  const promises = files.map(async (file, index) => {
    const tilePath = extractTilePath(file, baseDir);
    const r2Key = `${r2BasePath}/${tilePath}`;
    
    try {
      await uploadFile(file, r2Key);
      return { success: true, file: tilePath };
    } catch (error) {
      console.error(`  ❌ Failed: ${tilePath} - ${error.message}`);
      return { success: false, file: tilePath, error: error.message };
    }
  });
  
  const results = await Promise.all(promises);
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`  ✓ Batch ${batchNum}/${totalBatches}: ${succeeded} succeeded, ${failed} failed`);
  
  return results;
}

// Main upload function
async function uploadTiles(tilesFolder, golfClubName) {
  console.log('\n🚀 Starting automated tile upload...\n');
  
  // Validate tiles folder
  if (!fs.existsSync(tilesFolder)) {
    console.error(`❌ Folder not found: ${tilesFolder}`);
    process.exit(1);
  }
  
  // Find all PNG files
  console.log(`📂 Scanning ${tilesFolder}...`);
  const pngFiles = findPngFiles(tilesFolder);
  console.log(`   Found ${pngFiles.length} PNG files\n`);
  
  if (pngFiles.length === 0) {
    console.error('❌ No PNG files found in folder');
    process.exit(1);
  }
  
  // Prepare R2 path
  const sanitizedName = sanitizeGolfCourseName(golfClubName);
  const r2BasePath = `${sanitizedName}/tiles`;
  console.log(`📍 R2 destination: ${R2_BUCKET}/${r2BasePath}\n`);
  
  // Upload in batches
  const totalBatches = Math.ceil(pngFiles.length / BATCH_SIZE);
  const allResults = [];
  
  console.log(`⬆️  Uploading ${pngFiles.length} tiles in ${totalBatches} batches...\n`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < pngFiles.length; i += BATCH_SIZE) {
    const batch = pngFiles.slice(i, Math.min(i + BATCH_SIZE, pngFiles.length));
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    
    // Split batch into parallel chunks
    const chunkSize = Math.ceil(batch.length / PARALLEL_UPLOADS);
    const chunks = [];
    for (let j = 0; j < batch.length; j += chunkSize) {
      chunks.push(batch.slice(j, j + chunkSize));
    }
    
    const batchPromises = chunks.map(chunk => 
      uploadBatch(chunk, tilesFolder, r2BasePath, batchNum, totalBatches)
    );
    
    const batchResults = await Promise.all(batchPromises);
    allResults.push(...batchResults.flat());
    
    // Progress update
    const uploaded = i + batch.length;
    const percent = Math.floor((uploaded / pngFiles.length) * 100);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   Progress: ${uploaded}/${pngFiles.length} (${percent}%) - ${elapsed}s elapsed`);
  }
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const succeeded = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  
  console.log(`\n✅ Upload complete!`);
  console.log(`   Total time: ${totalTime}s`);
  console.log(`   Succeeded: ${succeeded}`);
  console.log(`   Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.log('⚠️  Failed files:');
    allResults.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.file}: ${r.error}`);
    });
    console.log('');
  }
  
  // Next steps
  console.log('📋 Next steps:');
  console.log(`   1. Go to Admin Dashboard → Upload Tiles`);
  console.log(`   2. Select golf course: ${golfClubName}`);
  console.log(`   3. Upload metadata.json (skip tile selection)`);
  console.log(`   4. Or insert tileset metadata directly in database\n`);
  
  return { succeeded, failed, total: pngFiles.length };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node upload-tiles.js <tiles-folder> <golf-club-name>');
    console.log('');
    console.log('Example:');
    console.log('  node upload-tiles.js ./my-tiles "Pine Valley Golf Club"');
    console.log('');
    console.log('Make sure to set R2 credentials in .env file:');
    console.log('  CLOUDFLARE_R2_ACCOUNT_ID=...');
    console.log('  CLOUDFLARE_R2_ACCESS_KEY_ID=...');
    console.log('  CLOUDFLARE_R2_SECRET_ACCESS_KEY=...');
    process.exit(1);
  }
  
  const [tilesFolder, golfClubName] = args;
  
  uploadTiles(tilesFolder, golfClubName)
    .then(result => {
      process.exit(result.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('\n❌ Upload failed:', error.message);
      process.exit(1);
    });
}

module.exports = { uploadTiles, sanitizeGolfCourseName };

