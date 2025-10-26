@echo off
echo ========================================
echo Deploying Tile Upload Worker
echo ========================================
echo.

cd workers\tile-upload

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/3] Logging into Cloudflare...
call npx wrangler login
if errorlevel 1 (
    echo ERROR: Cloudflare login failed
    pause
    exit /b 1
)

echo.
echo [3/3] Deploying worker...
call npx wrangler deploy
if errorlevel 1 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Tile Worker deployed
echo ========================================
echo.
echo Next steps:
echo 1. Copy the worker URL from above
echo 2. Add to .env: VITE_TILE_WORKER_URL=https://your-worker-url.workers.dev
echo 3. Install jszip: npm install jszip
echo 4. Restart your dev server
echo 5. Visit: http://localhost:5173/tile-upload
echo.
pause
