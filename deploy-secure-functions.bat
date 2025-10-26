@echo off
echo Deploying Supabase Edge Functions with Security Updates...
echo.

echo Deploying r2-sign function...
npx supabase functions deploy r2-sign
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy r2-sign
    exit /b 1
)

echo.
echo Deploying tile-proxy function...
npx supabase functions deploy tile-proxy
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy tile-proxy
    exit /b 1
)

echo.
echo ✅ All functions deployed successfully!
echo.
echo Next steps:
echo 1. Make R2 bucket private in Cloudflare Dashboard
echo 2. Run RLS SQL scripts in Supabase SQL Editor
echo 3. Test with the verification commands in SECURITY_SETUP_COMPLETE.md
echo.
pause
