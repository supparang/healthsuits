# Handwash Quest
- แตะตามลำดับขั้นล้างมือ (8 ขั้น) จนครบ
- เมื่อครบ จะส่ง `postMessage` { type:'HWQ_COMPLETE', totalSeconds, done:{} } ไปยังหน้า host (embed.html)
