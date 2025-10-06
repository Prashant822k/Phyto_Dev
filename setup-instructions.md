# PNG Tile Analysis System Setup Instructions

This guide will help you set up the complete PNG tile analysis system with Supabase, R2 storage, and Edge Functions.

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase CLI (`npm install -g supabase`)
- Supabase account and project
- Cloudflare account (for R2 storage)

## Step 1: Database Setup

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### 1.2 Run Database Schema
1. In your Supabase dashboard, go to the SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Execute the SQL to create all tables, policies, and functions

### 1.3 Create Storage Buckets
1. Go to Storage in your Supabase dashboard
2. Create two buckets:
   - `raw-images` (for uploaded PNG tiles)
   - `processed-images` (for processed results)
3. Set appropriate policies for each bucket

## Step 2: Environment Configuration

### 2.1 Create Environment File
```bash
cp env.example .env
```

### 2.2 Update Environment Variables
Edit `.env` with your actual values:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Deploy Edge Functions

### 4.1 Login to Supabase CLI
```bash
supabase login
```

### 4.2 Link to Your Project
```bash
supabase link --project-ref your-project-ref
```

### 4.3 Deploy Functions
```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

## Step 5: Configure Database Triggers

### 5.1 Set up Webhook Triggers
In your Supabase dashboard, go to Database > Webhooks and create:

1. **Image Upload Trigger**
   - Table: `images`
   - Events: `INSERT`
   - Type: `HTTP Request`
   - URL: `https://your-project-ref.supabase.co/functions/v1/process-image`
   - Headers: `Authorization: Bearer your-service-role-key`

2. **Processing Job Trigger**
   - Table: `processing_jobs`
   - Events: `INSERT`
   - Type: `HTTP Request`
   - URL: `https://your-project-ref.supabase.co/functions/v1/analyze-image`
   - Headers: `Authorization: Bearer your-service-role-key`

## Step 6: Supabase Storage Setup

The application uses Supabase Storage for file uploads. Follow the detailed guide in `SUPABASE_STORAGE_SETUP.md` to:

1. Create the required storage buckets (`raw-images` and optionally `processed-images`)
2. Set up proper storage policies for user access control
3. Test the storage configuration

### Quick Setup:
1. Go to your Supabase Dashboard > Storage
2. Create bucket named `raw-images` (public access)
3. Set up storage policies as described in `SUPABASE_STORAGE_SETUP.md`

## Step 7: Test the System

### 7.1 Start Development Server
```bash
npm run dev
```

### 7.2 Test PNG Tile Upload
1. Open the application in your browser
2. Navigate to the dashboard
3. Upload a PNG tile with optional geographic metadata
4. Verify the upload appears in Supabase Storage
5. Check that processing begins automatically

### 7.3 Verify Database Updates
1. Check the `images` table for your uploaded tile
2. Verify `processing_jobs` table has a new entry
3. Monitor the processing status updates

## Step 8: Production Deployment

### 8.1 Build for Production
```bash
npm run build
```

### 8.2 Deploy Frontend
Deploy the built files to your preferred hosting platform:
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

### 8.3 Configure Production Environment
Update your production environment variables with production Supabase credentials.

## API Endpoints

### Edge Functions
- `POST /functions/v1/process-image` - Processes uploaded images
- `POST /functions/v1/analyze-image` - Performs detailed image analysis

### Database Tables
- `users` - User profiles
- `images` - PNG tile metadata and processing status
- `processing_jobs` - Background processing tasks
- `analysis_sessions` - Grouped analysis sessions
- `session_images` - Images within sessions

## Troubleshooting

### Common Issues

1. **Upload Fails**
   - Check Supabase Storage bucket policies
   - Verify environment variables
   - Check file size limits (50MB max)

2. **Processing Doesn't Start**
   - Verify webhook triggers are set up
   - Check Edge Function logs in Supabase dashboard
   - Ensure service role key is correct

3. **Real-time Updates Not Working**
   - Check RLS policies
   - Verify user authentication
   - Check network connectivity

### Debugging Steps

1. Check Supabase Function logs:
   ```bash
   supabase functions logs process-image
   supabase functions logs analyze-image
   ```

2. Monitor database changes in Supabase dashboard

3. Check browser console for client-side errors

## Security Considerations

1. **Row Level Security (RLS)** is enabled on all tables
2. **Storage policies** restrict access to user's own files
3. **Service role key** should be kept secure
4. **Environment variables** should not be committed to version control

## Performance Optimization

1. **Image Compression**: Consider compressing PNG tiles before upload
2. **Batch Processing**: For multiple tiles, implement batch upload
3. **Caching**: Implement client-side caching for processed results
4. **CDN**: Use Supabase's built-in CDN for faster image delivery

## Monitoring and Analytics

1. **Supabase Dashboard**: Monitor function executions and errors
2. **Database Metrics**: Track upload and processing volumes
3. **Custom Analytics**: Implement custom tracking for user interactions

## Support

For issues or questions:
1. Check Supabase documentation
2. Review Edge Function logs
3. Test with smaller files first
4. Verify all environment variables are set correctly
