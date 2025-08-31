# TDM Survey System - GitHub CI/CD Deployment

Land Parcel Management System สำหรับการจัดการข้อมูลแปลงที่ดิน พร้อมระบบ CI/CD

## การติดตั้งบน Synology NAS

### ข้อกำหนดเบื้องต้น
- Synology NAS ที่รองรับ Docker
- Container Manager ติดตั้งแล้ว
- การเชื่อมต่ออินเทอร์เน็ตสำหรับดาวน์โหลด Docker image

### วิธีการติดตั้ง

1. **ดาวน์โหลดไฟล์ docker-compose**
   ```bash
   wget https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/docker-compose-production.yml
   ```

2. **แก้ไข docker-compose-production.yml**
   - แทนที่ `YOUR_GITHUB_USERNAME` ด้วยชื่อ GitHub ของคุณ

3. **สร้าง Project ใน Container Manager**
   - Container Manager > Projects > Create
   - เลือก "ใช้ไฟล์ที่มีอยู่ในโฟลเดอร์"
   - อัปโหลด docker-compose-production.yml

4. **เข้าใช้งาน**
   - http://IP-NAS:8080/

### การอัปเดต

1. Push โค้ดใหม่ไปยัง GitHub
2. รอ GitHub Actions build image เสร็จ
3. Container Manager > Projects > tdm-survey > Action > Recreate

### การตั้งค่าฐานข้อมูล

แก้ไขในไฟล์ `server_final.js`:

```javascript
const dbConfig = {
    host: '183.88.220.24',
    user: 'JKdata',  
    password: '2852542Job@',
    database: 'AppSheet',
    charset: 'utf8mb4'
};
```

### สถานะ Build

![Docker Build](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Build%20and%20Push%20Docker%20Image/badge.svg)

## การติดตั้ง (Installation)

### 1. ติดตั้ง Node.js
ดาวน์โหลดและติดตั้ง Node.js จาก https://nodejs.org/

### 2. ติดตั้ง dependencies
เปิด Command Prompt หรือ PowerShell ในโฟลเดอร์ app แล้วรันคำสั่ง:

```bash
npm install
```

### 3. ตั้งค่าฐานข้อมูล
ระบบจะเชื่อมต่อกับฐานข้อมูล MySQL ที่ระบุไว้:
- Host: 183.88.220.24
- Username: JKdata  
- Password: 2852542Job@
- Database: AppSheet

ตารางข้อมูลจะถูกสร้างอัตโนมัติเมื่อเริ่มต้นระบบ

## การรันระบบ (Running the Application)

### 1. เริ่มต้น Server
```bash
npm start
```

หรือสำหรับ development mode:
```bash
npm run dev
```

### 2. เข้าใช้งานระบบ
เปิดเว็บเบราว์เซอร์และไปที่:
- Local: http://localhost:3000
- จากเครื่องอื่นในเครือข่าย: http://[IP_ADDRESS]:3000

## ฟีเจอร์ของระบบ (Features)

### 1. จัดการแปลงที่ดิน
- เพิ่ม/แก้ไข/ลบข้อมูルแปลงที่ดิน
- บันทึกข้อมูลเจ้าของที่ดิน
- ระบบพิกัด GPS
- อัปโหลดรูปภาพ

### 2. นำเข้า/ส่งออกข้อมูล
- นำเข้าข้อมูลจากไฟล์ Excel
- ส่งออกข้อมูลเป็นไฟล์ Excel
- รองรับไฟล์ .xlsx และ .xls

### 3. แผนที่
- แสดงตำแหน่งแปลงที่ดินบนแผนที่
- นำเข้าไฟล์ Shapefile
- ระบุตำแหน่งปัจจุบัน

### 4. ค้นหาข้อมูล
- ค้นหาตามรหัสแปลงที่ดิน
- ค้นหาตามชื่อเจ้าของ
- ค้นหาตามประเภทที่ดิน

## โครงสร้างไฟล์ (File Structure)

```
app/
├── index.html          # หน้าเว็บหลัก
├── styles.css          # ไฟล์ CSS สำหรับจัดรูปแบบ
├── script.js           # JavaScript สำหรับ Frontend
├── server.js           # Node.js Server และ API
├── package.json        # ข้อมูล dependencies
└── uploads/           # โฟลเดอร์สำหรับเก็บไฟล์อัปโหลด
```

## การใช้งานระบบออนไลน์

### สำหรับการใช้งานจากอินเทอร์เน็ต:

1. **ติดตั้งบน VPS หรือ Cloud Server**
2. **เปิด Port 3000** ในไฟร์วอลล์
3. **ใช้ Domain name** หรือ IP Address สาธารณะ
4. **ตั้งค่า HTTPS** สำหรับความปลอดภัย

### ตัวอย่างการตั้งค่า PM2 (Process Manager):

```bash
# ติดตั้ง PM2
npm install -g pm2

# รันระบบด้วย PM2
pm2 start server.js --name "land-management"

# ตั้งให้เริ่มอัตโนมัติเมื่อ restart เซิร์ฟเวอร์
pm2 startup
pm2 save
```

## การแก้ไขปัญหา (Troubleshooting)

### 1. ไม่สามารถเชื่อมต่อฐานข้อมูลได้
- ตรวจสอบการตั้งค่าฐานข้อมูลใน server.js
- ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
- ตรวจสอบ firewall ของฐานข้อมูล

### 2. ไม่สามารถระบุตำแหน่งได้
- อนุญาตการใช้งาน Location ในเบราว์เซอร์
- ใช้ HTTPS สำหรับการเข้าถึง Geolocation API

### 3. ไม่สามารถนำเข้าไฟล์ Excel ได้
- ตรวจสอบรูปแบบไฟล์ (.xlsx, .xls)
- ตรวจสอบชื่อคอลัมน์ในไฟล์ Excel

## การสนับสนุน (Support)

หากต้องการความช่วยเหลือ กรุณาติดต่อ:
- Email: jobaom5@gmail.com
- หรือสร้าง Issue ใน GitHub repository

## การอัปเดต (Updates)

เพื่อรับการอัปเดตล่าสุด:
```bash
git pull origin main
npm install
pm2 restart land-management
```
