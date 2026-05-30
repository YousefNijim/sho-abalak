export const CATEGORY_IMAGES: Record<string, any> = {
  'افطار': require('../../assets/images/categories/افطار.png'),
  'إفطار': require('../../assets/images/categories/افطار.png'),
  'بيتزا': require('../../assets/images/categories/بيتزا.png'),
  'حلويات': require('../../assets/images/categories/حلويات.png'),
  'شاورما': require('../../assets/images/categories/شاورما.png'),
  'شرقي': require('../../assets/images/categories/شرقي.png'),
  'غربي': require('../../assets/images/categories/غربي.png'),
  'فلافل': require('../../assets/images/categories/فلافل.png'),
  'كافيه': require('../../assets/images/categories/كافيه.png'),
  'مقهى': require('../../assets/images/categories/كافيه.png'),
  'مشاوي': require('../../assets/images/categories/مشاوي.png'),
};

export function getCategoryImage(categoryName: string) {
  return CATEGORY_IMAGES[categoryName] ?? null;
}
