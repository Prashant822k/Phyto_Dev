// Simple test script to verify R2 function is working
// Run this in your browser console or as a standalone script

async function testR2Function() {
  try {
    // Replace with your actual values
    const supabaseUrl = 'https://efnorpyrsfoxooufujnd.supabase.co';
    const functionUrl = `${supabaseUrl}/functions/v1/r2-sign`;
    
    console.log('Testing R2 function at:', functionUrl);
    
    // Test with a simple request
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add a valid JWT token here
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE'
      },
      body: JSON.stringify({
        action: 'getPutUrl',
        key: 'test/test.png',
        contentType: 'image/png'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (response.ok) {
      console.log('✅ R2 function is working!');
    } else {
      console.log('❌ R2 function error:', response.status, text);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Uncomment to run the test
// testR2Function();
