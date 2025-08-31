#!/bin/bash
# TDM Quick Field Access for Linux/QuickConnect
clear
echo "================================================"
echo "🌍 TDM ภาคสนาม - เข้าถึงจากภายนอกแบบง่าย"
echo "================================================"
echo

echo "📱 วิธีการเปิดระบบให้เข้าถึงจากภายนอกแบบไม่ต้องตั้งค่า:"
echo

# Check if server is running
if ! netstat -tuln | grep -q ":3000 "; then
    echo "❌ Server ยังไม่ทำงาน"
    echo "กรุณาเปิด server ก่อน:"
    echo "1. pm2 start server_new.js --name tdm-survey"
    echo "2. หรือ: node server_new.js"
    echo "3. กลับมาเรียกใช้ไฟล์นี้ใหม่"
    echo
    read -p "กด Enter เพื่อออก..."
    exit 1
fi

echo "✅ Server ทำงานอยู่ที่ localhost:3000"
echo

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipecho.net/plain 2>/dev/null || echo "ไม่พบ")
if [ "$PUBLIC_IP" != "ไม่พบ" ]; then
    echo "🌐 IP สาธารณะ: $PUBLIC_IP"
    echo "📍 URL โดยตรง: http://$PUBLIC_IP:8080"
    echo
fi

echo "🚀 กำลังเปิด public tunnel..."
echo

# Try LocalTunnel first (no signup required)
if command -v npm >/dev/null 2>&1; then
    echo "📦 ใช้ LocalTunnel (ไม่ต้องสมัครสมาชิก)..."
    echo
    
    # Install localtunnel if not exists
    if ! command -v lt >/dev/null 2>&1; then
        echo "📥 ติดตั้ง LocalTunnel..."
        npm install -g localtunnel
    fi
    
    if command -v lt >/dev/null 2>&1; then
        echo "🌐 สร้าง public URL..."
        echo
        echo "⚠️ คำแนะนำ:"
        echo "1. จะได้ URL เช่น https://abc123.loca.lt"
        echo "2. คัดลอก URL นี้ส่งให้ทีมสำรวจ"
        echo "3. อย่าปิด terminal นี้ระหว่างใช้งาน"
        echo "4. กด Ctrl+C เพื่อหยุด"
        echo
        
        # Generate random subdomain
        SUBDOMAIN="tdm-survey-$(date +%s)"
        echo "🚀 เริ่มต้น LocalTunnel..."
        echo "🔗 Subdomain: $SUBDOMAIN"
        echo
        
        lt --port 3000 --subdomain $SUBDOMAIN
        
        echo
        echo "❌ LocalTunnel หยุดทำงาน"
        exit 0
    fi
fi

# Try SSH tunnel as backup  
if command -v ssh >/dev/null 2>&1; then
    echo "🔗 ใช้ Serveo SSH Tunnel..."
    echo
    echo "🌐 สร้าง public URL..."
    echo
    echo "⚠️ คำแนะนำ:"
    echo "1. จะได้ URL เช่น https://abc123.serveo.net"
    echo "2. คัดลอก URL นี้ส่งให้ทีมสำรวจ"
    echo "3. อย่าปิด terminal นี้ระหว่างใช้งาน" 
    echo "4. กด Ctrl+C เพื่อหยุด"
    echo
    
    echo "🚀 เริ่มต้น Serveo..."
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:3000 serveo.net
    
    echo
    echo "❌ Serveo หยุดทำงาน"
    exit 0
fi

# If nothing works, show manual options
echo "❌ ไม่พบเครื่องมือที่จำเป็น (npm หรือ ssh)"
echo
echo "💡 ทางเลือกอื่น:"
echo
echo "1. 📱 ใช้ ngrok (ต้องสมัครฟรี):"
echo "   - ไปที่ https://ngrok.com"
echo "   - Download และสมัครบัญชี"
echo "   - รันคำสั่ง: ./ngrok http 3000"
echo
echo "2. 🌐 ใช้ URL โดยตรง (หากมี Public IP):"
if [ "$PUBLIC_IP" != "ไม่พบ" ]; then
    echo "   - URL: http://$PUBLIC_IP:8080"
    echo "   - ตรวจสอบ Port Forwarding: 3000 → 8080"
else
    echo "   - หา Public IP ของ QuickConnect"
    echo "   - ตั้งค่า Port Forwarding: 3000 → 8080"
fi
echo
echo "3. 🏠 ใช้เครือข่ายภายใน:"
echo "   - ให้ทีมใช้ WiFi เดียวกัน"
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | sed 's/addr://')
if [ ! -z "$LOCAL_IP" ]; then
    echo "   - URL: http://$LOCAL_IP:3000"
fi
echo
echo "4. ☁️ Deploy บน Cloud:"
echo "   - อ่านคู่มือ Cloud-Deployment-Guide.md"
echo "   - Deploy บน Heroku/Railway/Vercel"
echo

echo "================================================"
echo "✅ ข้อมูลการเข้าถึงระบบ"
echo "================================================"
echo
echo "📱 วิธีใช้งานสำหรับทีมสำรวจ:"
echo
echo "1. ใช้ URL ข้างต้น"
echo "2. เปิด URL บนมือถือ"
echo "3. กด 'เพิ่มไปยังหน้าจอหลัก' เมื่อมี popup"
echo "4. ใช้งานเหมือน app ปกติ"
echo
echo "🔐 หมายเหตุความปลอดภัย:"
echo "- ใช้ HTTPS เมื่อเป็นไปได้"
echo "- ไม่แชร์ URL กับคนนอกทีม"
echo "- ปิดระบบเมื่อเลิกใช้งาน"
echo
echo "📞 การใช้งาน:"
echo "- ทดสอบบันทึกข้อมูลก่อนออกสำรวจ"
echo "- ตรวจสอบสัญญาณอินเทอร์เน็ตในพื้นที่"
echo "- เตรียม data plan ที่เพียงพอ"
echo

read -p "กด Enter เพื่อออก..."
