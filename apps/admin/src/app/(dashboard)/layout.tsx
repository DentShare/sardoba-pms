'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { AuthProvider } from '@/lib/auth/auth-context';
import { QueryProvider } from '@/lib/query-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <Sidebar />
        <div className="pl-[260px] min-h-screen transition-all duration-300">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}
