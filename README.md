# Phyto Golf Course Health Monitoring System

A full-stack web application for monitoring and analyzing golf course health using satellite imagery, raster tiles, vector layers, and AI-powered terrain segmentation.

## Overview

**What it does:** Enables golf course managers to visualize and analyze course health through interactive maps showing satellite imagery across different time periods, AI-generated health maps, and terrain segmentation overlays.

**Problem it solves:** Provides a centralized platform for golf course operators to:
- Monitor course conditions over time with multi-date layer comparisons
- Analyze terrain features (fairways, greens, bunkers, water hazards) using AI segmentation
- Upload and organize satellite imagery by date/time for historical tracking
- Share course data with clients through a secure, role-based access system

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Mapbox GL JS** - Interactive mapping
- **TailwindCSS** - Styling
- **shadcn/ui** - UI component library
- **React Router** - Routing

### Backend
- **Supabase**
  - PostgreSQL database with Row Level Security (RLS)
  - Edge Functions (Deno runtime) for secure serverless operations
  - Authentication & authorization
  - Real-time subscriptions

### Storage & Infrastructure
- **Cloudflare R2** - Object storage for tiles, vector layers, and predictions
- **Cloudflare Workers** - Edge functions for tile uploads and large file handling
- **Hugging Face Spaces** - Hosted ML model for golf course terrain segmentation

## Project Structure

```
Phyto_Dev/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities & services
│   │   └── hooks/         # Custom React hooks
│   └── package.json
├── supabase/
│   └── functions/         # Supabase Edge Functions
│       ├── r2-sign/       # R2 signed URL generation
│       ├── tile-proxy/    # Tile access proxy
│       ├── model-inference/ # ML inference coordination
│       └── ...
├── workers/               # Cloudflare Workers
│   ├── tile-upload/       # Tile upload handler
│   └── large-upload/      # Large file upload handler
├── database/
│   ├── migrations/        # SQL migrations
│   └── seeds/             # Seed data
├── scripts/               # Utility scripts
├── huggingface-space/     # ML model deployment files
└── docs/                  # Documentation
```

## Setup Instructions

### Prerequisites

- **Node.js 18+** and npm
- **Supabase CLI** (`npm install -g supabase`)
- **Supabase account** (project will be transferred, not created new)
- **Cloudflare account** (for R2 storage and Workers)
- **Mapbox account** (for map tiles)
- **Hugging Face account** (for ML model access)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd Phyto_Dev
```

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 3: Environment Variables

Create `frontend/.env` file:

```env
# Supabase Configuration (provided by project owner)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Mapbox Configuration
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiY...your-mapbox-token-here

# Cloudflare Workers (deployed separately)
VITE_WORKER_URL=https://phyto-large-upload.YOUR_SUBDOMAIN.workers.dev
VITE_TILE_WORKER_URL=https://map-tiles-upload.YOUR_SUBDOMAIN.workers.dev

# Hugging Face Space URL (optional, has default)
VITE_HF_SPACE_URL=https://prashant822k-phyto-golf-segmentation.hf.space
```

### Step 4: Supabase Setup (Project Handover)

**Important:** The Supabase project already exists and will be transferred to you. You do NOT need to create a new Supabase project.

#### 4a. Accept Supabase Access

1. The original project owner will transfer access via Supabase dashboard:
   - Go to Project Settings → Team
   - Accept the invitation to join the project
   - Or use the transferred account credentials

2. Access your Supabase dashboard: https://supabase.com/dashboard

#### 4b. Retrieve Required Keys

From your Supabase project dashboard:

1. **Project URL & Anon Key:**
   - Go to Settings → API
   - Copy `Project URL` → `VITE_SUPABASE_URL`
   - Copy `anon public` key → `VITE_SUPABASE_ANON_KEY`

2. **Service Role Key (for Edge Functions):**
   - Go to Settings → API
   - Copy `service_role secret` key (keep this secure!)
   - Used for Edge Function secrets (see Step 6)

#### 4c. Verify Database & Storage

- **Database:** Should already be set up with migrations applied
- **Storage:** Buckets should already exist (tiles, vector-layers, health-maps)
- **Auth:** Authentication system should be configured

### Step 5: Mapbox Setup

1. Create a Mapbox account: https://account.mapbox.com/
2. Navigate to Account → Access tokens
3. Copy your default public token (starts with `pk.eyJ1...`)
4. Add to `frontend/.env` as `VITE_MAPBOX_ACCESS_TOKEN`

### Step 6: Cloudflare Setup

#### 6a. R2 Storage

1. Log in to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Go to R2 → Create bucket
3. Create buckets:
   - `phyto-tiles` (or your configured bucket name)
   - `phyto-vector-layers`
   - `phyto-health-maps`
4. Get R2 credentials:
   - Go to R2 → Manage R2 API Tokens
   - Create API token with Read & Write permissions
   - Copy: `Account ID`, `Access Key ID`, `Secret Access Key`

#### 6b. Supabase Edge Functions Environment Setup

Edge Functions require environment variables for both local development and production.

**For Local Development:**

Create `supabase/functions/.env` file (for local testing):

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=phyto-tiles
CLOUDFLARE_R2_PUBLIC_DOMAIN=your_r2_public_domain.r2.dev

# Hugging Face (optional - has default)
HF_SPACE_URL=https://prashant822k-phyto-golf-segmentation.hf.space
```

**For Production Deployment:**

Set secrets in Supabase (for deployed Edge Functions):

```bash
# From project root
npx supabase secrets set SUPABASE_URL=https://your-project.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npx supabase secrets set SUPABASE_ANON_KEY=your_anon_key
npx supabase secrets set CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
npx supabase secrets set CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id
npx supabase secrets set CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
npx supabase secrets set CLOUDFLARE_R2_BUCKET_NAME=phyto-tiles
npx supabase secrets set CLOUDFLARE_R2_PUBLIC_DOMAIN=your_r2_public_domain.r2.dev
npx supabase secrets set HF_SPACE_URL=https://prashant822k-phyto-golf-segmentation.hf.space
```

**Reference:** See `config/backend-env.example` for a complete template.

**Note:** The local `supabase/functions/.env` file is for development only (already in `.gitignore`). Production Edge Functions use secrets set via `supabase secrets set`.

#### 6c. Deploy Cloudflare Workers (Optional)

If Workers are not already deployed, deploy them:

```bash
# Tile upload worker
cd workers/tile-upload
npm install
npx wrangler login
npx wrangler deploy

# Large file upload worker
cd ../large-upload
npm install
npx wrangler deploy
```

Update `frontend/.env` with the deployed Worker URLs.

### Step 7: Hugging Face Setup

The ML model for terrain segmentation is hosted on Hugging Face Spaces.

1. **Create Hugging Face account** (if needed): https://huggingface.co/join

2. **Access the Space:**
   - The model is deployed at: `https://prashant822k-phyto-golf-segmentation.hf.space`
   - Verify it's accessible and running (should respond to `/health` endpoint)

3. **Optional - Update Space URL:**
   - If you need to use a different Space URL, add `VITE_HF_SPACE_URL` to `frontend/.env`
   - Default is already configured in code

4. **No API token required** - The Space is publicly accessible for inference

**Note:** If you need to deploy your own model Space, see `huggingface-space/README.md` for instructions.

### Step 8: Deploy Supabase Edge Functions

From the project root:

```bash
# Link to your Supabase project (if not already linked)
npx supabase link --project-ref your-project-ref

# Ensure production secrets are set (see Step 6b)
npx supabase secrets list

# Deploy all Edge Functions
npx supabase functions deploy r2-sign
npx supabase functions deploy tile-proxy
npx supabase functions deploy model-inference
npx supabase functions deploy upload-vector-layer
npx supabase functions deploy get-vector-layers
npx supabase functions deploy delete-user
npx supabase functions deploy manage-client-courses
```

**Note:** For local Edge Function development, ensure `supabase/functions/.env` exists (see Step 6b). For production deployment, ensure secrets are set via `supabase secrets set`.

### Step 9: Start Development Server

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

## Production Build

```bash
cd frontend
npm run build
```

Build output is in `frontend/dist/` - deploy this to your hosting provider (Vercel, Netlify, etc.).

## Key Features

### For Clients
- Interactive maps with satellite imagery layers
- Layer comparison with swipe functionality
- Health map overlays (AI analysis results)
- Vector layer visualization (boundaries, features)
- Multi-course access (switch between assigned courses)

### For Admins
- PNG tile upload with date/time organization
- Vector layer upload (GeoJSON)
- Health map upload (AI analysis results)
- User management (create users, assign courses, manage roles)
- Golf course management (add courses, manage metadata)

## Architecture Overview

```
Frontend (React)
    ↓
Supabase Edge Functions (Authentication, R2 URL signing, Data queries)
    ↓
Cloudflare R2 (Tile & Vector Storage)
    ↓
Cloudflare Workers (Tile upload handling, Large file uploads)
    ↓
Hugging Face Spaces (ML Model Inference for terrain segmentation)
```

## Security

- Row Level Security (RLS) enabled on all database tables
- JWT-based authentication via Supabase Auth
- Service role keys stored securely in Supabase Secrets
- All sensitive operations handled server-side via Edge Functions
- CORS configured appropriately for all endpoints

## Additional Documentation

- `docs/architecture/` - System architecture details
- `docs/deployment/` - Deployment guides
- `docs/guides/` - Feature-specific guides
- `workers/large-upload/README.md` - Cloudflare Worker documentation
- `scripts/README.md` - Utility scripts documentation
- `huggingface-space/README.md` - ML model documentation

## Support

For issues or questions, refer to the documentation in the `docs/` directory or contact the development team.
