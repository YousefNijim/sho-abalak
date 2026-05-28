/** تنسيق المبلغ بالشيكل */
export function formatShekel(amount: number): string {
  return `${amount.toFixed(2)} ₪`;
}
