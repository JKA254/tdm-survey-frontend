# 📖 วิธีติดตั้ง TDM บน Synology แบบไม่ใช้ SSH

## 🌐 Method 1: ผ่าน DSM Web Interface (แนะนำ)

### 1️⃣ เปิด File Station
```
1. เข้า https://tdmbackup-sg4.quickconnect.to
2. Login ด้วย admin account
3. เปิด File Station
4. ไปที่ /volume1/web/ (หรือ /volume1/homes/admin/)
5. สร้างโฟลเดอร์ใหม่ชื่อ "tdm-survey"
```

### 2️⃣ อัปโหลดไฟล์
```
1. เข้าโฟลเดอร์ tdm-survey ที่สร้างใหม่
2. คลิก "Upload" → "Upload Files"
3. เลือกไฟล์ทั้งหมดจาก Desktop\app:
   ✅ server_new.js
   ✅ package.json
   ✅ index.html
   ✅ script.js
   ✅ styles.css
   ✅ manifest.json
   ✅ sw.js
   ✅ quick-field-access.sh
   ✅ โฟลเดอร์ icons/
   ✅ โฟลเดอร์ libs/
4. รอ Upload เสร็จ
```

### 3️⃣ เปิด SSH Terminal
```
1. ใน DSM ไป Control Panel → Terminal & SNMP
2. เปิด "Enable SSH service" ✅
3. Port: 22
4. Apply
```

### 4️⃣ ทดลอง SSH อีกครั้ง
```
ssh admin@[IP-ADDRESS]
# หรือ
ssh admin@tdmbackup-sg4.quickconnect.to -p 22
```

## 🔍 Method 2: หา IP Address จริง

### ใช้ nslookup หา IP
```cmd
nslookup tdmbackup-sg4.quickconnect.to
```

### หรือเช็คใน DSM
```
Control Panel → Network → Network Interface
ดู IP Address ที่แสดง
```

## 🎯 Method 3: ใช้ DSM Terminal (ในตัว)

### เปิด Terminal ใน DSM
```
1. ใน DSM Package Center
2. ติดตั้ง "SSH Terminal" หรือ "Docker" (มี Terminal)
3. เปิด Terminal ใน DSM โดยตรง
4. รันคำสั่งได้เลย
```

## 📱 ขั้นตอนต่อไป (หลังอัปโหลดเสร็จ)

### 1. เข้า Terminal
```bash
# ไปโฟลเดอร์ที่อัปโหลด
cd /volume1/web/tdm-survey

# ตรวจสอบไฟล์
ls -la
```

### 2. ติดตั้ง Dependencies
```bash
# ตรวจสอบ Node.js
node --version
npm --version

# ติดตั้ง packages
npm install
```

### 3. ทดสอบรันระบบ
```bash
# รันทดสอบ
node server_new.js
```

## ⚡ Quick Commands สำหรับ Copy-Paste

```bash
# All-in-one setup (รันทีเดียว)
cd /volume1/web/tdm-survey && \
npm install && \
npm install -g localtunnel && \
node --version && \
echo "✅ Setup Complete!"
```

## 🎯 ผลลัพธ์ที่ควรเห็น

```
✅ Node.js: v18.x.x
✅ npm: 8.x.x
✅ Dependencies ติดตั้งแล้ว
✅ Server พร้อมรัน
```
