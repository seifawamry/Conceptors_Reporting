@echo off
title Conceptors CRM - 1-Click Google Drive Setup
color 0A
cls
echo =====================================================================
echo  CONCEPTORS CRM: 1-CLICK GOOGLE DRIVE & CLOUD SYNC AUTOMATION
echo =====================================================================
echo.
echo [1/3] Copying Google Apps Script code to your Windows clipboard...

powershell -NoProfile -Command "Get-Content '%~dp0google_drive_sync.gs' -Raw | Set-Clipboard"

echo  -- Done! The complete code is now in your clipboard.
echo.
echo [2/3] Opening Google Apps Script editor in your browser...
start https://script.new

echo.
echo =====================================================================
echo  FINAL 2 STEPS IN YOUR BROWSER (TAKES 30 SECONDS):
echo =====================================================================
echo.
echo  Step A: Press Ctrl + A (select all), then Ctrl + V (Paste).
echo          Click the Save icon (Ctrl + S).
echo.
echo  Step B: Click Deploy (top right) -^> New deployment:
echo          - Select type: Web app
echo          - Execute as: Me
echo          - Who has access: Anyone
echo          Click Deploy, click Allow permissions, and COPY your Web App URL.
echo.
echo  Step C: Paste that URL into your CRM's Cloud Sync box and click Save!
echo =====================================================================
echo.
pause
