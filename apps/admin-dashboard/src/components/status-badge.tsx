// Mirrors the status colors from FRONTEND_DESIGN.md §6 (admin uses a localized label set).
const STYLES: Record<string, { bg: string; text: string }> = {
  مكتمل: { bg: '#D1FAE5', text: '#065F46' },
  'قيد التنفيذ': { bg: '#FEF3C7', text: '#92400E' },
  'في الطريق': { bg: '#DBEAFE', text: '#1E40AF' },
  ملغي: { bg: '#FEE2E2', text: '#991B1B' },
};

export function StatusBadge({ label }: { label: string }) {
  const s = STYLES[label] ?? { bg: '#E5E0D5', text: '#1C1C23' };
  return (
    <span
      className="rounded-full px-3 py-1 text-[12px] font-bold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {label}
    </span>
  );
}
