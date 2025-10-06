#!/bin/bash

# Supabase Edge Functions Deployment Script
# This script deploys the edge functions to Supabase

echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Please login to Supabase first:"
    echo "supabase login"
    exit 1
fi

# Deploy process-image function
echo "📦 Deploying process-image function..."
supabase functions deploy process-image

if [ $? -eq 0 ]; then
    echo "✅ process-image function deployed successfully"
else
    echo "❌ Failed to deploy process-image function"
    exit 1
fi

# Deploy analyze-image function
echo "📦 Deploying analyze-image function..."
supabase functions deploy analyze-image

if [ $? -eq 0 ]; then
    echo "✅ analyze-image function deployed successfully"
else
    echo "❌ Failed to deploy analyze-image function"
    exit 1
fi

# Deploy r2-upload function
# r2-upload function removed: project uses Supabase Storage only (raw-images bucket)

echo "🎉 All functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up database triggers in your Supabase dashboard"
echo "2. Configure storage buckets (raw-images, processed-images)"
echo "3. Set up RLS policies"
echo "4. Configure R2 environment variables (optional):"
echo "   - CLOUDFLARE_R2_ACCOUNT_ID"
echo "   - CLOUDFLARE_R2_ACCESS_KEY_ID"
echo "   - CLOUDFLARE_R2_SECRET_ACCESS_KEY"
echo "   - CLOUDFLARE_R2_BUCKET_NAME"
echo "5. Test the functions with sample data"
