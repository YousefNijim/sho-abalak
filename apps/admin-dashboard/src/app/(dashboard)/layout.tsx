import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen md:mr-64">
        <TopBar />
        <div className="space-y-section-md p-margin-standard md:p-section-md">{children}</div>
        <footer className="p-margin-standard text-center text-[11px] text-muted-gray">
          © 2026 شو عبالك؟ — جميع الحقوق محفوظة
        </footer>
      </main>
    </>
  );
}
