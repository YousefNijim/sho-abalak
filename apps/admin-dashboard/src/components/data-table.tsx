export function TableCard({
  headers,
  children,
  footer,
}: {
  headers: { label: string; align?: 'right' | 'center' | 'left' }[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-beige bg-surface-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-right">
          <thead>
            <tr className="border-b border-border-beige bg-surface-container-low text-[14px] text-on-surface">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-6 py-4 font-semibold ${
                    h.align === 'center' ? 'text-center' : h.align === 'left' ? 'text-left' : ''
                  }`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-beige">{children}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export function StatusDot({ active, on = 'نشط', off = 'غير نشط' }: { active: boolean; on?: string; off?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-success' : 'bg-error'}`} />
      <span className={`text-[13px] font-bold ${active ? 'text-success' : 'text-error'}`}>
        {active ? on : off}
      </span>
    </div>
  );
}

export function RowActions({ onSuspend }: { onSuspend?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 opacity-60 transition-opacity group-hover:opacity-100">
      <button className="flex h-10 w-10 items-center justify-center rounded-lg text-primary hover:bg-surface-container">
        <span className="material-symbols-outlined">visibility</span>
      </button>
      <button className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary hover:bg-surface-container">
        <span className="material-symbols-outlined">edit</span>
      </button>
      {onSuspend && (
        <button
          onClick={onSuspend}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-error hover:bg-error/10"
        >
          <span className="material-symbols-outlined">block</span>
        </button>
      )}
      {!onSuspend && (
        <button className="flex h-10 w-10 items-center justify-center rounded-lg text-error hover:bg-error/10">
          <span className="material-symbols-outlined">delete</span>
        </button>
      )}
    </div>
  );
}

