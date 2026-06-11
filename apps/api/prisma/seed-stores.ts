import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PRODUCTS_SUPERMARKET = [
  { name: 'حليب طازج 1 لتر', description: 'حليب بقر طازج كامل الدسم', price: 6, category: 'ألبان وأجبان' },
  { name: 'شيبس بطاطس', description: 'شيبس بطاطس مقرمش بنكهة الملح', price: 3, category: 'تسالي' },
  { name: 'كولا 2 لتر', description: 'مشروب غازي بارد 2 لتر', price: 7, category: 'مشروبات' },
  { name: 'بيض مائدة', description: 'طبق بيض طازج 30 حبة', price: 18, category: 'ألبان وأجبان' },
  { name: 'خبز عربي', description: 'ربطة خبز عربي طازج', price: 4, category: 'مخبوزات' },
];

const PRODUCTS_BOOKSTORE = [
  { name: 'قلم حبر أزرق', description: 'قلم حبر سائل جاف - لون أزرق', price: 2, category: 'قرطاسية' },
  { name: 'دفتر 100 ورقة', description: 'دفتر جامعي سلك 100 ورقة', price: 5, category: 'قرطاسية' },
  { name: 'حقيبة مدرسية', description: 'حقيبة مدرسية متينة مع جيوب متعددة', price: 65, category: 'حقائب' },
  { name: 'ألوان مائية', description: 'علبة ألوان مائية 12 لون مع ريشة', price: 12, category: 'أدوات فنية' },
];

const PRODUCTS_BUTCHERY = [
  { name: 'لحم خروف 1 كغم', description: 'لحم خروف بلدي طازج بالعظم', price: 85, category: 'لحوم حمراء' },
  { name: 'دجاج كامل 1.2 كغم', description: 'دجاج طازج منظف', price: 18, category: 'دواجن' },
  { name: 'كفتة عجل 1 كغم', description: 'كفتة عجل مبهرة جاهزة للشوي', price: 55, category: 'لحوم مفرومة' },
  { name: 'شيش طاووق 1 كغم', description: 'مكعبات دجاج مبهرة للشوي', price: 35, category: 'دواجن' },
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
  type: 'FOOD' | 'STORE';
  tagNames?: string[];
  areaId: string;
  rating: number;
  products: Array<{ name: string; description: string; price: number; category: string }>;
}) {
  const tags = params.tagNames?.length
    ? await prisma.tag.findMany({ where: { type: params.type, name: { in: params.tagNames } } })
    : [];
  const tagRefs = tags.map((t: { id: string }) => ({ id: t.id }));
  const tagsCreate = tagRefs.length ? { tags: { connect: tagRefs } } : {};
  const tagsUpdate = tagRefs.length ? { tags: { set: tagRefs } } : {};

  const biz = await prisma.business.upsert({
    where: { ownerId: params.ownerId },
    update: { name: params.name, isOpen: true, rating: params.rating, type: params.type, ...tagsUpdate },
    create: {
      ownerId: params.ownerId,
      name: params.name,
      type: params.type,
      areaId: params.areaId,
      isOpen: true,
      rating: params.rating,
      ...tagsCreate,
    },
  });

  // Categories map to track category IDs
  const categoryMap = new Map<string, string>();

  for (const p of params.products) {
    // Create category if it doesn't exist
    if (!categoryMap.has(p.category)) {
      let cat = await prisma.productCategory.findFirst({
        where: { businessId: biz.id, name: p.category },
      });
      if (!cat) {
        cat = await prisma.productCategory.create({
          data: { businessId: biz.id, name: p.category },
        });
      }
      categoryMap.set(p.category, cat.id);
    }

    const categoryId = categoryMap.get(p.category);

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
          category: p.category, // Old field compatibility
          categoryId: categoryId, // New schema field
        },
      });
    }
  }

  return biz;
}

async function main() {
  console.log('🛒 Seeding STORE data...\n');

  // Find area
  const area = await prisma.area.findFirst();
  if (!area) {
    console.error('No areas found. Please run main seed first.');
    return;
  }

  // Ensure tags for stores exist
  const storeTags = ['سوبرماركت', 'مكتبة', 'ملحمة'];
  for (const t of storeTags) {
    await prisma.tag.upsert({
      where: { name_type: { name: t, type: 'STORE' } },
      update: {},
      create: { name: t, type: 'STORE' },
    });
  }

  // 1. Supermarket
  const u1 = await upsertUser({ phone: '0599000101', name: 'سوبرماركت المدينة', password: 'test', role: 'BUSINESS', areaId: area.id });
  await upsertBusiness({ ownerId: u1.id, name: 'سوبرماركت المدينة', type: 'STORE', tagNames: ['سوبرماركت'], areaId: area.id, rating: 4.6, products: PRODUCTS_SUPERMARKET });
  console.log('✅ Supermarket seeded: 0599000101 / test');

  // 2. Bookstore
  const u2 = await upsertUser({ phone: '0599000102', name: 'مكتبة الجامعة', password: 'test', role: 'BUSINESS', areaId: area.id });
  await upsertBusiness({ ownerId: u2.id, name: 'مكتبة الجامعة', type: 'STORE', tagNames: ['مكتبة'], areaId: area.id, rating: 4.8, products: PRODUCTS_BOOKSTORE });
  console.log('✅ Bookstore seeded: 0599000102 / test');

  // 3. Butchery
  const u3 = await upsertUser({ phone: '0599000103', name: 'ملحمة السلام', password: 'test', role: 'BUSINESS', areaId: area.id });
  await upsertBusiness({ ownerId: u3.id, name: 'ملحمة السلام', type: 'STORE', tagNames: ['ملحمة'], areaId: area.id, rating: 4.9, products: PRODUCTS_BUTCHERY });
  console.log('✅ Butchery seeded: 0599000103 / test');

  console.log('\n🎉 Store seed complete!\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
