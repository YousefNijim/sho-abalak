import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    redirect('/login');
  }

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
