#!/bin/bash

# Deploy the tile-proxy Supabase Edge Function
# This script deploys the function that serves XYZ tiles from Cloudflare R2

set -e  # Exit on error

echo "🚀 Deploying tile-proxy edge function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying tile-proxy function..."
supabase functions deploy tile-proxy --no-verify-jwt

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Make sure R2 credentials are set in Supabase Edge Function secrets:"
echo "      - CLOUDFLARE_R2_ACCOUNT_ID"
echo "      - CLOUDFLARE_R2_ACCESS_KEY_ID"
echo "      - CLOUDFLARE_R2_SECRET_ACCESS_KEY"
echo "      - CLOUDFLARE_R2_BUCKET_NAME"
echo ""
echo "   2. Test the function:"
echo "      curl https://your-project.supabase.co/functions/v1/tile-proxy/test-course/tiles/14/4823/6209.png"
echo ""
echo "   3. Use in your React component:"
echo "      <MapboxGolfCourseMap golfClubId=\"...\" mapboxAccessToken=\"...\" />"
echo ""

