@echo off
cd /d C:\Users\ANURON\smartHire-BE-FE-v2\ai-recruitment

REM Create preferences module directories
mkdir src\modules\preferences\types 2>nul
mkdir src\modules\preferences\validators 2>nul
mkdir src\modules\preferences\services 2>nul
mkdir src\modules\preferences\controllers 2>nul

REM Create API routes
mkdir src\app\api\preferences 2>nul
mkdir src\app\api\salary-insights 2>nul
mkdir src\app\api\role-fit 2>nul

REM Create dashboard pages
mkdir src\app\(dashboard)\preferences 2>nul

REM Create components
mkdir src\components\preferences 2>nul

REM Create .gitkeep files
type nul > src\modules\preferences\types\.gitkeep
type nul > src\modules\preferences\validators\.gitkeep
type nul > src\modules\preferences\services\.gitkeep
type nul > src\modules\preferences\controllers\.gitkeep
type nul > src\app\api\preferences\.gitkeep
type nul > src\app\api\salary-insights\.gitkeep
type nul > src\app\api\role-fit\.gitkeep
type nul > src\app\(dashboard)\preferences\.gitkeep
type nul > src\components\preferences\.gitkeep

echo.
echo ✓ Created: src\modules\preferences\types\.gitkeep
echo ✓ Created: src\modules\preferences\validators\.gitkeep
echo ✓ Created: src\modules\preferences\services\.gitkeep
echo ✓ Created: src\modules\preferences\controllers\.gitkeep
echo ✓ Created: src\app\api\preferences\.gitkeep
echo ✓ Created: src\app\api\salary-insights\.gitkeep
echo ✓ Created: src\app\api\role-fit\.gitkeep
echo ✓ Created: src\app\(dashboard)\preferences\.gitkeep
echo ✓ Created: src\components\preferences\.gitkeep
echo.
echo All directories and .gitkeep files have been created!
pause
