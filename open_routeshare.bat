@echo off
cd /d "C:\Users\acer\OneDrive\Desktop\ROUTESHARE"
echo ========================================================
echo  ROUTESHARE - Control Center
echo  Folder: %CD%
echo ========================================================
echo.
echo  [1] Start Local Server (vercel dev)
echo  [2] Deploy Live to Vercel (vercel --prod)
echo  [3] Open in Vercel Dashboard (vercel open)
echo  [4] Open ROUTESHARE Folder in Windows Explorer
echo  [5] Open Terminal / Command Prompt here
echo  [6] Push / Import to GitHub (push_to_github.bat)
echo.
set /p opt="Select an option (1-6) [Default 1]: "
if "%opt%"=="" set opt=1
if "%opt%"=="1" goto DEV
if "%opt%"=="2" goto PROD
if "%opt%"=="3" goto DASHBOARD
if "%opt%"=="4" goto EXPLORER
if "%opt%"=="5" goto CLI
if "%opt%"=="6" goto GITHUB

:DEV
echo Starting Vercel local dev server...
vercel dev
goto FINISH

:PROD
echo Deploying to Vercel production...
vercel --prod
goto FINISH

:DASHBOARD
echo Opening Vercel project in browser...
vercel open
goto FINISH

:EXPLORER
explorer .
goto FINISH

:CLI
start cmd /k "cd /d C:\Users\acer\OneDrive\Desktop\ROUTESHARE"
goto FINISH

:GITHUB
call push_to_github.bat
goto FINISH

:FINISH
pause
