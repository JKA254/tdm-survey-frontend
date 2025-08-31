# 📖 คู่มือการใช้งาน Quick Field Access บน QuickConnect แบบละเอียด

## 🔧 ขั้นตอนที่ 1: เตรียม QuickConnect Server

### 1.1 ตรวจสอบระบบ QuickConnect
```bash
# เข้า SSH หรือ Terminal ของ QuickConnect
ssh admin@[QuickConnect-IP]

# หรือเข้าผ่าน Web Interface → Control Panel → Terminal
```

### 1.2 ตรวจสอบ Node.js
```bash
# ตรวจสอบว่าติดตั้ง Node.js แล้วหรือไม่
node --version
npm --version

# หากยังไม่มี ติดตั้งผ่าน Package Center:
# 1. เปิด Package Center
# 2. หา "Node.js" 
# 3. คลิก Install
```

### 1.3 สร้างโฟลเดอร์สำหรับระบบ
```bash
# สร้างโฟลเดอร์บน QuickConnect
mkdir -p /volume1/apps/tdm-survey
cd /volume1/apps/tdm-survey

# ตรวจสอบ permission
ls -la
chown -R admin:administrators /volume1/apps/tdm-survey
chmod -R 755 /volume1/apps/tdm-survey
```

## 📁 ขั้นตอนที่ 2: อัปโหลดไฟล์ระบบ

### 2.1 วิธีอัปโหลดผ่าน Web Interface
```
1. เปิด File Station บน QuickConnect
2. Navigate ไปที่ /volume1/apps/
3. สร้างโฟลเดอร์ "tdm-survey"
4. เข้าโฟลเดอร์ tdm-survey
5. Upload ไฟล์ทั้งหมดจาก Desktop\app
```

### 2.2 วิธีอัปโหลดผ่าน SCP
```powershell
# จาก Windows (PowerShell)
cd C:\Users\jobao\Desktop\app

# อัปโหลดทั้งโฟลเดอร์
scp -r . admin@[QuickConnect-IP]:/volume1/apps/tdm-survey/

# หรืออัปโหลดทีละไฟล์สำคัญ
scp server_new.js admin@[QuickConnect-IP]:/volume1/apps/tdm-survey/
scp package.json admin@[QuickConnect-IP]:/volume1/apps/tdm-survey/
scp quick-field-access.bat admin@[QuickConnect-IP]:/volume1/apps/tdm-survey/
```

### 2.3 ตรวจสอบไฟล์ที่อัปโหลด
```bash
# SSH เข้า QuickConnect
cd /volume1/apps/tdm-survey
ls -la

# ต้องมีไฟล์เหล่านี้:
# - server_new.js
# - package.json  
# - quick-field-access.bat
# - index.html
# - script.js
# - styles.css
# - manifest.json
# - sw.js
```

## 🔧 ขั้นตอนที่ 3: ติดตั้ง Dependencies

### 3.1 ติดตั้ง Node.js packages
```bash
# SSH เข้า QuickConnect
cd /volume1/apps/tdm-survey

# ติดตั้ง dependencies
npm install

# ตรวจสอบว่าติดตั้งสำเร็จ
ls node_modules/
```

### 3.2 ติดตั้งเครื่องมือเสริม
```bash
# ติดตั้ง LocalTunnel (สำหรับ tunnel)
npm install -g localtunnel

# ติดตั้ง PM2 (สำหรับ process management)
npm install -g pm2

# ตรวจสอบการติดตั้ง
lt --version
pm2 --version
```

## 🌐 ขั้นตอนที่ 4: ตั้งค่า Network

### 4.1 ตั้งค่า Port Forwarding
```
QuickConnect Web Interface:
1. Control Panel → Network → Network Interface
2. เลือก Network Interface ที่ใช้งาน
3. คลิก "Edit"
4. ไปที่ Tab "Port Forwarding"
5. เพิ่มกฎใหม่:
   - Service Name: TDM-Survey
   - Port Type: TCP
   - Private Port: 3000
   - Public Port: 8080
   - Private IP: 127.0.0.1
6. คลิก "OK" และ "Apply"
```

### 4.2 ตั้งค่า Firewall
```bash
# เปิด port ใน firewall (หาก QuickConnect ใช้ Linux)
sudo ufw allow 3000
sudo ufw allow 8080

# หรือผ่าน Web Interface:
# Control Panel → Security → Firewall
# เพิ่ม rule สำหรับ port 3000 และ 8080
```

### 4.3 หา Public IP
```bash
# หา Public IP ของ QuickConnect
curl ifconfig.me
# หรือ
wget -qO- ifconfig.me

# บันทึก IP นี้ไว้ เช่น: 203.154.xxx.xxx
```

## 🚀 ขั้นตอนที่ 5: เรียกใช้ระบบ

### 5.1 ทดสอบรันระบบ
```bash
# SSH เข้า QuickConnect
cd /volume1/apps/tdm-survey

# รันทดสอบ
node server_new.js

# ควรเห็น:
# "Server running on port 3000"
# "Database connected successfully"
```

### 5.2 ทดสอบการเข้าถึง
```bash
# ทดสอบ Local (บน QuickConnect)
curl http://localhost:3000

# ทดสอบผ่าน Port Forwarding
curl http://[Public-IP]:8080

# ทดสอบจาก Browser
# เปิด: http://[Public-IP]:8080
```

### 5.3 ใช้ PM2 สำหรับรันถาวร
```bash
# รันด้วย PM2 (จะรันต่อเนื่องแม้ปิด SSH)
pm2 start server_new.js --name "tdm-survey"

# ตรวจสอบสถานะ
pm2 status

# ตั้งค่าให้เริ่มอัตโนมัติ
pm2 startup
pm2 save
```

## 🌍 ขั้นตอนที่ 6: ใช้งาน Quick Field Access

### 6.1 แปลง .bat สำหรับ Linux (หาก QuickConnect เป็น Linux)
```bash
# สร้าง shell script version
nano quick-field-access.sh
```

```bash
#!/bin/bash
echo "================================================"
echo "🌍 TDM ภาคสนาม - เข้าถึงจากภายนอกแบบง่าย"
echo "================================================"

# ตรวจสอบว่า server ทำงานหรือไม่
if ! netstat -tuln | grep -q ":3000 "; then
    echo "❌ Server ยังไม่ทำงาน"
    echo "กรุณาเริ่ม server ก่อน: pm2 start server_new.js --name tdm-survey"
    exit 1
fi

echo "✅ Server ทำงานอยู่ที่ localhost:3000"
echo "🚀 กำลังเปิด public tunnel..."

# ใช้ LocalTunnel
if command -v lt >/dev/null 2>&1; then
    echo "📦 ใช้ LocalTunnel..."
    echo "🌐 สร้าง public URL..."
    echo "URL จะแสดงด้านล่าง - คัดลอกส่งให้ทีมสำรวจ"
    lt --port 3000 --subdomain tdm-survey-$(date +%s)
else
    echo "❌ LocalTunnel ไม่พร้อมใช้งาน"
    echo "💡 ใช้ URL โดยตรง: http://[Public-IP]:8080"
fi
```

### 6.2 ทำให้ไฟล์รันได้
```bash
chmod +x quick-field-access.sh
```

### 6.3 ทดสอบรัน quick-field-access
```bash
# หากเป็น Windows Server
./quick-field-access.bat

# หากเป็น Linux
./quick-field-access.sh
```

## 📱 ขั้นตอนที่ 7: ทดสอบการเข้าถึงจากมือถือ

### 7.1 ทดสอบ URL
```
1. จากมือถือ เปิด Browser
2. ลอง URL เหล่านี้:
   - http://[Public-IP]:8080 (Direct IP)
   - https://[random].loca.lt (LocalTunnel)
   - https://[your-id].quickconnect.to:8080 (DDNS)
```

### 7.2 ทดสอบ PWA Installation
```
1. เปิดเว็บไซต์บนมือถือ
2. ดู popup "เพิ่มไปยังหน้าจอหลัก"
3. คลิก "เพิ่ม"
4. ตรวจสอบ icon บน home screen
5. เปิดแอปและทดสอบการทำงาน
```

### 7.3 ทดสอบบันทึกข้อมูล
```
1. เปิดแอป TDM บนมือถือ
2. กรอกข้อมูลทดสอบ:
   - รหัสแปลง: TEST001
   - ชื่อเจ้าของ: ทดสอบ
   - องค์กร: อบต.ไชยคราม
   - ประเภท: ที่ดิน
3. คลิก "บันทึก"
4. ตรวจสอบว่าข้อมูลถูกบันทึก
```

## 🔒 ขั้นตอนที่ 8: ความปลอดภัย

### 8.1 ตั้งค่า HTTPS (แนะนำ)
```bash
# ติดตั้ง SSL certificate
# หรือใช้ Let's Encrypt
# หรือใช้ CloudFlare SSL
```

### 8.2 จำกัดการเข้าถึง
```bash
# ใช้ nginx หรือ Apache เป็น reverse proxy
# ตั้งค่า rate limiting
# เพิ่ม basic authentication หากจำเป็น
```

## 🛠️ ขั้นตอนที่ 9: Troubleshooting

### 9.1 หาก Server ไม่เริ่ม
```bash
# ตรวจสอบ log
pm2 logs tdm-survey

# ตรวจสอบ port conflict
netstat -tuln | grep 3000

# restart service
pm2 restart tdm-survey
```

### 9.2 หาก Database ไม่เชื่อมต่อ
```bash
# ตรวจสอบ MySQL service
systemctl status mysql

# ตรวจสอบ database configuration
cat server_new.js | grep -A 10 "mysql.createConnection"
```

### 9.3 หาก Port Forwarding ไม่ทำงาน
```
1. ตรวจสอบ Router Settings
2. ตรวจสอบ Firewall Rules  
3. ทดสอบ port จาก external tool:
   - https://www.yougetsignal.com/tools/open-ports/
```

## 📞 ขั้นตอนที่ 10: การใช้งานจริง

### 10.1 เตรียมทีมสำรวจ
```
1. สอนการใช้งาน PWA
2. ให้ URL ที่ใช้งาน
3. ทดสอบการบันทึกข้อมูล
4. เตรียม Data Plan มือถือ
5. ตรวจสอบสัญญาณในพื้นที่สำรวจ
```

### 10.2 Monitoring และ Maintenance
```bash
# ตรวจสอบสถานะระบบ
pm2 status
pm2 monit

# ดู log แบบ real-time
pm2 logs tdm-survey --lines 50

# backup ข้อมูล
mysqldump -u root -p survey_db > backup_$(date +%Y%m%d).sql
```

## ✅ Checklist สำหรับการใช้งาน

- [ ] QuickConnect พร้อมใช้งาน
- [ ] Node.js ติดตั้งแล้ว  
- [ ] ไฟล์อัปโหลดครบ
- [ ] Dependencies ติดตั้งแล้ว
- [ ] Port forwarding ตั้งค่าแล้ว
- [ ] Firewall เปิด port แล้ว
- [ ] Server รันได้
- [ ] Database เชื่อมต่อได้
- [ ] เข้าถึงจากภายนอกได้
- [ ] PWA ติดตั้งได้บนมือถือ
- [ ] บันทึกข้อมูลได้
- [ ] ทีมสำรวจทดสอบแล้ว

🎯 **พร้อมใช้งานภาคสนามแล้ว!** 🚀
