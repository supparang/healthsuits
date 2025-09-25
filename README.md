# Health Quest 5 – WebXR (Spatial-ready)

เกมมินิเกมสุขภาพสำหรับนักเรียนชั้น ป.5 เน้น 3 ด้าน: อนามัยส่วนบุคคล, โภชนาการ, การออกกำลังกาย
รองรับ Hand-Tracking (pinch / wave) ผ่าน WebXR Hand Input และมี fallback เป็นคอนโทรลเลอร์/เมาส์

## โครงสร้างไฟล์
- `index.html` — หน้าเกมหลัก (ตัวอย่างมีด่าน Hygiene แบบคัดแยกการ์ด)
- `HandGestureManager.js` — โมดูลตรวจจับท่าทาง pinch / wave

## ใช้งานแบบโลคัล (ทดสอบบนเดสก์ท็อป)
ต้องเสิร์ฟผ่าน HTTPS/localhost:
```bash
# Python 3
python -m http.server 8080
# เปิด http://localhost:8080 แล้วโหลด index.html
```

> เบราว์เซอร์ต้องรองรับ WebXR (Chrome-based ใหม่ ๆ) และสำหรับ Hand Tracking ต้องใช้อุปกรณ์ที่มี API ดังกล่าว

## ใช้งานกับ Spatial.io
1) โฮสต์โปรเจกต์นี้บน HTTPS (เช่น GitHub Pages / Netlify / Vercel)
2) นำ URL ที่โฮสต์ไปฝังใน Spatial (Web content / embed webpage)
3) ทดสอบบนเฮดเซ็ตหรืออุปกรณ์ที่รองรับ Hand Tracking
4) ถ้าไม่รองรับมือ ระบบจะใช้คอนโทรลเลอร์/เมาส์แทน

## ปรับแต่ง
- เพิ่มการ์ด/โซนโภชนาการและออกกำลังกายใน `index.html` (คัดลอกฟังก์ชัน `makeCard`, `makeBin` และการจัดวาง)
- ปรับค่าความไว gesture ได้ใน `HandGestureManager.js` (เช่น `pinchThreshold`, `waveMinSpeed`)

## ลิขสิทธิ์
ตัวอย่างนี้เผยแพร่สำหรับการศึกษา/สาธิต สามารถนำไปแก้ไขต่อได้
