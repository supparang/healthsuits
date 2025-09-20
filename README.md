[README.md](https://github.com/user-attachments/files/22439243/README.md)
# Virtual Health Suite (Spatial-ready)
รวม 3 มินิเกม WebXR พร้อม Hub/Portal
- `hub/index.html` — หน้าเลือกเกมและแสดงผลใน iframe พร้อม Event Log (postMessage)
- `handwash/` — Handwash Quest (HWQ_COMPLETE)
- `nutrition/` — Nutrition Shop (NUTRITION_COMPLETE)
- `dance/` — Move & Dance (DANCE_COMPLETE)

## วิธีใช้งาน
1) อัปโหลดทั้งโฟลเดอร์ขึ้นโฮสต์ (GitHub Pages/Netlify/S3/เซิร์ฟเวอร์ของโรงเรียน)
2) ใน Spatial ให้ฝัง URL ของ `hub/index.html` หรือฝังแต่ละ `*/embed.html` แยกห้อง/ป้าย
3) ผลลัพธ์แต่ละเกมส่งกลับด้วย postMessage ไปที่หน้า host:
   - Handwash: `{ type:'HWQ_COMPLETE', totalSeconds, done:{} }`
   - Nutrition: `{ type:'NUTRITION_COMPLETE', picked:{} }`
   - Dance: `{ type:'DANCE_COMPLETE', score }`
