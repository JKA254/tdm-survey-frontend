# 🌐 การใช้ TDM บน QuickConnect Server

## 📋 ขั้นตอนการตั้งค่า

### 1. 🖥️ เตรียม QuickConnect Server
```bash
# ตรวจสอบ Node.js
node --version
npm --version

# ติดตั้ง Node.js หากยังไม่มี
# ผ่าน Package Center หรือ Command Line
```

### 2. 📁 อัปโหลดไฟล์ระบบ
```bash
# คัดลอกโฟลเดอร์ app ทั้งหมดไปยัง QuickConnect
# เช่น: /volume1/apps/tdm-survey/
```

### 3. 🚀 เรียกใช้บน QuickConnect
```cmd
# เข้า SSH หรือ Terminal ของ QuickConnect
cd /volume1/apps/tdm-survey/

# รันระบบ
node server_new.js

# หรือใช้ background process
nohup node server_new.js &
```

### 4. 🌍 เปิดให้เข้าถึงจากภายนอก
```cmd
# รัน quick-field-access.bat ผ่าน Terminal
./quick-field-access.bat

# หรือใช้ PowerShell ถ้ารองรับ
powershell ./quick-field-access.bat
```

## ⚙️ การตั้งค่าเพิ่มเติมสำหรับ QuickConnect

### 🔄 Auto-Start Service
```bash
# สร้าง systemd service (Linux-based QuickConnect)
sudo nano /etc/systemd/system/tdm-survey.service

[Unit]
Description=TDM Survey System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/volume1/apps/tdm-survey
ExecStart=/usr/bin/node server_new.js
Restart=always

[Install]
WantedBy=multi-user.target

# Enable และ start service
sudo systemctl enable tdm-survey.service
sudo systemctl start tdm-survey.service
```

### 🌐 Port Forwarding ใน QuickConnect
```
1. เข้า Control Panel > Network > Network Interface
2. ตั้งค่า Port Forwarding: 
   - External Port: 8080
   - Internal Port: 3000
   - Protocol: TCP
3. เปิด Firewall สำหรับ port 8080
```

### 🔗 DDNS Setup
```
1. ใช้ QuickConnect DDNS หรือ No-IP
2. ตั้งค่า domain name เช่น: tdm-survey.quickconnect.to
3. เข้าถึงผ่าน: https://tdm-survey.quickconnect.to:8080
```

## 📱 การใช้งานจริงบน QuickConnect

### ✅ ข้อดี:
- 🔄 **ระบบเสถียร**: รันได้ 24/7 โดยไม่ต้องเปิดคอมพิวเตอร์
- 🌐 **DDNS**: มี URL ถาวรไม่ต้องหา tunnel ใหม่ทุกครั้ง
- 💾 **Backup**: ข้อมูลปลอดภัยบน NAS storage
- ⚡ **Performance**: เสถียรกว่า tunnel services

### ⚠️ ข้อควรระวัง:
- 🔐 **Security**: ตั้งค่า SSL certificate และ firewall
- 🌍 **Internet**: ต้อง IP สาธารณะหรือ DDNS
- 💡 **Power**: ต้องมีไฟฟ้าเสถียรหรือ UPS
- 🔄 **Updates**: ต้องอัปเดต Node.js และ dependencies

## 🎯 คำแนะนำสำหรับ QuickConnect

### 🚀 เริ่มต้นใช้งาน:
1. อัปโหลดโฟลเดอร์ app ไปยัง QuickConnect
2. ติดตั้ง Node.js dependencies
3. ตั้งค่า port forwarding (3000 → 8080)
4. ทดสอบการเข้าถึงผ่าน IP ภายนอก
5. ตั้งค่า DDNS สำหรับ URL ถาวร

### 📞 Emergency Access:
หาก tunnel services ไม่ทำงาน สามารถใช้:
- QuickConnect URL: https://[YOUR-ID].quickconnect.to:8080
- Direct IP: http://[PUBLIC-IP]:8080
- VPN: เชื่อมต่อ VPN เข้า network ภายใน

## 🔧 Troubleshooting

### ❌ หาก port 3000 ถูกใช้:
```bash
# เปลี่ยน port ในไฟล์ server_new.js
const PORT = process.env.PORT || 3001;
```

### 🔒 หาก firewall block:
```bash
# เปิด port บน QuickConnect firewall
sudo ufw allow 3000
sudo ufw allow 8080
```

### 🌐 หาก DDNS ไม่ทำงาน:
```
1. ใช้ quick-field-access.bat เป็น backup
2. ตั้งค่า No-IP หรือ DuckDNS
3. ใช้ CloudFlare Tunnel
```
