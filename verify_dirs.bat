@echo off
setlocal enabledelayedexpansion

cd /d C:\Users\ANURON\smartHire-BE-FE-v2

echo Creating 9 directories...
echo.

mkdir "ai-recruitment\src\modules\preferences\types" 2>nul
mkdir "ai-recruitment\src\modules\preferences\validators" 2>nul
mkdir "ai-recruitment\src\modules\preferences\services" 2>nul
mkdir "ai-recruitment\src\modules\preferences\controllers" 2>nul
mkdir "ai-recruitment\src\app\api\preferences" 2>nul
mkdir "ai-recruitment\src\app\api\salary-insights" 2>nul
mkdir "ai-recruitment\src\app\api\role-fit" 2>nul
mkdir "ai-recruitment\src\app\(dashboard)\preferences" 2>nul
mkdir "ai-recruitment\src\components\preferences" 2>nul

echo.
echo Verifying directories...
echo.

set count=0

if exist "ai-recruitment\src\modules\preferences\types" (
  echo [OK] ai-recruitment\src\modules\preferences\types
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\modules\preferences\types
)

if exist "ai-recruitment\src\modules\preferences\validators" (
  echo [OK] ai-recruitment\src\modules\preferences\validators
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\modules\preferences\validators
)

if exist "ai-recruitment\src\modules\preferences\services" (
  echo [OK] ai-recruitment\src\modules\preferences\services
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\modules\preferences\services
)

if exist "ai-recruitment\src\modules\preferences\controllers" (
  echo [OK] ai-recruitment\src\modules\preferences\controllers
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\modules\preferences\controllers
)

if exist "ai-recruitment\src\app\api\preferences" (
  echo [OK] ai-recruitment\src\app\api\preferences
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\app\api\preferences
)

if exist "ai-recruitment\src\app\api\salary-insights" (
  echo [OK] ai-recruitment\src\app\api\salary-insights
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\app\api\salary-insights
)

if exist "ai-recruitment\src\app\api\role-fit" (
  echo [OK] ai-recruitment\src\app\api\role-fit
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\app\api\role-fit
)

if exist "ai-recruitment\src\app\(dashboard)\preferences" (
  echo [OK] ai-recruitment\src\app\(dashboard)\preferences
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\app\(dashboard)\preferences
)

if exist "ai-recruitment\src\components\preferences" (
  echo [OK] ai-recruitment\src\components\preferences
  set /a count+=1
) else (
  echo [MISSING] ai-recruitment\src\components\preferences
)

echo.
echo Result: %count%/9 directories verified successfully
echo.
