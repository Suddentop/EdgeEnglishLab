@echo off
chcp 65001 > nul
echo ======================================
echo   PHP API Proxy Server 시작
echo ======================================
echo.
echo 서버 주소: http://localhost:8000
echo 프록시 URL: http://localhost:8000/api-proxy.php
echo 테스트 페이지: http://localhost:8000/test-api.php
echo.
echo 이 창을 닫으면 서버가 종료됩니다.
echo React 앱도 함께 실행해야 합니다.
echo.
echo ======================================
cd php_api_proxy
php -S localhost:8000
pause

