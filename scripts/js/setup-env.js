#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envTemplate = `# FRONTEND ENVIRONMENT VARIABLES
# Update these with your actual Supabase project values

# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: For development with local Supabase
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=your_local_anon_key
`;

const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  console.log('📝 Please update it with your Supabase project values:');
  console.log('   - VITE_SUPABASE_URL: Your Supabase project URL');
  console.log('   - VITE_SUPABASE_ANON_KEY: Your Supabase anon key');
} else {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env file');
  console.log('📝 Please update it with your Supabase project values:');
  console.log('   - VITE_SUPABASE_URL: Your Supabase project URL');
  console.log('   - VITE_SUPABASE_ANON_KEY: Your Supabase anon key');
  console.log('');
  console.log('🔗 You can find these values in your Supabase Dashboard:');
  console.log('   Settings > API > Project URL and anon public key');
}
