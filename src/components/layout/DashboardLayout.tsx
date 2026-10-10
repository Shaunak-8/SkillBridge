import { Bell, Search } from 'lucide-react';
import type { Role } from '@/types';
import { Sidebar } from './Sidebar';
import { AccountControls } from '@/components/auth/AccountControls';
import { requireRole } from '@/lib/auth/profile';
import { BusinessNav } from '@/components/business/BusinessNav';
import { ChatSessionGuard } from '@/components/chat/ChatSessionGuard';
import Link from 'next/link';
import { publicChatConfig } from '@/lib/chat/config';

export async function DashboardLayout({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const { profile } = await requireRole(role);

  return (
    <div className="flex min-h-screen bg-[#F7F0D2] bg-cream-grid text-[#151515]">
      <ChatSessionGuard />
      <Sidebar role={role} />
      <main className="min-w-0 flex-1">
        {/* Top bar with crisp 2px black border */}
        <div className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b-2 border-[#111111] bg-white px-5 py-3 sm:px-8">
          {role === 'business' ? (
            <div className="flex items-center gap-2">
              <span className="rounded-md border-[1.5px] border-[#111111] bg-[#F2BE4E] px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
                Business Hub
              </span>
              <span className="hidden font-black text-sm text-[#151515] sm:inline">
                SkillBridge Workspace
              </span>
            </div>
          ) : (
            <div className="relative hidden w-72 sm:block">
              <Search className="absolute left-3 top-2.5 text-[#151515]" size={15} />
              <input
                className="w-full rounded-xl border-2 border-[#111111] bg-[#F7F0D2] py-2 pl-9 pr-3 text-xs font-medium text-[#151515] placeholder:text-[#655F52] outline-none shadow-[2px_2px_0_#111111] focus:bg-white"
                placeholder="Search projects, skills..."
              />
            </div>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {role !== 'business' && (
              <button
                type="button"
                aria-label="Notifications"
                className="grid size-9 place-items-center rounded-lg border-2 border-[#111111] bg-white text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2]"
              >
                <Bell size={16} />
              </button>
            )}

            <div className="flex items-center gap-2 rounded-lg border-2 border-[#111111] bg-[#F7F0D2] px-2.5 py-1 shadow-[2px_2px_0_#111111]">
              <div className="grid size-6 place-items-center rounded border border-[#111111] bg-[#D83D63] text-[10px] font-black text-white">
                {profile.full_name?.slice(0, 2).toUpperCase() || 'SB'}
              </div>
              <span className="hidden sm:inline break-words text-xs font-bold text-[#151515]">
                {profile.full_name}
              </span>
            </div>

            <AccountControls />
          </div>
        </div>

        {/* Mobile Nav for Business */}
        {role === 'business' && <BusinessNav mobile />}

        {/* Main Content View */}
        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          {role === 'student' && publicChatConfig() && <Link href="/student/messages" className="mb-4 inline-block text-sm font-semibold text-brand lg:hidden">Messages</Link>}
          {children}
        </div>
      </main>
    </div>
  );
}
