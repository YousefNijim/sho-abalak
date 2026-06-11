'use client';

import { Providers } from '../providers';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { BusinessProvider } from '@/components/BusinessProvider';
import { useBusinessSocket } from '@/hooks/useBusinessSocket';
import { useState } from 'react';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Activate Socket.io + Browser Notifications across all dashboard pages
  useBusinessSocket();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden w-full transition-all">
        <Header toggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-surface-container-low custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <BusinessProvider>
        <DashboardContent>{children}</DashboardContent>
      </BusinessProvider>
    </Providers>
  );
}
