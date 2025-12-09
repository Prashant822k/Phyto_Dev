@echo off
echo ========================================
echo Cleaning Up Duplicate Documentation
echo ========================================

REM Create archive folder
if not exist "docs\archive" mkdir docs\archive

REM Delete duplicate/outdated docs
echo Deleting duplicate emergency fixes...
del /q docs\fixes\EMERGENCY_FIX.md 2>nul
del /q docs\fixes\FOUND_THE_ISSUE.md 2>nul

echo Deleting duplicate testing guides...
del /q docs\guides\QUICK_TEST_GUIDE.md 2>nul
del /q docs\guides\TEST_NOW.md 2>nul
del /q docs\guides\DEBUG_AUTH_TEST.md 2>nul
del /q docs\guides\DEBUG_TILE_DISPLAY.md 2>nul

echo Deleting duplicate setup guides...
del /q docs\guides\QUICK_START.md 2>nul
del /q docs\guides\START_HERE.md 2>nul
del /q docs\guides\SETUP_CHECKLIST.md 2>nul
del /q docs\guides\SETUP_COMPLETE.md 2>nul

echo Deleting duplicate deployment guides...
del /q docs\deployment\DEPLOYMENT_STEPS.md 2>nul
del /q docs\deployment\DEPLOYMENT_SUMMARY.md 2>nul
del /q docs\deployment\QUICK_DEPLOY_STEPS.md 2>nul

echo Deleting duplicate fix documentation...
del /q docs\fixes\FIXES_APPLIED.md 2>nul
del /q docs\fixes\FINAL_FIXES_SUMMARY.md 2>nul
del /q docs\fixes\FIX_THREE_ISSUES.md 2>nul

echo Deleting duplicate implementation docs...
del /q docs\guides\IMPLEMENTATION_COMPLETE.md 2>nul
del /q docs\guides\IMPLEMENTATION_SUMMARY.md 2>nul
del /q docs\guides\FINAL_IMPLEMENTATION_SUMMARY.md 2>nul
del /q docs\guides\FINAL_SETUP_SUMMARY.md 2>nul

echo Deleting duplicate upload guides...
del /q docs\guides\QUICK_UPLOAD_REFERENCE.md 2>nul
del /q docs\guides\TILE_UPLOAD_QUICK_START.md 2>nul
del /q docs\guides\QUICK_TILE_SETUP.md 2>nul

echo Deleting duplicate UI guides...
del /q docs\guides\QUICK_UI_GUIDE.md 2>nul
del /q docs\guides\UI_IMPROVEMENTS_SUMMARY.md 2>nul

echo Deleting duplicate admin guides...
del /q docs\guides\ADMIN_SETUP_SUMMARY.md 2>nul
del /q docs\guides\ADMIN_UI_UPDATE.md 2>nul

echo Deleting obsolete docs...
del /q docs\guides\CHANGES_SUMMARY.md 2>nul
del /q docs\guides\FILEUPLOAD_REPLACEMENT_SUMMARY.md 2>nul
del /q docs\guides\DELETE_FIX_AND_REORG.md 2>nul
del /q docs\guides\MANAGE_USERS_REORGANIZATION.md 2>nul
del /q docs\guides\DASHBOARD_REORGANIZATION.md 2>nul
del /q docs\guides\DASHBOARD_LAYOUT_UPDATE.md 2>nul

echo Deleting duplicate Cloudflare docs...
del /q docs\deployment\CLOUDFLARE_QUICK_START.md 2>nul
del /q docs\deployment\CLOUDFLARE_SETUP.md 2>nul
del /q docs\deployment\CLOUDFLARE_SUMMARY.md 2>nul

echo Deleting duplicate README files...
del /q docs\guides\README_CLOUDFLARE_UPLOAD.md 2>nul
del /q docs\guides\README_MAPBOX.md 2>nul
del /q docs\guides\README_TILES_SETUP.md 2>nul

REM Move test-specific docs to archive
echo Moving test-specific docs to archive...
move docs\guides\TEST21_TROUBLESHOOTING.md docs\archive\ 2>nul
move docs\guides\TEST_LAYER_SETUP.md docs\archive\ 2>nul
move docs\guides\TEST_TILE_URL.md docs\archive\ 2>nul

echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo Kept important docs:
echo   - README.md (root)
echo   - docs/architecture/ARCHITECTURE_DIAGRAM.md
echo   - docs/architecture/COMPLETE_SYSTEM_OVERVIEW.md
echo   - docs/deployment/DEPLOYMENT_GUIDE.md
echo   - docs/guides/ADMIN_COMPLETE_SETUP.md
echo   - docs/guides/COMPLETE_TESTING_GUIDE.md
echo   - docs/guides/MAPBOX_SETUP_GUIDE.md
echo   - docs/guides/SECURITY_SETUP_COMPLETE.md
echo.
pause
