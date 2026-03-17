@echo off
setlocal enabledelayedexpansion

cd /d C:\Users\ANURON\smartHire-BE-FE-v2

echo Creating directories with .gitkeep files...
echo.

mkdir ai-recruitment\src\modules\preferences\types 2>nul
type nul > ai-recruitment\src\modules\preferences\types\.gitkeep
echo + ai-recruitment\src\modules\preferences\types

mkdir ai-recruitment\src\modules\preferences\validators 2>nul
type nul > ai-recruitment\src\modules\preferences\validators\.gitkeep
echo + ai-recruitment\src\modules\preferences\validators

mkdir ai-recruitment\src\modules\preferences\services 2>nul
type nul > ai-recruitment\src\modules\preferences\services\.gitkeep
echo + ai-recruitment\src\modules\preferences\services

mkdir ai-recruitment\src\modules\preferences\controllers 2>nul
type nul > ai-recruitment\src\modules\preferences\controllers\.gitkeep
echo + ai-recruitment\src\modules\preferences\controllers

mkdir ai-recruitment\src\app\api\preferences 2>nul
type nul > ai-recruitment\src\app\api\preferences\.gitkeep
echo + ai-recruitment\src\app\api\preferences

mkdir ai-recruitment\src\app\api\salary-insights 2>nul
type nul > ai-recruitment\src\app\api\salary-insights\.gitkeep
echo + ai-recruitment\src\app\api\salary-insights

mkdir ai-recruitment\src\app\api\role-fit 2>nul
type nul > ai-recruitment\src\app\api\role-fit\.gitkeep
echo + ai-recruitment\src\app\api\role-fit

mkdir "ai-recruitment\src\app\(dashboard)\preferences" 2>nul
type nul > "ai-recruitment\src\app\(dashboard)\preferences\.gitkeep"
echo + ai-recruitment\src\app\(dashboard)\preferences

mkdir ai-recruitment\src\components\preferences 2>nul
type nul > ai-recruitment\src\components\preferences\.gitkeep
echo + ai-recruitment\src\components\preferences

echo.
echo ======================================================================
echo VERIFICATION
echo ======================================================================
echo.

setlocal enabledelayedexpansion
set count=0

if exist "ai-recruitment\src\modules\preferences\types\.gitkeep" (
  echo [OK] ai-recruitment\src\modules\preferences\types
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\modules\preferences\types
)

if exist "ai-recruitment\src\modules\preferences\validators\.gitkeep" (
  echo [OK] ai-recruitment\src\modules\preferences\validators
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\modules\preferences\validators
)

if exist "ai-recruitment\src\modules\preferences\services\.gitkeep" (
  echo [OK] ai-recruitment\src\modules\preferences\services
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\modules\preferences\services
)

if exist "ai-recruitment\src\modules\preferences\controllers\.gitkeep" (
  echo [OK] ai-recruitment\src\modules\preferences\controllers
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\modules\preferences\controllers
)

if exist "ai-recruitment\src\app\api\preferences\.gitkeep" (
  echo [OK] ai-recruitment\src\app\api\preferences
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\app\api\preferences
)

if exist "ai-recruitment\src\app\api\salary-insights\.gitkeep" (
  echo [OK] ai-recruitment\src\app\api\salary-insights
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\app\api\salary-insights
)

if exist "ai-recruitment\src\app\api\role-fit\.gitkeep" (
  echo [OK] ai-recruitment\src\app\api\role-fit
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\app\api\role-fit
)

if exist "ai-recruitment\src\app\(dashboard)\preferences\.gitkeep" (
  echo [OK] ai-recruitment\src\app\(dashboard)\preferences
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\app\(dashboard)\preferences
)

if exist "ai-recruitment\src\components\preferences\.gitkeep" (
  echo [OK] ai-recruitment\src\components\preferences
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\components\preferences
)

echo.
echo ======================================================================
echo Result: !count!/9 directories verified successfully
echo ======================================================================
