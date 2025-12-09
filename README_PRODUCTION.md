# Phyto_Dev - Golf Course Health Monitoring System

A full-stack web application for monitoring and analyzing golf course health using satellite imagery, raster tiles, and vector layers.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  - Mapbox GL JS for interactive maps                        │
│  - Layer comparison & swipe functionality                   │
│  - Admin dashboard for uploads & user management            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (Backend + Database)                  │
│  - PostgreSQL database with RLS                             │
│  - Edge Functions (Deno) for secure operations              │
│  - Authentication & authorization                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare R2 Storage                      │
│  - PNG tile storage (map layers)                            │
│  - Vector layer storage (GeoJSON)                           │
│  - Health map storage (analysis results)                    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Features

### For Clients
- **Interactive Maps**: View golf course satellite imagery with multiple date/time layers
- **Layer Comparison**: Side-by-side comparison with swipe functionality
- **Health Maps**: Overlay AI-generated health analysis maps
- **Vector Layers**: View boundaries, water features, vegetation zones
- **Multi-Course Access**: Switch between assigned golf courses

### For Admins
- **Tile Upload**: Upload PNG tiles with date/time organization
- **Vector Layer Upload**: Upload GeoJSON vector layers
- **Health Map Upload**: Upload AI analysis results
- **User Management**: Create users, assign courses, manage roles
- **Course Management**: Add golf courses, manage metadata

## 📁 Project Structure

```
Phyto_Dev/
├── frontend/               # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities & services
│   │   └── hooks/         # Custom React hooks
│   └── package.json
├── backend/
│   ├── supabase/
│   │   └── functions/     # Edge functions
│   └── workers/           # Cloudflare workers
├── database/
│   ├── supabase-schema.sql
│   ├── migrations/        # SQL migrations
│   └── seeds/             # Seed data
├── docs/                  # Documentation
└── scripts/               # Deployment scripts
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Mapbox GL JS** - Interactive maps
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components
- **Supabase JS** - Backend client

### Backend
- **Supabase** - Backend platform
  - PostgreSQL database
  - Edge Functions (Deno)
  - Authentication
  - Row Level Security (RLS)
- **Cloudflare R2** - Object storage
- **Cloudflare Workers** - Tile upload processing

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase CLI (`npm install -g supabase`)
- Cloudflare account (for R2 storage)
- Mapbox account (for map tiles)

## 🔧 Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/Phyto_Dev.git
cd Phyto_Dev
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Environment Variables

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
VITE_TILE_WORKER_URL=your_worker_url
```

Create `backend/supabase/functions/.env`:
```env
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_REGION=auto
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Database Setup
```bash
# Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
npx supabase db push

# Or import schema
psql -h YOUR_DB_HOST -U postgres -d postgres -f database/supabase-schema.sql
```

### 5. Deploy Edge Functions
```bash
npx supabase functions deploy tile-proxy
npx supabase functions deploy r2-sign
npx supabase functions deploy upload-vector-layer
npx supabase functions deploy delete-user
npx supabase functions deploy get-vector-layers
```

### 6. Set Supabase Secrets
```bash
npx supabase secrets set CLOUDFLARE_R2_ACCOUNT_ID=xxx
npx supabase secrets set CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
npx supabase secrets set CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
npx supabase secrets set CLOUDFLARE_R2_BUCKET_NAME=xxx
```

### 7. Run Development Server
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

## 🚀 Production Deployment

### Frontend (Vercel/Netlify)
1. Connect GitHub repo
2. Set build command: `cd frontend && npm run build`
3. Set output directory: `frontend/dist`
4. Add environment variables in dashboard

### Backend
- Edge functions auto-deploy via Supabase CLI
- Set production secrets via `npx supabase secrets set`

## 🔐 Security

- All sensitive keys stored in Supabase Secrets (server-side)
- Row Level Security (RLS) enabled on all tables
- JWT-based authentication
- Admin-only operations verified server-side
- CORS configured for edge functions

## 📖 Documentation

- [Architecture Overview](docs/architecture/COMPLETE_SYSTEM_OVERVIEW.md)
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
- [Admin Setup](docs/guides/ADMIN_COMPLETE_SETUP.md)
- [Testing Guide](docs/guides/COMPLETE_TESTING_GUIDE.md)

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📝 License

[Your License Here]

## 👥 Team

[Your Team Info]

---

**Built with ❤️ for golf course health monitoring**
