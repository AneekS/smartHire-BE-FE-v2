@echo off
REM Create directories script
REM This script creates all 9 required directories for the smartHire preferences module

cd /d C:\Users\ANURON\smartHire-BE-FE-v2

echo ======================================================================
echo Creating 9 Preference Module Directories
echo ======================================================================
echo.

REM Create module directories
echo Creating module directories...
mkdir "ai-recruitment\src\modules\preferences\types" 2>nul
mkdir "ai-recruitment\src\modules\preferences\validators" 2>nul
mkdir "ai-recruitment\src\modules\preferences\services" 2>nul
mkdir "ai-recruitment\src\modules\preferences\controllers" 2>nul

REM Create API route directories
echo Creating API route directories...
mkdir "ai-recruitment\src\app\api\preferences" 2>nul
mkdir "ai-recruitment\src\app\api\salary-insights" 2>nul
mkdir "ai-recruitment\src\app\api\role-fit" 2>nul

REM Create dashboard and components directories
echo Creating dashboard and component directories...
mkdir "ai-recruitment\src\app\(dashboard)\preferences" 2>nul
mkdir "ai-recruitment\src\components\preferences" 2>nul

echo.
echo ======================================================================
echo Verifying Directory Creation
echo ======================================================================
echo.

set count=0

if exist "ai-recruitment\src\modules\preferences\types" (
  echo [OK] 1. ai-recruitment\src\modules\preferences\types
  set /a count+=1
) else (
  echo [MISSING] 1. ai-recruitment\src\modules\preferences\types
)

if exist "ai-recruitment\src\modules\preferences\validators" (
  echo [OK] 2. ai-recruitment\src\modules\preferences\validators
  set /a count+=1
) else (
  echo [MISSING] 2. ai-recruitment\src\modules\preferences\validators
)

if exist "ai-recruitment\src\modules\preferences\services" (
  echo [OK] 3. ai-recruitment\src\modules\preferences\services
  set /a count+=1
) else (
  echo [MISSING] 3. ai-recruitment\src\modules\preferences\services
)

if exist "ai-recruitment\src\modules\preferences\controllers" (
  echo [OK] 4. ai-recruitment\src\modules\preferences\controllers
  set /a count+=1
) else (
  echo [MISSING] 4. ai-recruitment\src\modules\preferences\controllers
)

if exist "ai-recruitment\src\app\api\preferences" (
  echo [OK] 5. ai-recruitment\src\app\api\preferences
  set /a count+=1
) else (
  echo [MISSING] 5. ai-recruitment\src\app\api\preferences
)

if exist "ai-recruitment\src\app\api\salary-insights" (
  echo [OK] 6. ai-recruitment\src\app\api\salary-insights
  set /a count+=1
) else (
  echo [MISSING] 6. ai-recruitment\src\app\api\salary-insights
)

if exist "ai-recruitment\src\app\api\role-fit" (
  echo [OK] 7. ai-recruitment\src\app\api\role-fit
  set /a count+=1
) else (
  echo [MISSING] 7. ai-recruitment\src\app\api\role-fit
)

if exist "ai-recruitment\src\app\(dashboard)\preferences" (
  echo [OK] 8. ai-recruitment\src\app\(dashboard)\preferences
  set /a count+=1
) else (
  echo [MISSING] 8. ai-recruitment\src\app\(dashboard)\preferences
)

if exist "ai-recruitment\src\components\preferences" (
  echo [OK] 9. ai-recruitment\src\components\preferences
  set /a count+=1
) else (
  echo [MISSING] 9. ai-recruitment\src\components\preferences
)

echo.
echo ======================================================================
echo Summary
echo ======================================================================
echo Result: %count%/9 directories verified successfully
echo.

if %count% equ 9 (
  echo SUCCESS: All 9 directories created!
) else (
  echo FAILURE: Only %count% out of 9 directories created
)

echo ======================================================================
pause
