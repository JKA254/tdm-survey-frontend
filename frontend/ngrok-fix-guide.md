# 🔧 แก้ไขปัญหา ngrok authtoken

## ❌ ปัญหาที่เกิดขึ้น
```
ERROR: authentication failed: The authtoken you specified does not look like a proper ngrok tunnel authtoken.
ERROR: Your authtoken: $YOUR_AUTHTOKEN
```

## ✅ วิธีแก้ไข

### ขั้นตอนที่ 1: สมัครบัญชี ngrok (ฟรี)
1. ไปที่ https://ngrok.com
2. กด **"Sign up"** 
3. สมัครด้วย Google, GitHub, หรือ Email
4. ยืนยัน Email (ถ้าจำเป็น)

### ขั้นตอนที่ 2: รับ authtoken
1. หลัง login แล้ว จะเห็นหน้า Dashboard
2. ไปที่ **"Your Authtoken"** หรือ https://dashboard.ngrok.com/get-started/your-authtoken
3. คัดลอก authtoken ที่แสดง (ยาวประมาณ 50 ตัวอักษร)
4. **authtoken ที่ถูกต้อง** จะมีหน้าตาแบบ: `2abc123def456ghi789jkl012mno345pqr678stu901`

### ขั้นตอนที่ 3: ติดตั้ง authtoken
เปิด Command Prompt และรันคำสั่ง:
```bash
ngrok config add-authtoken YOUR_ACTUAL_TOKEN
```

**ตัวอย่าง:**
```bash
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu901
```

### ขั้นตอนที่ 4: ทดสอบ
```bash
ngrok http 3000
```

## 🚀 ทางเลือกอื่น (หาก ngrok ยุ่งยาก)

### 1. ใช้ LocalTunnel (ไม่ต้องสมัคร)
```bash
npm install -g localtunnel
lt --port 3000 --subdomain tdm-survey
```

### 2. ใช้ Serveo (ไม่ต้องติดตั้ง)
```bash
ssh -R 80:localhost:3000 serveo.net
```

### 3. ใช้ไฟล์ quick-field-access.bat
- ดับเบิลคลิก `quick-field-access.bat`
- ระบบจะเลือกวิธีที่เหมาะสมอัตโนมัติ

## 💡 คำแนะนำ

### สำหรับ ngrok:
- **ข้อดี**: เสถียร มี HTTPS ให้ฟรี, URL สวย
- **ข้อเสีย**: ต้องสมัครสมาชิก ต้องตั้งค่า authtoken

### สำหรับ LocalTunnel:
- **ข้อดี**: ไม่ต้องสมัคร ติดตั้งง่าย
- **ข้อเสีย**: URL เปลี่ยนทุกครั้ง อาจช้าบ้าง

### สำหรับ Serveo:
- **ข้อดี**: ไม่ต้องติดตั้งอะไร ใช้ SSH ธรรมดา
- **ข้อเสีย**: ต้องมี SSH client (Windows 10+ มีให้แล้ว)

## 🔍 วิธีตรวจสอบว่า tunnel ทำงาน

1. เปิด tunnel แล้วจะได้ URL เช่น:
   - ngrok: `https://abc123.ngrok.io`
   - LocalTunnel: `https://abc123.loca.lt`
   - Serveo: `https://abc123.serveo.net`

2. ทดสอบเปิด URL บนมือถือ
3. ควรเห็นหน้าเว็บ TDM ระบบจัดการที่ดิน
4. ทดสอบบันทึกข้อมูลสักรายการ

## ⚠️ ข้อควรระวัง

- **อย่าแชร์ URL กับคนนอกทีม**
- **ปิด tunnel เมื่อเลิกใช้งาน**  
- **URL จะเปลี่ยนทุกครั้งที่เริ่มใหม่** (ยกเว้น ngrok แบบเสียเงิน)
- **ตรวจสอบสัญญาณ 4G/5G ในพื้นที่สำรวจ**

## 📞 หากยังใช้ไม่ได้

ให้ลองตามลำดับ:
1. `quick-field-access.bat` (วิธีง่ายสุด)
2. LocalTunnel: `npm install -g localtunnel && lt --port 3000`
3. Serveo: `ssh -R 80:localhost:3000 serveo.net`
4. Deploy บน Cloud (ดูคู่มือ `Cloud-Deployment-Guide.md`)

**🎯 เป้าหมาย: ให้ทีมสำรวจเข้าถึงระบบได้จากทุกที่!**
