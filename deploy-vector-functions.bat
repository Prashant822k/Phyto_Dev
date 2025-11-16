@echo off
echo ========================================
echo Deploying Vector Layer Edge Functions
echo ========================================
echo.

echo [1/2] Deploying upload-vector-layer function...
call supabase functions deploy upload-vector-layer --no-verify-jwt
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy upload-vector-layer
    exit /b 1
)
echo ✓ upload-vector-layer deployed successfully
echo.

echo [2/2] Deploying get-vector-layers function...
call supabase functions deploy get-vector-layers --no-verify-jwt
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy get-vector-layers
    exit /b 1
)
echo ✓ get-vector-layers deployed successfully
echo.

echo ========================================
echo All functions deployed successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Test the upload function in your admin panel
echo 2. Verify files appear in R2 bucket: map-stats-tiles-prod/vector-layers/
echo 3. Check database records in vector_layers table
echo.
pause
