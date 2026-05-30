/**
 * seed.ts — شو عبالك؟ Demo Data Seed
 * ─────────────────────────────────────
 * IDEMPOTENT: safe to re-run. Uses Prisma upsert on every unique constraint
 * so re-running never throws duplicate-key errors.
 *
 * Demo credentials:
 *  Admin    phone: 0599000000  password: admin1234
 *  Customer phone: 0599000001  password: test1234
 *  Business phone: 0599000002  password: test1234  (مطعم القدس — RESTAURANT)
 *  Business phone: 0599000004  password: test1234  (كافيه الصباح — CAFE)
 *  Driver   phone: 0599000003  password: test1234  (محمد — AVAILABLE)
 *  Driver   phone: 0599000005  password: test1234  (خالد — AVAILABLE)
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── 1. Areas ─────────────────────────────────────────────────────────────────

const AREA_MAP: Record<string, { name: string; fee: number }[]> = {
  'رام الله / البيرة': [
    { name: 'البيرة', fee: 3 },
    { name: 'المركز', fee: 3 },
    { name: 'البالوع', fee: 4 },
    { name: 'المصيون', fee: 3 },
    { name: 'بيتونيا', fee: 4 },
  ],
  نابلس: [
    { name: 'الشرقية', fee: 3 },
    { name: 'الغربية', fee: 3 },
    { name: 'رافيديا', fee: 4 },
    { name: 'المخفية', fee: 4 },
  ],
  الخليل: [
    { name: 'المركز', fee: 3 },
    { name: 'الحي القديم', fee: 3 },
    { name: 'الهرسينا', fee: 4 },
    { name: 'دورا', fee: 5 },
  ],
  'بيت لحم': [
    { name: 'المركز', fee: 3 },
    { name: 'بيت جالا', fee: 4 },
    { name: 'بيت ساحور', fee: 4 },
  ],
  جنين: [
    { name: 'المركز', fee: 3 },
    { name: 'قباطية', fee: 5 },
    { name: 'يعبد', fee: 5 },
  ],
  طولكرم: [
    { name: 'المركز', fee: 3 },
    { name: 'عنبتا', fee: 4 },
    { name: 'عتيل', fee: 5 },
  ],
};

/** Returns a map of "city:name" → Area record for quick lookup. */
async function seedAreas(): Promise<Map<string, string>> {
  const areaIdMap = new Map<string, string>();

  for (const [city, areas] of Object.entries(AREA_MAP)) {
    for (const { name, fee } of areas) {
      // Area has no unique constraint on (city, name), so we use findFirst + create-if-missing.
      let area = await prisma.area.findFirst({ where: { city, name } });
      if (!area) {
        area = await prisma.area.create({ data: { city, name, deliveryFee: fee } });
      }
      areaIdMap.set(`${city}:${name}`, area.id);
    }
  }

  const total = await prisma.area.count();
  console.log(`✅ Areas: ${total} rows in DB`);
  return areaIdMap;
}

// ─── 2. Demo data ─────────────────────────────────────────────────────────────

const PRODUCTS_RESTAURANT = [
  { name: 'شاورما دجاج',      description: 'صدر دجاج مشوي مع خبز محلي وصوص ثوم وبطاطا',      price: 18, category: 'وجبات رئيسية' },
  { name: 'شاورما لحمة',      description: 'لحمة عجل طازجة مع طحينة ومخللات وخبز عربي',        price: 25, category: 'وجبات رئيسية' },
  { name: 'صحن حمص',          description: 'حمص بالطحينة وزيت الزيتون والزعتر الفلسطيني',       price: 12, category: 'أطباق جانبية' },
  { name: 'فلافل بالخبز',     description: 'فلافل مقلية طازجة مع خضار وصوص طحينة',              price: 10, category: 'أطباق جانبية' },
  { name: 'عصير برتقال طازج', description: 'برتقال طبيعي 100% بدون سكر مضاف',                  price:  8, category: 'مشروبات' },
  { name: 'مشروب غازي',       description: 'بيبسي / سفن أب / ميرندا',                            price:  5, category: 'مشروبات' },
];

const PRODUCTS_CAFE = [
  { name: 'قهوة أمريكية',    description: 'قهوة مخمرة طازجة — كبير أو صغير',               price: 12, category: 'مشروبات ساخنة' },
  { name: 'كابتشينو',        description: 'إسبريسو مع رغوة الحليب والقرفة',                 price: 16, category: 'مشروبات ساخنة' },
  { name: 'لاتيه بالكراميل', description: 'إسبريسو بالحليب المبخر وصوص الكراميل',           price: 18, category: 'مشروبات ساخنة' },
  { name: 'عصير تفاح',       description: 'عصير تفاح طبيعي بارد',                          price: 10, category: 'مشروبات باردة' },
  { name: 'كيك شوكولاطة',    description: 'قطعة كيك شوكولاطة طازجة محلية الصنع',           price: 15, category: 'حلويات' },
  { name: 'كرواسون',         description: 'كرواسون بالزبدة أو الجبنة — طازج يومياً',        price:  8, category: 'حلويات' },
];

async function upsertUser(data: {
  phone: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'CUSTOMER' | 'BUSINESS' | 'DRIVER';
  areaId: string;
}) {
  const hashed = await bcrypt.hash(data.password, 10);
  return prisma.user.upsert({
    where: { phone: data.phone },
    update: {
      // Update name/role/areaId in case the seed changes, but do NOT re-hash password
      // (upsert update is a no-op for password — keeps whatever was set on first create)
      name: data.name,
      role: data.role,
      areaId: data.areaId,
    },
    create: {
      phone: data.phone,
      name: data.name,
      role: data.role,
      areaId: data.areaId,
      password: hashed,
      status: 'ACTIVE',
    },
  });
}

async function upsertBusiness(params: {
  ownerId: string;
  name: string;
  category: 'RESTAURANT' | 'CAFE' | 'STORE';
  areaId: string;
  rating: number;
  products: Array<{ name: string; description: string; price: number; category: string }>;
}) {
  // Upsert the business record itself
  const biz = await prisma.business.upsert({
    where: { ownerId: params.ownerId },
    update: { name: params.name, isOpen: true, rating: params.rating },
    create: {
      ownerId: params.ownerId,
      name: params.name,
      category: params.category,
      areaId: params.areaId,
      isOpen: true,
      rating: params.rating,
    },
  });

  // Upsert products by name — if product exists for this business keep it, else create
  for (const p of params.products) {
    const existing = await prisma.product.findFirst({
      where: { businessId: biz.id, name: p.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          businessId: biz.id,
          name: p.name,
          description: p.description,
          price: p.price,
          isAvailable: true,
          category: p.category,
        },
      });
    }
  }

  return biz;
}

async function upsertDriver(userId: string, areaId: string, rating: number) {
  return prisma.driver.upsert({
    where: { userId },
    update: { status: 'AVAILABLE', areaId, rating },
    create: { userId, status: 'AVAILABLE', areaId, rating },
  });
}

async function seedDemo(areaMap: Map<string, string>) {
  const masyonId  = areaMap.get('رام الله / البيرة:المصيون')!;
  const centerId  = areaMap.get('رام الله / البيرة:المركز')!;

  // ── Admin ──
  await upsertUser({ phone: '0599000000', name: 'مشرف النظام',        password: 'admin1234', role: 'ADMIN',    areaId: masyonId });
  console.log('✅ Admin    0599000000 / admin1234');

  // ── Customer ──
  await upsertUser({ phone: '0599000001', name: 'أحمد الزبون التجريبي', password: 'test1234',  role: 'CUSTOMER', areaId: masyonId });
  console.log('✅ Customer 0599000001 / test1234');

  // ── Business 1: مطعم القدس ──
  const bUser1 = await upsertUser({ phone: '0599000002', name: 'صاحب مطعم القدس',   password: 'test1234', role: 'BUSINESS', areaId: masyonId });
  await upsertBusiness({ ownerId: bUser1.id, name: 'مطعم القدس',   category: 'RESTAURANT', areaId: masyonId, rating: 4.8, products: PRODUCTS_RESTAURANT });
  console.log('✅ Business 0599000002 / test1234  → مطعم القدس (RESTAURANT, 6 products, مصيون)');

  // ── Business 2: كافيه الصباح ──
  const bUser2 = await upsertUser({ phone: '0599000004', name: 'صاحبة كافيه الصباح', password: 'test1234', role: 'BUSINESS', areaId: centerId });
  await upsertBusiness({ ownerId: bUser2.id, name: 'كافيه الصباح', category: 'CAFE',       areaId: centerId,  rating: 4.5, products: PRODUCTS_CAFE });
  console.log('✅ Business 0599000004 / test1234  → كافيه الصباح (CAFE, 6 products, المركز)');

  // ── Driver 1 ──
  const dUser1 = await upsertUser({ phone: '0599000003', name: 'محمد السائق', password: 'test1234', role: 'DRIVER', areaId: masyonId });
  await upsertDriver(dUser1.id, masyonId, 4.7);
  console.log('✅ Driver   0599000003 / test1234  → محمد (AVAILABLE, مصيون)');

  // ── Driver 2 ──
  const dUser2 = await upsertUser({ phone: '0599000005', name: 'خالد السائق', password: 'test1234', role: 'DRIVER', areaId: centerId });
  await upsertDriver(dUser2.id, centerId, 4.9);
  console.log('✅ Driver   0599000005 / test1234  → خالد (AVAILABLE, المركز)');

  // ── System Settings ──
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      defaultCommission: 10.00,
      baseDeliveryFee: 3.00,
      customerAppActive: true,
      businessAppActive: true,
      driverAppActive: true,
    },
  });
  console.log('✅ System Settings seeded');
}

// ─── Entry ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting seed...\n');
  const areaMap = await seedAreas();
  await seedDemo(areaMap);
  console.log('\n🎉 Seed complete — safe to re-run anytime.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
