# Cloudflare R2 Storage Setup Guide

This guide will help you set up Cloudflare R2 storage for the PhytoMaps application.

## Prerequisites

- Cloudflare account with R2 enabled
- Access to Cloudflare dashboard
- R2 API credentials

## Step 1: Create R2 Bucket

1. Log in to your Cloudflare dashboard
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
4. Enter bucket name: `phytomaps-tiles`
5. Choose your preferred location
6. Click **Create bucket**

## Step 2: Generate API Credentials

1. In the R2 dashboard, go to **Manage R2 API tokens**
2. Click **Create API token**
3. Set the following permissions:
   - **Account**: `Cloudflare R2:Edit`
   - **Zone Resources**: Include all zones
4. Click **Continue to summary**
5. Copy the **Access Key ID** and **Secret Access Key**

## Step 3: Configure Environment Variables

Update your `.env` file with the R2 credentials:

```env
# Cloudflare R2 Configuration
VITE_R2_ACCOUNT_ID=your_account_id_here
VITE_R2_ACCESS_KEY_ID=your_access_key_id_here
VITE_R2_SECRET_ACCESS_KEY=your_secret_access_key_here
VITE_R2_BUCKET_NAME=phytomaps-tiles
VITE_R2_PUBLIC_URL=https://your-bucket.your-account.r2.cloudflarestorage.com
```

## Step 4: Set Up CORS (Optional)

If you need to access R2 files directly from the browser:

1. Go to your R2 bucket settings
2. Navigate to **CORS policy**
3. Add the following CORS rule:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Step 5: Configure Public Access (Optional)

To make files publicly accessible:

1. Go to your R2 bucket settings
2. Navigate to **Settings** > **Public access**
3. Enable **Allow Access** if needed
4. Configure custom domain if desired

## Step 6: Test R2 Integration

1. Start your development server: `npm run dev`
2. Open the application in your browser
3. Go to the upload section
4. Toggle **R2 + Supabase** storage option
5. Upload a test PNG file
6. Check the browser console for R2 upload logs

## Troubleshooting

### Common Issues

1. **"R2 configuration missing" error**
   - Check that all R2 environment variables are set
   - Verify the credentials are correct

2. **Upload fails to R2**
   - Check bucket permissions
   - Verify the bucket name matches `VITE_R2_BUCKET_NAME`
   - Ensure the account ID is correct

3. **Files not accessible**
   - Check CORS configuration
   - Verify public access settings
   - Check the public URL format

### Debug Steps

1. Check browser console for R2 service logs
2. Verify environment variables are loaded:
   ```javascript
   console.log('R2 Config:', {
     accountId: import.meta.env.VITE_R2_ACCOUNT_ID,
     bucketName: import.meta.env.VITE_R2_BUCKET_NAME
   });
   ```

3. Test R2 service directly:
   ```javascript
   import R2Service from './lib/r2Service';
   console.log('R2 Configured:', R2Service.isConfigured());
   console.log('R2 Status:', R2Service.getConfigStatus());
   ```

## Security Considerations

1. **Never commit R2 credentials to version control**
2. **Use environment variables for all sensitive data**
3. **Rotate API keys regularly**
4. **Use least-privilege access policies**
5. **Monitor R2 usage and costs**

## Cost Optimization

1. **Set up lifecycle policies** to automatically delete old files
2. **Use appropriate storage classes** for different file types
3. **Monitor bandwidth usage** and set up alerts
4. **Consider CDN integration** for frequently accessed files

## Integration with Supabase

The application supports both Supabase Storage and R2:

- **Supabase Only**: Files stored in Supabase Storage
- **R2 + Supabase**: Files stored in both systems for redundancy

Choose based on your requirements:
- **Supabase**: Better integration with database, real-time features
- **R2**: Better performance, lower costs, global CDN

## Support

For issues with R2 integration:
1. Check Cloudflare R2 documentation
2. Verify your account has R2 enabled
3. Contact Cloudflare support for account-specific issues
