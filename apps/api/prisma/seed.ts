import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// نظام المناطق — راجع PROJECT_HANDOFF.md §نظام المناطق
const AREAS: Record<string, string[]> = {
  'رام الله / البيرة': ['البيرة', 'المركز', 'البالوع', 'المصيون', 'بيتونيا'],
  نابلس: ['الشرقية', 'الغربية', 'رافيديا', 'المخفية'],
  الخليل: ['المركز', 'الحي القديم', 'الهرسينا', 'دورا'],
  'بيت لحم': ['المركز', 'بيت جالا', 'بيت ساحور'],
  جنين: ['المركز', 'قباطية', 'يعبد'],
  طولكرم: ['المركز', 'عنبتا', 'عتيل'],
};

async function main() {
  for (const [city, names] of Object.entries(AREAS)) {
    for (const name of names) {
      await prisma.area.create({
        data: { city, name, deliveryFee: 3 },
      });
    }
  }
  console.log('Seeded areas.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
