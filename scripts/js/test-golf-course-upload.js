/**
 * Test script for Golf Course Upload functionality
 * 
 * This script tests:
 * 1. Golf course name sanitization
 * 2. Database connection to golf_clubs table
 * 3. Basic R2 path structure
 * 
 * Run with: node test-golf-course-upload.js
 */

// Sanitization function (same as utils.ts)
function sanitizeGolfCourseName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

// Test cases
const testCases = [
  'Pine Valley Golf Club',
  'St. Andrews (Old Course)',
  'Augusta National Golf Club',
  'Royal County Down Golf Club',
  'The Best Golf!!!',
  'Green Hills  Club  123',
  'Pebble Beach Golf Links & Resort',
];

console.log('=== Golf Course Name Sanitization Tests ===\n');

testCases.forEach(name => {
  const sanitized = sanitizeGolfCourseName(name);
  console.log(`Original:  "${name}"`);
  console.log(`Sanitized: "${sanitized}"`);
  console.log(`R2 Path:   map-stats-tiles-prod/${sanitized}/filename.png`);
  console.log('---');
});

console.log('\n=== Expected Folder Structure ===\n');
console.log('map-stats-tiles-prod/');
testCases.forEach(name => {
  const sanitized = sanitizeGolfCourseName(name);
  console.log(`├── ${sanitized}/`);
  console.log(`│   ├── 1234567890_tile1.png`);
  console.log(`│   └── 1234567891_tile2.png`);
});

console.log('\n=== Integration Test Checklist ===\n');
console.log('☐ 1. Add golf courses to database (run add-golf-courses.sql)');
console.log('☐ 2. Verify golf courses appear in upload dropdown');
console.log('☐ 3. Upload a test PNG file');
console.log('☐ 4. Check R2 bucket for correct folder structure');
console.log('☐ 5. Verify file is accessible via signed URL');
console.log('☐ 6. Check database images table for correct path');

console.log('\n=== SQL Commands for Testing ===\n');
console.log('-- View all golf courses:');
console.log('SELECT * FROM public.golf_clubs ORDER BY name;');
console.log('');
console.log('-- Add test course:');
console.log("INSERT INTO public.golf_clubs (name) VALUES ('Test Golf Course');");
console.log('');
console.log('-- View uploaded images with paths:');
console.log('SELECT filename, path, created_at FROM public.images ORDER BY created_at DESC LIMIT 10;');
console.log('');
console.log('-- Count uploads per course (using path):');
console.log("SELECT ");
console.log("  SPLIT_PART(path, '/', 1) as golf_course_folder,");
console.log("  COUNT(*) as upload_count");
console.log("FROM public.images ");
console.log("WHERE path LIKE '%/%'");
console.log("GROUP BY SPLIT_PART(path, '/', 1)");
console.log("ORDER BY upload_count DESC;");

console.log('\n=== Done! ===\n');

