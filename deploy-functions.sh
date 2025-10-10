#!/bin/bash

# Deploy Supabase Edge Functions
# Make sure you have the Supabase CLI installed and are logged in

echo "Deploying Supabase Edge Functions..."

# Deploy upload-init function
echo "Deploying upload-init function..."
supabase functions deploy upload-init

# Deploy upload-complete function  
echo "Deploying upload-complete function..."
supabase functions deploy upload-complete

# Deploy signed-url function
echo "Deploying signed-url function..."
supabase functions deploy signed-url

echo "All Edge Functions deployed successfully!"
echo ""
echo "Functions available at:"
echo "- https://your-project.supabase.co/functions/v1/upload-init"
echo "- https://your-project.supabase.co/functions/v1/upload-complete" 
echo "- https://your-project.supabase.co/functions/v1/signed-url"
echo ""
echo "Make sure to update your frontend API calls to use the correct function URLs."