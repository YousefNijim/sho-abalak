'use client';

import { BusinessProvider } from '@/components/BusinessProvider';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <BusinessProvider>
      <div className="flex h-screen bg-background">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex-1 flex flex-col overflow-hidden w-full transition-all">
          <Header toggleSidebar={() => setIsSidebarOpen(true)} />
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-surface-container-low custom-scrollbar">
            {children}
          </main>
        </div>
      </div>
    </BusinessProvider>
  );
}
