@echo off
setlocal
cd /d "C:\Users\acer\OneDrive\Desktop\ROUTESHARE"

echo ========================================================
echo  RouteShare - GitHub Upload Assistant
echo ========================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please download and install Git from: https://git-scm.com/download/win
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo [1/4] Initializing Git repository...
if not exist ".git" (
    git init
    git branch -M main
)

echo [2/4] Staging files...
git add .

echo [3/4] Creating commit...
git commit -m "Initial commit of RouteShare application"

echo.
echo ========================================================
echo Go to https://github.com/new and create a new repository.
echo Copy the repository URL (e.g., https://github.com/username/routeshare.git)
echo ========================================================
echo.
set /p REPO_URL="Paste your GitHub repository URL: "

if "%REPO_URL%"=="" (
    echo [!] No URL provided. Aborted.
    pause
    exit /b 1
)

git remote remove origin >nul 2>nul
git remote add origin %REPO_URL%

echo.
echo [4/4] Pushing code to GitHub (main branch)...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo  SUCCESS! Your RouteShare project is now on GitHub!
    echo ========================================================
) else (
    echo [!] Push failed. Please check your credentials or repo permissions.
)

pause
