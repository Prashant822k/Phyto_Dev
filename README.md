# PNG Tile Analysis System

A modern React application for uploading and analyzing PNG tiles from tiled TIFF images using Supabase, Cloudflare R2 storage, and Edge Functions for agricultural analysis.

## 🌟 Features

- **PNG Tile Upload**: Strictly accepts PNG files from tiled TIFF images
- **Geographic Metadata**: Optional latitude, longitude, zoom level, and tile coordinates
- **Real-time Processing**: Automatic processing with live status updates
- **Supabase Integration**: Database, storage, and authentication
- **Edge Functions**: Serverless image processing and analysis
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Real-time Updates**: Live processing status and results

## 🏗️ Architecture

```
Frontend (React) → Supabase Storage → Database → Edge Functions → ML Processing
                ↓
            Real-time Updates ← Database Triggers
```

### Components

- **Frontend**: React app with TypeScript and Tailwind CSS
- **Database**: Supabase PostgreSQL with PostGIS extension
- **Storage**: Supabase Storage (with R2 backend support)
- **Processing**: Supabase Edge Functions (Deno)
- **Authentication**: Supabase Auth with RLS policies

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase CLI
- Supabase account

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd map-stats-sandbox-main
   npm install
   ```

2. **Set up Supabase**:
   ```bash
   cp env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Set up database**:
   - Create a new Supabase project
   - Run the SQL from `supabase-schema.sql` in your Supabase dashboard

4. **Deploy Edge Functions**:
   ```bash
   chmod +x deploy-functions.sh
   ./deploy-functions.sh
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── FileUpload.tsx          # PNG tile upload with metadata
│   │   ├── InteractiveMap.tsx      # Map display with analysis
│   │   └── ui/                     # Shadcn/ui components
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client & types
│   │   ├── imageService.ts        # Image upload & processing logic
│   │   └── utils.ts               # Utility functions
│   └── pages/
│       ├── Dashboard.tsx          # Main dashboard
│       └── Index.tsx              # Landing page
├── supabase/
│   └── functions/
│       ├── process-image/         # Image processing Edge Function
│       └── analyze-image/         # ML analysis Edge Function
├── supabase-schema.sql            # Complete database schema
├── deploy-functions.sh            # Deployment script
└── setup-instructions.md          # Detailed setup guide
```

## 🗄️ Database Schema

### Core Tables

- **`users`**: Extended user profiles
- **`images`**: PNG tile metadata and processing status
- **`processing_jobs`**: Background processing tasks
- **`analysis_sessions`**: Grouped analysis sessions
- **`session_images`**: Many-to-many relationship

### Key Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Geographic Support**: PostGIS extension for spatial queries
- **Real-time Triggers**: Automatic processing on upload
- **Audit Trail**: Created/updated timestamps on all tables

## 🔧 API Reference

### Image Service

```typescript
// Upload a PNG tile
const result = await ImageService.uploadTile(file, {
  lat: 12.9716,
  lon: 77.5946,
  zoomLevel: 15,
  tileX: 12345,
  tileY: 67890
});

// Get user's images
const images = await ImageService.getUserImages();

// Get processing status
const status = await ImageService.getProcessingStatus(imageId);
```

### Edge Functions

- **`process-image`**: Handles new image uploads and triggers processing
- **`analyze-image`**: Performs detailed image analysis (NDVI, vegetation health, terrain)

## 🔒 Security

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row Level Security (RLS) on all tables
- **Storage Policies**: Users can only access their own files
- **Input Validation**: File type and size restrictions
- **Environment Variables**: Secure configuration management

## 📊 Processing Pipeline

1. **Upload**: User uploads PNG tile with optional metadata
2. **Storage**: File stored in Supabase Storage bucket
3. **Database**: Metadata saved to `images` table
4. **Trigger**: Database trigger creates processing job
5. **Processing**: Edge Function processes the image
6. **Results**: Analysis results saved to database
7. **Real-time**: Frontend receives live updates

## 🎨 UI Components

### FileUpload Component
- Drag & drop PNG file upload
- Geographic metadata input fields
- Real-time upload progress
- File validation and error handling

### InteractiveMap Component
- Displays uploaded PNG tiles
- Real-time processing status
- Interactive zoom and pan controls
- Analysis results visualization

## 🔄 Real-time Features

- **Processing Status**: Live updates during image processing
- **Database Changes**: Real-time subscriptions to table changes
- **Job Progress**: Monitoring of background processing jobs
- **Error Handling**: Immediate feedback on failures

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Edge Functions
```bash
./deploy-functions.sh
```

## 📈 Monitoring

- **Supabase Dashboard**: Function logs and database metrics
- **Real-time Analytics**: User interactions and processing times
- **Error Tracking**: Comprehensive error logging and handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For detailed setup instructions, see [setup-instructions.md](./setup-instructions.md).

For issues or questions:
1. Check the troubleshooting section in setup instructions
2. Review Supabase function logs
3. Verify environment variables
4. Test with smaller files first

## 🔮 Future Enhancements

- **Batch Processing**: Upload multiple tiles simultaneously
- **Advanced Analytics**: More sophisticated ML models
- **Export Features**: Download processed results
- **Collaboration**: Share analysis sessions
- **Mobile Support**: Responsive mobile interface
- **Offline Mode**: Cache for offline viewing
