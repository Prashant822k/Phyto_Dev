// Browser Console Test Script
// Copy and paste this into your browser console while on your app

async function testTileAccess() {
  console.log('🔍 Testing Tile Access...\n');
  
  const tilesetId = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';
  const z = 15, x = 16910, y = 10916;
  
  // Get session token
  const { data: { session } } = await window.supabase.auth.getSession();
  
  if (!session) {
    console.error('❌ No active session. Please log in first.');
    return;
  }
  
  console.log('✅ Session found');
  console.log('   User:', session.user.email);
  console.log('   Token:', session.access_token.substring(0, 20) + '...\n');
  
  // Test 1: Check if tileset exists in database
  console.log('📊 Test 1: Database Query');
  const { data: tileset, error: dbError } = await window.supabase
    .from('golf_course_tilesets')
    .select('*')
    .eq('id', tilesetId)
    .single();
  
  if (dbError) {
    console.error('❌ Database error:', dbError);
    return;
  }
  
  console.log('✅ Tileset found in database');
  console.log('   Name:', tileset.name);
  console.log('   r2_folder_path:', tileset.r2_folder_path);
  console.log('   tile_url_pattern:', tileset.tile_url_pattern);
  console.log('   golf_club_id:', tileset.golf_club_id);
  console.log('   flight_date:', tileset.flight_date);
  console.log('   flight_time:', tileset.flight_time);
  console.log('');
  
  // Test 2: Check user's club access
  console.log('👤 Test 2: User Access Check');
  const { data: user, error: userError } = await window.supabase
    .from('users')
    .select('id, email, club_id, role')
    .eq('id', session.user.id)
    .single();
  
  if (userError) {
    console.error('❌ User query error:', userError);
  } else {
    console.log('✅ User info:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Club ID:', user.club_id);
    console.log('   Tileset Club ID:', tileset.golf_club_id);
    
    if (user.role === 'admin') {
      console.log('   ✅ User is admin - has access to all tilesets');
    } else if (user.club_id === tileset.golf_club_id) {
      console.log('   ✅ User club matches tileset club - has access');
    } else {
      console.log('   ❌ User club does NOT match tileset club - NO ACCESS');
      console.log('   This is likely causing the 400 error!');
    }
  }
  console.log('');
  
  // Test 3: Test tile-proxy endpoint
  console.log('🌐 Test 3: Tile Proxy Request');
  const supabaseUrl = window.supabase.supabaseUrl;
  const tileProxyUrl = `${supabaseUrl}/functions/v1/tile-proxy?tilesetId=${tilesetId}&z=${z}&x=${x}&y=${y}&token=${session.access_token}`;
  
  console.log('   URL:', tileProxyUrl.replace(session.access_token, 'TOKEN...'));
  
  try {
    const response = await fetch(tileProxyUrl);
    console.log('   Status:', response.status, response.statusText);
    console.log('   OK:', response.ok);
    console.log('   Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const blob = await response.blob();
      console.log('   ✅ Tile fetched successfully!');
      console.log('   Size:', blob.size, 'bytes');
      console.log('   Type:', blob.type);
    } else {
      const text = await response.text();
      console.error('   ❌ Tile fetch failed');
      console.error('   Response:', text);
      
      try {
        const json = JSON.parse(text);
        console.error('   Error details:', json);
      } catch (e) {
        // Not JSON
      }
    }
  } catch (error) {
    console.error('   ❌ Request failed:', error);
  }
  console.log('');
  
  // Test 4: Test direct R2 access
  console.log('🗄️ Test 4: Direct R2 Access');
  const key = `${tileset.r2_folder_path}/${z}/${x}/${y}.png`;
  const r2Url = `https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/${key}`;
  
  console.log('   Key:', key);
  console.log('   URL:', r2Url);
  
  try {
    const response = await fetch(r2Url);
    console.log('   Status:', response.status, response.statusText);
    console.log('   OK:', response.ok);
    
    if (response.ok) {
      const blob = await response.blob();
      console.log('   ✅ R2 file accessible!');
      console.log('   Size:', blob.size, 'bytes');
      console.log('   Type:', blob.type);
    } else {
      console.error('   ❌ R2 file not accessible');
      console.error('   This could mean:');
      console.error('   - File does not exist at this path');
      console.error('   - R2 public access is not enabled');
      console.error('   - R2 domain is incorrect');
    }
  } catch (error) {
    console.error('   ❌ R2 request failed:', error);
  }
  console.log('');
  
  // Summary
  console.log('📋 Summary:');
  console.log('   Tileset ID:', tilesetId);
  console.log('   Path:', tileset.r2_folder_path);
  console.log('   Tile:', `${z}/${x}/${y}.png`);
  console.log('   Full Key:', key);
  console.log('');
  console.log('Next steps:');
  console.log('1. Check the test results above');
  console.log('2. If user access failed, update user role or club_id');
  console.log('3. If R2 access failed, check R2 bucket settings');
  console.log('4. Deploy updated edge functions for better error messages');
}

// Run the test
testTileAccess();
