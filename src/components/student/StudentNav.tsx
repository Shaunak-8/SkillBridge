'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  UserCheck,
} from 'lucide-react';
import { publicChatConfig } from '@/lib/chat/config';

const links = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/projects', label: 'Discover Projects', icon: FolderKanban },
  { href: '/student/applications', label: 'My Applications', icon: ClipboardCheck },
  { href: '/student/my-projects', label: 'Active Projects', icon: BriefcaseBusiness },
  { href: '/student/assessments', label: 'Assessments', icon: BarChart3 },
  { href: '/student/community', label: 'Student Community', icon: MessageSquare },
  { href: '/student/profile', label: 'My Profile & Portfolio', icon: UserCheck },
];

export function StudentNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const visibleLinks = publicChatConfig()
    ? [...links, { href: '/student/messages', label: 'Messages', icon: MessageSquare }]
    : links;

  return (
    <nav
      aria-label={mobile ? 'Mobile student navigation' : 'Student navigation'}
      className={mobile
        ? 'flex flex-wrap gap-2 border-b-2 border-[#111111] bg-[#F7F0D2] px-4 py-2.5 lg:hidden'
        : 'space-y-1.5'}
    >
      {visibleLinks.map(({ href, label, icon: Icon }) => {
        const active = pathname === href ||
          (href === '/student/projects' && pathname.startsWith('/student/projects/'));

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-10 items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all ${
              active
                ? 'border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[2px_2px_0_#111111]'
                : 'border-transparent text-[#151515] hover:border-[#111111] hover:bg-[#F7F0D2] hover:shadow-[2px_2px_0_#111111]'
            }`}
          >
            <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
