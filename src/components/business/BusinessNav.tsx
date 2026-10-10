'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Sparkles, Settings, Users, MessageSquare } from 'lucide-react';

const links = [
  { href: '/business/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/business/projects/new', label: 'Post a Problem', icon: Sparkles },
  { href: '/business/projects', label: 'My Projects', icon: FolderKanban },
  { href: '/community', label: 'Community', icon: MessageSquare },
  { href: '/business/screening', label: 'Find Students', icon: Users },
  { href: '/business/profile', label: 'Business Profile', icon: Settings },
];

export function BusinessNav({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();

  return (
    <nav
      aria-label={mobile ? 'Mobile business navigation' : 'Business navigation'}
      className={
        mobile
          ? 'flex flex-wrap gap-2 border-b-2 border-[#111111] bg-[#F7F0D2] px-4 py-2.5 lg:hidden'
          : 'space-y-1.5'
      }
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          path === href ||
          (href === '/business/projects' &&
            path.startsWith('/business/projects/') &&
            path !== '/business/projects/new');

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
