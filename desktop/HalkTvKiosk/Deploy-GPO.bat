@echo off
chcp 65001 >nul
:: ======================================================================
:: HalkTV Teknik Destek Kiosk - Active Directory / GPO Dağıtım Scripti
:: ======================================================================

set "INSTALL_DIR=C:\Program Files\HalkTV\Kiosk"
set "SOURCE_EXE=%~dp0HalkTvKiosk.exe"
if not exist "%SOURCE_EXE%" (
  echo [HalkTV Kiosk] HalkTvKiosk.exe bulunamadi: %SOURCE_EXE%
  exit /b 2
)

echo [HalkTV Kiosk] Kurulum baslatiliyor...

:: Bilgisayar acilis betigi SYSTEM oturumunda calisir. Kullaniciya ait kiosk
:: burada baslatilmaz; HKLM Run kaydi oturum acan kullanicida baslatir.
:: 1. Hedef klasoru olustur
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: 2. Self-contained tek EXE'yi kopyala. Kullanici ayarlari AppData'da korunur.
copy /Y "%SOURCE_EXE%" "%INSTALL_DIR%\HalkTvKiosk.exe" >nul
if errorlevel 1 exit /b 3

:: 3. Her interaktif kullanici girisinde baslatma kaydi ekle (HKLM Run).
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "HalkTvKiosk" /t REG_SZ /d "\"%INSTALL_DIR%\HalkTvKiosk.exe\"" /f >nul 2>&1
if errorlevel 1 exit /b 4

echo [HalkTV Kiosk] Kurulum basariyla tamamlandi.
exit /b 0
