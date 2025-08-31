@echo off
title TDM QuickConnect Server Setup
color 0B

echo ================================================
echo 🖥️ TDM สำหรับ QuickConnect Server
echo ================================================
echo.

echo 📋 ขั้นตอนการตั้งค่าบน QuickConnect:
echo.
echo 1. 📁 อัปโหลดโฟลเดอร์นี้ไปยัง QuickConnect
echo    - Path แนะนำ: /volume1/apps/tdm-survey/
echo.
echo 2. 🔧 ติดตั้ง Node.js บน QuickConnect
echo    - ผ่าน Package Center หรือ SSH
echo    - ตรวจสอบ: node --version
echo.
echo 3. 📦 ติดตั้ง dependencies
echo    - SSH เข้า QuickConnect
echo    - cd /volume1/apps/tdm-survey/
echo    - npm install
echo.
echo 4. 🌐 ตั้งค่า Network
echo    - Control Panel ^> Network ^> Port Forwarding
echo    - External: 8080 -^> Internal: 3000
echo    - เปิด Firewall สำหรับ port 8080
echo.
echo 5. 🚀 เริ่มใช้งาน
echo    - node server_new.js
echo    - หรือ nohup node server_new.js ^&
echo.

echo 🎯 ทางเลือกการเข้าถึง:
echo.
echo 🔗 แบบ DDNS (แนะนำ):
echo    - ตั้งค่า QuickConnect DDNS
echo    - เข้าผ่าน: https://[YOUR-ID].quickconnect.to:8080
echo.
echo 🌐 แบบ Direct IP:
echo    - หา Public IP ของ QuickConnect  
echo    - เข้าผ่าน: http://[PUBLIC-IP]:8080
echo.
echo 🚀 แบบ Tunnel (backup):
echo    - ใช้ quick-field-access.bat
echo    - LocalTunnel, Serveo, ngrok
echo.

echo 💡 คำแนะนำ:
echo.
echo ✅ ข้อดี QuickConnect:
echo    - ระบบเสถียร 24/7
echo    - URL ถาวร (DDNS)
echo    - ข้อมูลปลอดภัยบน NAS
echo    - ไม่ต้องเปิดคอมฯ ตลอด
echo.
echo ⚠️ ข้อควรระวัง:
echo    - ต้องมี Public IP หรือ DDNS
echo    - ตั้งค่า Security ให้ดี
echo    - เตรียม UPS สำรวจไฟดับ
echo.

echo 📞 ติดต่อสำหรับความช่วยเหลือ:
echo    - อ่าน quickconnect-setup.md
echo    - ทดสอบการเชื่อมต่อก่อนใช้จริง
echo.

pause
