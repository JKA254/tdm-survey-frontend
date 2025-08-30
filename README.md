# TDM Survey System - Frontend

เว็บแอปพลิเคชันสำหรับจัดการข้อมูลแปลงที่ดิน รองรับการทำงานแบบ PWA

## การใช้งาน

เข้าใช้งานที่: https://YOUR_USERNAME.github.io/tdm-survey-frontend/

## คุณสมบัติ

- 📱 Progressive Web App (PWA)
- 📍 GPS Location Support  
- 📷 Camera Integration
- 📊 Excel Import/Export
- 🗺️ Shapefile Support
- 💾 Offline Capability
- 📱 Mobile Responsive

## Backend API

แอปนี้เชื่อมต่อกับ Backend API ที่รันอยู่บน:
- Development: `http://localhost:8080/api`
- Production: `https://tdmbackup.synology.me/api`

## การติดตั้ง

แอปนี้เป็น Static Website ใช้งานผ่าน GitHub Pages โดยตรง

## การพัฒนา

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/tdm-survey-frontend.git

# เปิดด้วย Live Server หรือเว็บเซิร์ฟเวอร์
# หรือเปิดไฟล์ index.html โดยตรง
```

## การกำหนดค่า

แก้ไข API URL ในไฟล์ `script.js`:

```javascript
const API_URL = 'https://your-nas.synology.me/api';
```
