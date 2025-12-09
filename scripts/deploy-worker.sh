#!/bin/bash

echo "========================================"
echo "Deploying Cloudflare Worker for Large File Uploads"
echo "========================================"
echo ""

cd workers/large-upload || exit 1

echo "[1/3] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed"
    exit 1
fi

echo ""
echo "[2/3] Logging into Cloudflare..."
npx wrangler login
if [ $? -ne 0 ]; then
    echo "ERROR: Cloudflare login failed"
    exit 1
fi

echo ""
echo "[3/3] Deploying worker..."
npx wrangler deploy
if [ $? -ne 0 ]; then
    echo "ERROR: Deployment failed"
    exit 1
fi

echo ""
echo "========================================"
echo "SUCCESS! Worker deployed"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Copy the worker URL from above"
echo "2. Add to .env: VITE_WORKER_URL=https://your-worker-url.workers.dev"
echo "3. Restart your dev server"
echo ""
