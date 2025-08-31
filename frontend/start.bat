@echo off
echo Installing dependencies...
call npm install

echo Starting Land Parcel Management System...
echo Server will start on http://localhost:3000
echo.
echo To stop the server, press Ctrl+C
echo.

call npm start
pause
