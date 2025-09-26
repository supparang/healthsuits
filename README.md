[README.md](https://github.com/user-attachments/files/22552290/README.md)
# WebXR VR Starter (A‑Frame) — TH/EN

**สิ่งที่ต้องมี (สำคัญ):**
- เปิดบน **Android + Chrome** ที่รองรับ WebXR (เข้าผ่าน HTTPS)
- iPhone/iOS (Safari/All browsers) *ยังไม่รองรับ WebXR Device API* ณ ปัจจุบัน — ใช้โหมด 2D ได้ แต่ไม่มี VR เต็มรูปแบบ

## วิธีใช้งาน
1) อัปโหลดโฟลเดอร์นี้ขึ้นโฮสต์ที่เป็น HTTPS (เช่น GitHub Pages / Netlify / Vercel)
2) เปิดลิงก์บนมือถือ Android แล้วกดปุ่ม **Enter VR** (จาก A‑Frame) เพื่อเข้าสู่โหมด VR
3) ใส่มือถือในแว่น Cardboard/BOBOVR แล้วใช้มอง + แตะหน้าจอ หรือ gaze (fuse) เพื่อยิงเป้า

## ปรับ “ระดับความยาก”
- แก้ไขไฟล์ `app.js`:
  - เวลาเล่น: `this.timeLeft = 30;`
  - อัตราเกิดเป้า: `this.spawnInterval = setInterval(..., 900);` (น้อย = เกิดถี่ขึ้น)
  - คะแนนต่อเป้า: ใน event `click` เพิ่ม / ลดคะแนนได้
  - อายุเป้า: ตัวแปร `life` (ms) ยิ่งน้อย = ยิ่งยาก

## ปัญหาพบบ่อย
- ปุ่ม Enter VR ไม่ขึ้น: ตรวจสอบว่าใช้ Android Chrome + HTTPS และไม่ได้เปิดใน iFrame ที่บล็อก XR
- ตัวหนังสือใหญ่/เล็กเกินไป: ปรับ `text="width: ..."` บน HUD หรือใช้ `scale="x y z"`

Happy building!
