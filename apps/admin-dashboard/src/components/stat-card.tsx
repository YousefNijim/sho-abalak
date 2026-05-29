interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  tone: 'primary' | 'secondary' | 'tertiary' | 'warning-amber';
}

const TONE: Record<StatCardProps['tone'], { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  secondary: { bg: 'bg-secondary/10', text: 'text-secondary' },
  tertiary: { bg: 'bg-tertiary/10', text: 'text-tertiary' },
  'warning-amber': { bg: 'bg-warning-amber/10', text: 'text-warning-amber' },
};

export function StatCard({ icon, label, value, tone }: StatCardProps) {
  const t = TONE[tone];
  return (
    <div className="flex items-center gap-gap-md rounded-xl border border-border-beige bg-surface-white p-5 shadow-sm transition-all hover:shadow-md">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-lg ${t.bg} ${t.text}`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-[13px] text-muted-gray">{label}</p>
        <h3 className="text-2xl font-bold text-on-surface">{value}</h3>
      </div>
    </div>
  );
}
