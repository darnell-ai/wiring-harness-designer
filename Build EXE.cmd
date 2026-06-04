@echo off
setlocal
cd /d "%~dp0"

set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"

if not exist "%CSC%" (
  echo Windows C# compiler not found.
  pause
  exit /b 1
)

if not exist "dist" mkdir "dist"

"%CSC%" /nologo /target:winexe /optimize+ /out:"dist\WiringHarnessDesigner.exe" /reference:System.dll /reference:System.Core.dll /reference:System.Windows.Forms.dll /resource:"index.html",WiringHarnessDesigner.index.html /resource:"styles.css",WiringHarnessDesigner.styles.css /resource:"app.js",WiringHarnessDesigner.app.js /resource:"VERSION.txt",WiringHarnessDesigner.VERSION.txt /resource:"CHANGELOG.md",WiringHarnessDesigner.CHANGELOG.md /resource:"README.md",WiringHarnessDesigner.README.md "desktop\WiringHarnessDesigner.cs"

if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

copy /y "index.html" "dist\index.html" >nul
copy /y "styles.css" "dist\styles.css" >nul
copy /y "app.js" "dist\app.js" >nul
copy /y "VERSION.txt" "dist\VERSION.txt" >nul
copy /y "CHANGELOG.md" "dist\CHANGELOG.md" >nul
copy /y "README.md" "dist\README.md" >nul
copy /y "dist\WiringHarnessDesigner.exe" "WiringHarnessDesigner.exe" >nul
del /q "dist\CSC*.TMP" >nul 2>nul

echo Built WiringHarnessDesigner.exe and dist\WiringHarnessDesigner.exe
endlocal
