# Phyto Dev Deployment Guide

This guide outlines the deployment options for the Phyto Dev application.

## Prerequisites

- Node.js 18+ for development
- Supabase account for backend services
- Docker (optional, for containerized deployment)

## Deployment Options

### 1. Docker Deployment

The application includes a Dockerfile for containerized deployment:

```bash
# Build the Docker image
docker build -t phyto-dev .

# Run the container
docker run -p 80:80 phyto-dev
```

### 2. Static Hosting (Vercel, Netlify, etc.)

The application can be deployed to any static hosting service:

```bash
# Build the application
npm run build

# Deploy the 'dist' folder to your hosting provider
```

#### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

#### Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy
```

### 3. Manual Deployment

```bash
# Build the application
npm run build

# Copy the contents of the 'dist' folder to your web server
```

## Environment Configuration

Ensure the following environment variables are set in your deployment environment:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Backend Services

The application requires the following backend services:

1. **Supabase Database**: For storing user data, tile information, and club associations
2. **Supabase Storage**: For storing tile images
3. **Supabase Authentication**: For user authentication and authorization

## Post-Deployment Verification

After deployment, verify the following:

1. User authentication works correctly
2. Admin users can upload and manage tiles
3. Client users can view and interact with the map visualization
4. Tile layers are displayed correctly on the map

## Troubleshooting

If you encounter issues after deployment:

1. Check browser console for JavaScript errors
2. Verify environment variables are correctly set
3. Ensure Supabase services are accessible from your deployment environment
4. Check network requests for API errors