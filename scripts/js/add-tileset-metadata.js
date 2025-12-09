/**
 * Helper Script: Add Tileset Metadata to Supabase
 * 
 * This script helps you easily add tileset metadata from a JSON file
 * to your Supabase database.
 * 
 * Usage:
 *   node add-tileset-metadata.js <golf-course-name> <metadata-file.json>
 * 
 * Example:
 *   node add-tileset-metadata.js "Augusta National Golf Club" augusta-metadata.json
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables')
  console.error('   Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addTilesetMetadata(golfCourseName, metadataFilePath) {
  try {
    console.log('🚀 Starting tileset metadata upload...\n')

    // Step 1: Read the metadata JSON file
    console.log('📖 Reading metadata file:', metadataFilePath)
    const metadataContent = readFileSync(metadataFilePath, 'utf-8')
    const metadata = JSON.parse(metadataContent)
    console.log('✅ Metadata file loaded successfully\n')

    // Step 2: Find the golf club ID
    console.log('🔍 Looking for golf course:', golfCourseName)
    const { data: golfClub, error: clubError } = await supabase
      .from('golf_clubs')
      .select('id, name')
      .eq('name', golfCourseName)
      .single()

    if (clubError || !golfClub) {
      console.error('❌ Error: Golf course not found:', golfCourseName)
      console.error('   Available golf courses:')
      
      const { data: allClubs } = await supabase
        .from('golf_clubs')
        .select('name')
        .order('name')
      
      allClubs?.forEach(club => console.error('   - ' + club.name))
      process.exit(1)
    }

    console.log('✅ Found golf course:', golfClub.name)
    console.log('   ID:', golfClub.id, '\n')

    // Step 3: Validate metadata structure
    console.log('🔍 Validating metadata structure...')
    const requiredFields = ['name', 'bounds', 'center', 'zoom', 'r2FolderPath', 'tileUrlPattern']
    const missingFields = requiredFields.filter(field => !metadata[field])
    
    if (missingFields.length > 0) {
      console.error('❌ Error: Missing required fields in metadata:', missingFields.join(', '))
      process.exit(1)
    }

    // Validate bounds
    if (metadata.bounds.minLat >= metadata.bounds.maxLat) {
      console.error('❌ Error: minLat must be less than maxLat')
      process.exit(1)
    }
    if (metadata.bounds.minLon >= metadata.bounds.maxLon) {
      console.error('❌ Error: minLon must be less than maxLon')
      process.exit(1)
    }

    console.log('✅ Metadata structure is valid\n')

    // Step 4: Check if tileset already exists
    console.log('🔍 Checking for existing tilesets...')
    const { data: existingTileset } = await supabase
      .from('golf_course_tilesets')
      .select('id, name')
      .eq('golf_club_id', golfClub.id)
      .eq('name', metadata.name)
      .single()

    if (existingTileset) {
      console.log('⚠️  Warning: A tileset with this name already exists')
      console.log('   Existing tileset:', existingTileset.name)
      console.log('   ID:', existingTileset.id)
      console.log('\n   Do you want to:')
      console.log('   1. Create a new tileset with a different name')
      console.log('   2. Update the existing tileset')
      console.log('   3. Cancel')
      console.log('\n   For now, cancelling to avoid duplicates.')
      console.log('   Please rename your tileset or delete the existing one.\n')
      process.exit(0)
    }

    // Step 5: Insert the tileset metadata
    console.log('💾 Inserting tileset metadata into database...')
    const tilesetData = {
      golf_club_id: golfClub.id,
      name: metadata.name,
      description: metadata.description || null,
      min_lat: metadata.bounds.minLat,
      max_lat: metadata.bounds.maxLat,
      min_lon: metadata.bounds.minLon,
      max_lon: metadata.bounds.maxLon,
      center_lat: metadata.center.lat,
      center_lon: metadata.center.lon,
      min_zoom: metadata.zoom.min,
      max_zoom: metadata.zoom.max,
      default_zoom: metadata.zoom.default,
      r2_folder_path: metadata.r2FolderPath,
      tile_url_pattern: metadata.tileUrlPattern,
      tile_size: metadata.tileSize || 256,
      format: metadata.format || 'png',
      attribution: metadata.attribution || null,
      is_active: true
    }

    const { data: newTileset, error: insertError } = await supabase
      .from('golf_course_tilesets')
      .insert(tilesetData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error inserting tileset:', insertError.message)
      process.exit(1)
    }

    console.log('✅ Tileset metadata added successfully!\n')

    // Step 6: Display summary
    console.log('📊 Summary:')
    console.log('   Golf Course:', golfClub.name)
    console.log('   Tileset Name:', newTileset.name)
    console.log('   Tileset ID:', newTileset.id)
    console.log('   Bounds:', `(${metadata.bounds.minLat}, ${metadata.bounds.minLon}) to (${metadata.bounds.maxLat}, ${metadata.bounds.maxLon})`)
    console.log('   Center:', `(${metadata.center.lat}, ${metadata.center.lon})`)
    console.log('   Zoom Levels:', `${metadata.zoom.min} - ${metadata.zoom.max} (default: ${metadata.zoom.default})`)
    console.log('   R2 Folder:', metadata.r2FolderPath)
    console.log('   Tile Pattern:', metadata.tileUrlPattern)
    console.log('   Format:', metadata.format || 'png')
    console.log('   Tile Size:', metadata.tileSize || 256, 'px')
    console.log('\n✨ Done! Your tileset is now ready to be displayed on the map.')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 2) {
  console.log('Usage: node add-tileset-metadata.js <golf-course-name> <metadata-file.json>')
  console.log('\nExample:')
  console.log('  node add-tileset-metadata.js "Augusta National Golf Club" augusta-metadata.json')
  console.log('\nAvailable golf courses:')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  supabase
    .from('golf_clubs')
    .select('name')
    .order('name')
    .then(({ data }) => {
      data?.forEach(club => console.log('  - ' + club.name))
    })
  
  process.exit(1)
}

const [golfCourseName, metadataFile] = args
addTilesetMetadata(golfCourseName, metadataFile)
