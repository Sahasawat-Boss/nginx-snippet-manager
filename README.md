# Nginx Snippet Manager

Web app สำหรับเก็บและค้นหา nginx config snippet มี REST API แบบ CRUD โดยให้ nginx เป็นทั้ง web server และ reverse proxy

```
Browser → nginx (:8080)
            ├─ /api/* → Express API (:3000) → SQLite
            └─ /*     → React app (static + SPA fallback)
```

| ส่วน | เทคโนโลยี | โฟลเดอร์ |
|---|---|---|
| Reverse proxy / static | nginx | `nginx/` |
| API | Node 22, Express, SQLite (`node:sqlite`) | `api/` |
| หน้าเว็บ | React, Vite | `web/` |

## ฟีเจอร์

- เพิ่ม แก้ไข ลบ ทำสำเนา ค้นหา และกรอง snippet ด้วย tag
- รายการโปรด: กดดาวเพื่อปักไว้บนสุด และกรองดูเฉพาะรายการโปรดได้
- หน้าภาพรวมแสดงจำนวน snippet รายการที่แก้ไขล่าสุด และ tag ที่ใช้บ่อย
- ไฮไลต์ syntax ของ nginx พร้อมเลขบรรทัด
- ตรวจ config เบื้องต้นระหว่างพิมพ์ เช่น ลืม `;` ปีกกาไม่ครบ หรือค่าที่เสี่ยงด้านความปลอดภัย (ไม่ได้แทน `nginx -t`)
- คัดลอก หรือดาวน์โหลดเป็นไฟล์ `.conf`
- คีย์ลัด: `/` ค้นหา, `n` เพิ่ม snippet

## เริ่มใช้งาน

ต้องมี Docker และเปิด Docker Desktop ไว้

```bash
docker compose up --build -d
```

เปิด <http://localhost:8080> ถ้า port 8080 ไม่ว่าง ให้ตั้ง `PORT` ก่อนรัน เช่น `PORT=9090 docker compose up --build -d`

| คำสั่ง | ผลลัพธ์ |
|---|---|
| `docker compose logs -f` | ดู log ของทุก service |
| `docker compose down` | หยุดระบบ ข้อมูลยังอยู่ |
| `docker compose down -v` | หยุดระบบและ **ลบข้อมูลทั้งหมด** |

## API

| Method | Path | คำอธิบาย |
|---|---|---|
| `GET` | `/api/snippets?q=&tag=&favorite=true&page=&limit=` | ดูรายการ ค้นหา และกรองด้วย tag หรือรายการโปรด |
| `GET` | `/api/snippets/:id` | ดูรายการเดียว |
| `POST` | `/api/snippets` | เพิ่ม |
| `PUT` | `/api/snippets/:id` | แก้ไข |
| `PUT` | `/api/snippets/:id/favorite` | ตั้งหรือเอาออกจากรายการโปรด (`{"favorite":true}`) |
| `DELETE` | `/api/snippets/:id` | ลบ |
| `GET` | `/api/tags` | ดู tag ทั้งหมดพร้อมจำนวน |
| `GET` | `/api/stats` | ดูจำนวนรวมและรายการที่แก้ไขล่าสุด |
| `GET` | `/api/health` | ตรวจสถานะ API |

ตัวอย่างการเพิ่มข้อมูล

```bash
curl -X POST http://localhost:8080/api/snippets \
  -H "Content-Type: application/json" \
  -d '{"title":"เปิด gzip","content":"gzip on;","tags":["performance"]}'
```

เมื่อเกิดข้อผิดพลาด API จะตอบกลับในรูปแบบเดียวกันทุกกรณี

```json
{ "error": { "code": "validation_error", "message": "ข้อมูลไม่ถูกต้อง", "details": { "title": "กรุณากรอกชื่อ" } } }
```

## สิ่งที่ nginx ทำในโปรเจกต์นี้

- Reverse proxy `/api/` ไปที่ API พร้อม keepalive
- จำกัด request 20 ครั้งต่อวินาทีต่อ IP (burst 40) เกินแล้วตอบ `429`
- ตอบ JSON `503` เมื่อ API ล่ม แทนหน้า error แบบ HTML
- เสิร์ฟ React พร้อม SPA fallback และ cache ไฟล์ใน `/assets/` นาน 1 ปี
- gzip, security header และ log ของ API ที่มีเวลาตอบสนอง

## พัฒนาโดยไม่ใช้ Docker

ต้องใช้ Node 22.13 ขึ้นไป

```bash
cd api && npm install && npm run dev      # http://localhost:3000
cd web && npm install && npm run dev      # http://localhost:5173
cd api && npm test
cd web && npm test
```
