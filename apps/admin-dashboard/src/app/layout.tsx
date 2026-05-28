import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'شو عبالك؟ — لوحة الأدمن',
  description: 'منصة الطلبات للمطاعم والمحلات التجارية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
