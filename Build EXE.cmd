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

"%CSC%" /nologo /target:winexe /optimize+ /out:"dist\DigiWire.exe" /reference:System.dll /reference:System.Core.dll /reference:System.Windows.Forms.dll /resource:"index.html",DIGIWIRE.index.html /resource:"styles.css",DIGIWIRE.styles.css /resource:"app.js",DIGIWIRE.app.js /resource:"VERSION.txt",DIGIWIRE.VERSION.txt /resource:"CHANGELOG.md",DIGIWIRE.CHANGELOG.md /resource:"README.md",DIGIWIRE.README.md /resource:"vendor\tesseract\tesseract.min.js",DIGIWIRE.vendor.tesseract.tesseract.min.js /resource:"vendor\tesseract\worker.min.js",DIGIWIRE.vendor.tesseract.worker.min.js /resource:"vendor\tesseract\core\tesseract-core.js",DIGIWIRE.vendor.tesseract.core.tesseract-core.js /resource:"vendor\tesseract\core\tesseract-core.wasm",DIGIWIRE.vendor.tesseract.core.tesseract-core.wasm /resource:"vendor\tesseract\core\tesseract-core.wasm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core.wasm.js /resource:"vendor\tesseract\core\tesseract-core-simd.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-simd.js /resource:"vendor\tesseract\core\tesseract-core-simd.wasm",DIGIWIRE.vendor.tesseract.core.tesseract-core-simd.wasm /resource:"vendor\tesseract\core\tesseract-core-simd.wasm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-simd.wasm.js /resource:"vendor\tesseract\core\tesseract-core-lstm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-lstm.js /resource:"vendor\tesseract\core\tesseract-core-lstm.wasm",DIGIWIRE.vendor.tesseract.core.tesseract-core-lstm.wasm /resource:"vendor\tesseract\core\tesseract-core-lstm.wasm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-lstm.wasm.js /resource:"vendor\tesseract\core\tesseract-core-simd-lstm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-simd-lstm.js /resource:"vendor\tesseract\core\tesseract-core-simd-lstm.wasm",DIGIWIRE.vendor.tesseract.core.tesseract-core-simd-lstm.wasm /resource:"vendor\tesseract\core\tesseract-core-simd-lstm.wasm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-simd-lstm.wasm.js /resource:"vendor\tesseract\core\tesseract-core-relaxedsimd.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-relaxedsimd.js /resource:"vendor\tesseract\core\tesseract-core-relaxedsimd.wasm",DIGIWIRE.vendor.tesseract.core.tesseract-core-relaxedsimd.wasm /resource:"vendor\tesseract\core\tesseract-core-relaxedsimd.wasm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-relaxedsimd.wasm.js /resource:"vendor\tesseract\core\tesseract-core-relaxedsimd-lstm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-relaxedsimd-lstm.js /resource:"vendor\tesseract\core\tesseract-core-relaxedsimd-lstm.wasm",DIGIWIRE.vendor.tesseract.core.tesseract-core-relaxedsimd-lstm.wasm /resource:"vendor\tesseract\core\tesseract-core-relaxedsimd-lstm.wasm.js",DIGIWIRE.vendor.tesseract.core.tesseract-core-relaxedsimd-lstm.wasm.js /resource:"vendor\tesseract\lang\eng.traineddata.gz",DIGIWIRE.vendor.tesseract.lang.eng.traineddata.gz "desktop\WiringHarnessDesigner.cs"

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
if exist "vendor" xcopy /E /I /Y "vendor" "dist\vendor" >nul
copy /y "dist\DigiWire.exe" "DigiWire.exe" >nul
del /q "dist\CSC*.TMP" >nul 2>nul

echo Built DigiWire.exe and dist\DigiWire.exe
endlocal
