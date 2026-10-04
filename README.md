# DECK THE STORE - Storefront & Admin Dashboard UI Pro (Blue Theme)

เทมเพลต UI เว็บไซต์สไตล์ **Dark Neon Blue (สีน้ำเงิน)** ครบทั้งหน้าบ้าน (Storefront) และระบบจัดการหลังบ้าน Pro (Admin Dashboard) พร้อมระบบ **Live Data Sync ผ่าน LocalStorage**

---

## 📁 โครงสร้างไฟล์
- `index.html` : หน้าร้านค้าหลัก (Storefront UI รองรับการสั่งซื้อและซิงค์ข้อมูลสด)
- `admin.html` : ระบบจัดการหลังบ้าน Pro (มีระบบล็อกอิน, จัดการสต็อก, กราฟยอดขาย)
- `assets/style.css` : ไฟล์สไตล์ CSS หลัก
- `assets/fonts/` : ฟอนต์ภาษาไทย (IBM Plex Sans Thai, LINE Seed Sans)
- `assets/cursor/` : เคอร์เซอร์กำหนดเอง
- `assets/` : ไอคอน, มาสคอตชิบิ, และรูปภาพ UI

---

## 🔐 ข้อมูลเข้าสู่ระบบผู้ดูแล (Admin Login)
- **หน้าล็อกอิน:** เปิดไฟล์ `admin.html`
- **ชื่อผู้ใช้เริ่มต้น (Username):** `DECK THE STORESTORE`
- **รหัสผ่านเริ่มต้น (Password):** `147`
*(สามารถเปลี่ยนชื่อผู้ใช้และรหัสผ่านใหม่ได้ที่แท็บ **"ตั้งค่าระบบ & รหัสผ่าน"** ภายในระบบหลังบ้าน)*

---

## ⚡ ฟีเจอร์ที่อัปเดตใหม่ในระบบหลังบ้าน:
1. **ระบบความปลอดภัย (Security Gatekeeper):**
   - มีหน้าต่างล็อกอินป้องกันการเข้าถึง พร้อมบันทึก Session และปุ่มออกจากระบบ (Logout)
   - ฟังก์ชันเปลี่ยนรหัสผ่าน Admin พร้อมระบบบันทึกความปลอดภัย
2. **ระบบซิงค์ข้อมูลสด (Live LocalStorage Sync):**
   - **เพิ่ม/แก้ไข/ลบ สินค้า** ในหน้า `admin.html` -> จะแสดงผลบนหน้าร้านค้า `index.html` ทันที!
   - **แก้ไขข้อความประกาศ หรือชื่อร้านค้า** -> หน้าร้านค้าเปลี่ยนตามแบบ Real-time
   - เมื่อกดสั่งซื้อสินค้าในหน้า `index.html` -> ระบบจะตัดสต็อกและส่งประวัติออเดอร์เข้าไปยังหลังบ้านทันที
3. **กราฟสรุปยอดขาย (Weekly Revenue Analytics):**
   - แสดงชาร์ตกราฟยอดขายแบบไดนามิก 7 วันย้อนหลัง โทนสีน้ำเงินนีออน
4. **ระบบสต็อกคีย์ดิจิทัล (Digital Key Dispenser):**
   - รองรับการใส่คีย์สินค้าแบบหลายบรรทัด และระบบตัดจ่ายคีย์อัตโนมัติเมื่อมีการสั่งซื้อ
5. **ระบบค้นหาและตัวกรองสถานะ (Search & Filter):**
   - ค้นหาสินค้า และกรองคำสั่งซื้อตามสถานะ (สำเร็จ, รอตรวจสอบ, ยกเลิก)


## Shared Store Data / Railway

This version adds shared server storage for `products`, `categories`, `coupons`, `orders`, and `payments`, in addition to the existing shared settings API.

### Railway deployment
1. Deploy this project as the Railway web service.
2. Add a Railway PostgreSQL database to the project.
3. Make sure the web service receives the database connection string as `DATABASE_URL`.
4. Redeploy. The server automatically creates the required tables.
5. Open `admin.html` once. The admin page pulls existing shared data; if a resource is not initialized yet, it publishes the current local copy to the server.

The storefront polls shared data every 3 seconds, so changes made in Admin can appear on other devices without a manual refresh.

If PostgreSQL is not configured, the server falls back to JSON files under `data/`. That fallback is useful for local testing but is not recommended for production Railway deployments because local filesystem data should not be treated as durable storage.
