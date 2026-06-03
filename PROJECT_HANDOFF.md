# شو عبالك؟ — Project Handoff Document
> منصة الطلبات للمطاعم والمحلات التجارية | الضفة الغربية، فلسطين

---

## 📋 نظرة عامة

| المعلومة | التفصيل |
|---|---|
| **اسم المشروع** | شو عبالك؟ |
| **النوع** | منصة تجارة إلكترونية — طلب وتوصيل |
| **الجمهور المستهدف** | الضفة الغربية، فلسطين |
| **عدد التطبيقات** | 4 تطبيقات موبايل + لوحة ويب |
| **إصدار الوثيقة** | v1.0 |
| **التاريخ** | يونيو 2026 |

---

## 👥 المستخدمون الأربعة

```
1. الزبون (Customer)         — يطلب من المطاعم والمحلات
2. المنشأة التجارية (Business) — تستقبل الطلبات وتحضّرها
3. عامل التوصيل (Driver)     — يوصل الطلبات للزبون
4. المشرف (Admin)            — يشرف على المنصة بالكامل
```

---

## 🏗️ البنية التقنية

### Backend
| التقنية | الاستخدام |
|---|---|
| **Node.js + TypeScript** | لغة البرمجة |
| **NestJS** | إطار العمل |
| **PostgreSQL 16** | قاعدة البيانات الرئيسية |
| **Redis 7** | Caching + Real-time state |
| **Firebase Realtime DB** | تحديثات لحظية |
| **Prisma ORM** | التعامل مع قاعدة البيانات |
| **Socket.io** | WebSockets |
| **JWT + bcrypt** | المصادقة والأمان |
| **Firebase FCM** | Push Notifications |
| **AWS S3 / Cloudinary** | تخزين الصور |
| **Swagger / OpenAPI 3.0** | توثيق الـ API |

### Mobile Apps
| التقنية | الاستخدام |
|---|---|
| **React Native 0.74** | إطار التطبيقات |
| **Expo SDK 51** | بيئة التطوير |
| **TypeScript** | لغة البرمجة |
| **Zustand** | State Management |
| **React Query** | Server State + Caching |
| **React Navigation v6** | التنقل بين الشاشات |
| **Axios** | HTTP Client |
| **Socket.io-client** | Real-time |
| **AsyncStorage + MMKV** | التخزين المحلي |

### Admin Dashboard
| التقنية | الاستخدام |
|---|---|
| **Next.js 14** | إطار العمل |
| **TypeScript** | لغة البرمجة |
| **shadcn/ui + Tailwind** | مكونات الواجهة |
| **Recharts** | الرسوم البيانية |
| **TanStack Table v8** | الجداول |

### Infrastructure
| التقنية | الاستخدام |
|---|---|
| **Docker + Docker Compose** | Containerization |
| **GitHub Actions** | CI/CD |
| **Nginx** | Reverse Proxy |
| **AWS / DigitalOcean** | Cloud Hosting |
| **Sentry** | Error Tracking |

---

## 🗄️ نموذج قاعدة البيانات

```sql
users          → id, role, status, name, phone, email?, password? (nullable), image_url?, area_id?
businesses     → id, owner_id, name, type (FOOD/STORE), area_id, delivery_type,
                 image_url?, logo_url?, phone?, address_detail?, open_time?, close_time?,
                 rating (computed avg), is_open, commission_rate, lat? (unused), lng? (unused)
tags           → id, name, type (FOOD/STORE)  [M2M with businesses via _BusinessTags]
products       → id, business_id, name, price, image_url?, is_available, category? (free-text)
orders         → id, customer_id, business_id, driver_id?, pending_driver_id?,
                 batch_id?,  ← groups batch-dispatched orders to one driver
                 status, payment_method, total,
                 delivery_area_name?, delivery_address_detail?,
                 note?, created_at
order_items    → id, order_id, product_id, quantity, unit_price (snapshotted)
order_status_history → id, order_id, status, changed_by, created_at
drivers        → id, user_id, status (AVAILABLE/BUSY/OFFLINE), area_id,
                 rating (weighted avg: customer deliveryRatings + business DriverReviews)
areas          → id, city, name, delivery_fee
saved_addresses → id, user_id, label, detail, area_id?, created_at
reviews        → id, order_id (unique), business_rating, delivery_rating?,
                 comment?, created_at
                 ← customer rates: products (required) + delivery speed (optional)
driver_reviews → id, order_id (unique), driver_id, business_id,
                 rating, created_at
                 ← business rates driver speed/response per delivery
payments       → id, order_id (unique), method, status, amount, provider?, reference? (unique)
device_tokens  → id, user_id, token (unique), platform?, app?, created_at
system_settings → id="default", default_commission, base_delivery_fee,
                  customer_app_active, business_app_active, driver_app_active
banners        → id, image_url, link_url?, is_active, created_at
```

### حالات الطلب (Order Status Flow)
```
PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
                                         ↘ CANCELLED
```

---

## 🔌 Socket.io Events

| Event | الاتجاه | الوصف |
|---|---|---|
| `order:new` | Server → Business | طلب جديد وصل للمنشأة |
| `order:status_update` | Server → Customer & Business | تحديث حالة الطلب |
| `order:driver_rejected` | Server → Business | السائق رفض الطلب |
| `driver:request` | Server → Driver | عرض توصيل — payload: `{ batchId, orders[] }` (1+ orders) |
| `driver:status_change` | Server → All | تغيير حالة السائق (broadcast) |

---

## 📍 نظام المناطق (GPS Workaround)

بدل GPS التقليدي — نظام مناطق يدوي مقسّم حسب المدن:

```
رام الله / البيرة → البيرة، المركز، البالوع، المصيون، بيتونيا
نابلس            → الشرقية، الغربية، رافيديا، المخفية
الخليل           → المركز، الحي القديم، الهرسينا، دورا
بيت لحم          → المركز، بيت جالا، بيت ساحور
جنين             → المركز، قباطية، يعبد
طولكرم           → المركز، عنبتا، عتيل
```

---

## 💰 نموذج الإيرادات

| المصدر | النسبة / القيمة |
|---|---|
| عمولة على الطلب | 8–15% |
| رسوم التوصيل | 2–5 شيكل/طلب |
| اشتراك المنشآت | 50–200 شيكل/شهر |
| إعلانات داخل التطبيق | ثابت شهري |

---

## 📁 هيكل المستودع (Monorepo)

```
shu-abalak/
├── apps/
│   ├── api/              ← NestJS Backend
│   ├── customer-app/     ← React Native (زبون)
│   ├── business-app/     ← React Native (منشأة)
│   ├── driver-app/       ← React Native (سائق)
│   └── admin-dashboard/  ← Next.js
├── packages/
│   ├── shared-types/     ← TypeScript interfaces
│   ├── ui-components/    ← مكونات مشتركة
│   └── utils/            ← دوال مشتركة
├── docker-compose.yml
└── nx.json
```

---

## 🚀 خطة التطوير

| المرحلة | المدة | المخرجات |
|---|---|---|
| 0 - تخطيط | أسبوعان | ERD + Wireframes + Dev Setup |
| 1 - Backend MVP | 4–6 أسابيع | API + Auth + Orders + Sockets |
| 2 - تطبيق الزبون | 4–5 أسابيع | تطبيق كامل على Beta |
| 3 - تطبيق المنشأة | 3–4 أسابيع | استقبال الطلبات + إدارة |
| 4 - تطبيق السائق | 2–3 أسابيع | حالة + توصيل |
| 5 - Admin Dashboard | 3–4 أسابيع | لوحة تحكم كاملة |
| 6 - Beta Launch | 2–3 أسابيع | 5–10 مطاعم تجريبية |
| 7 - إطلاق رسمي | مستمر | توسع + تسويق |

---

## 🎨 الهوية البصرية — ملخص

> التفاصيل الكاملة في ملف `FRONTEND_DESIGN.md`

| العنصر | القيمة |
|---|---|
| **اللون الأساسي** | `#E6781E` — برتقالي/زعفراني |
| **اللون الثانوي** | `#165A34` — أخضر فلسطيني |
| **الخلفية** | `#FCF3DC` — كريمي دافئ |
| **الخط العربي** | Cairo |
| **الخط اللاتيني** | Montserrat |
| **أيقونة التطبيق** | "شو" برتقالي + "عبالك؟" أخضر على كريمي |

---

## 📞 روابط مهمة

- **التصميم (Stitch/Figma):** `[رابط التصميم]`
- **GitHub Repository:** `[رابط المستودع]`
- **Swagger API Docs:** `[رابط التوثيق]`
- **Production API:** `https://shu-abalak-production.up.railway.app`
- **Production DB:** Railway PostgreSQL (internal URL only, not accessible locally)
- **Images:** Cloudinary (credentials in `apps/api/.env`)
- **Staging Environment:** ❌ No longer used — production only
