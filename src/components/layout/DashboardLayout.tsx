import { Bell, Search } from 'lucide-react';
import type { Role } from '@/types';
import { Input } from '@/components/ui';
import { Sidebar } from './Sidebar';
import { AccountControls } from '@/components/auth/AccountControls';
import { requireRole } from '@/lib/auth/profile';

export async function DashboardLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  const { profile } = await requireRole(role);
  return <div className="flex min-h-screen bg-canvas"><Sidebar role={role} /><main className="min-w-0 flex-1"><div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-3 sm:px-8"><div className="relative hidden w-72 sm:block"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><Input className="py-2 pl-9" placeholder="Search anything..." /></div><div className="ml-auto flex flex-wrap items-center gap-4 text-muted"><Bell size={18} /><span className="text-sm font-semibold text-ink">{profile.full_name}</span><AccountControls /></div></div><div className="mx-auto max-w-7xl p-5 sm:p-8">{children}</div></main></div>;
}
