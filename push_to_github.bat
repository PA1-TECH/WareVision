@echo off
echo ====================================================
echo             WareVision GitHub Push Script            
echo ====================================================
echo.

:: Initialize Git repository if not already done
if not exist .git (
    echo [1/5] Initializing Git repository...
    git init
) else (
    echo [1/5] Git repository already initialized.
)

:: Configure user details
echo [2/5] Configuring Git user credentials...
git config user.name "PA1-TECH"
git config user.email "mpavankumartech06@gmail.com"

:: Add remote repository
echo [3/5] Setting up remote origin...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/PA1-TECH/WareVision.git

:: Stage all files
echo [4/5] Staging files...
git add .

:: Commit files
echo [5/5] Committing changes...
git commit -m "update my rep"

echo.
echo ====================================================
echo Staging and commits are complete!
echo.
echo Now pushing to GitHub. If prompted, please complete
echo the authentication in your browser or enter your
echo GitHub Personal Access Token (PAT).
echo ====================================================
echo.

git branch -M main
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo [SUCCESS] Code successfully pushed to GitHub!
) else (
    echo [ERROR] Push failed. Please check your connection/credentials and run "git push -u origin main" manually.
)
pause
