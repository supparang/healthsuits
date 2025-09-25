# Hygiene Hero – WebXR (Spatial-ready)

มินิเกม “คัดแยกสุขลักษณะ” สำหรับนักเรียนชั้น ป.5
- รองรับ WebXR + Hand Tracking (pinch = หยิบ/ปล่อย, wave = คำใบ้)
- ใช้งานบนเดสก์ท็อปและเฮดเซ็ต
- ฝัง (Embed) ไปยัง Spatial.io ได้ทันที

## โครงสร้าง
- `index.html` – ตัวเกมพร้อม HUD/คะแนน/สรุปผล
- `HandGestureManager.js` – โมดูลท่าทางมือ (pinch/wave)

## รันท้องถิ่น
ต้องเสิร์ฟผ่าน HTTPS/localhost:
```bash
python -m http.server 8080
# เปิด http://localhost:8080
```

## ฝังลง Spatial.io
1) โฮสต์ไฟล์ทั้งโฟลเดอร์นี้บน HTTPS (GitHub Pages / Netlify / Vercel)
2) ใน Spatial สร้าง/แก้ไขสเปซ > เพิ่ม “Web content” แล้วใส่ URL ของ `index.html`
3) ทดสอบด้วยอุปกรณ์ที่รองรับ WebXR Hand Input
4) ถ้าไม่มี Hand Tracking จะ fallback เป็นคอนโทรลเลอร์/เมาส์

## ปรับแต่ง
- เพิ่ม/แก้รายการการ์ดในตัวแปร `CARDS` ภายใน `index.html`
- ปรับความไว pinch/wave ใน `HandGestureManager.js` (เช่น `pinchThreshold`, `waveMinSpeed`)

## ใบอนุญาต
สำหรับการศึกษา/สาธิต สามารถนำไปปรับใช้ได้
