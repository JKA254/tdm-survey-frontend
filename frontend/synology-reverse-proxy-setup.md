# Synology Reverse Proxy Setup Guide

## วิธีตั้งค่า Reverse Proxy ใน Synology

### ขั้นตอน:

1. **เข้า Control Panel**:
   - เข้า Synology Control Panel
   - ไป Application Portal > Reverse Proxy

2. **สร้าง Reverse Proxy Rule**:
   - คลิก "Create"
   - ตั้งค่าดังนี้:

   **Source (เข้ามา)**:
   - Protocol: HTTPS
   - Hostname: tdmbackup.synology.me  
   - Port: 443
   - Path: /api/*

   **Destination (ส่งต่อไป)**:
   - Protocol: HTTP
   - Hostname: 192.168.1.147
   - Port: 8080
   - Path: /api/*

3. **Custom Header (ถ้าจำเป็น)**:
   - เพิ่ม Headers:
     - Host: 192.168.1.147:8080
     - X-Forwarded-Proto: https
     - X-Forwarded-Host: tdmbackup.synology.me

### ผลลัพธ์:
- `https://tdmbackup.synology.me/api/land_parcels` → `http://192.168.1.147:8080/api/land_parcels`

### ทดสอบ:
```bash
curl -k "https://tdmbackup.synology.me/api/land_parcels"
```

หากสำเร็จจะได้ข้อมูล JSON กลับมา
