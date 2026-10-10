'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Sparkles, Settings, Users, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { publicChatConfig } from '@/lib/chat/config';

export function BusinessNav({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  const { t } = useLanguage();

  const baseLinks = [
    { href: '/business/dashboard', label: t('nav_overview'), icon: LayoutDashboard },
    { href: '/business/projects/new', label: t('nav_create_project'), icon: Sparkles },
    { href: '/business/projects', label: t('nav_my_projects'), icon: FolderKanban },
    { href: '/business/community', label: t('community'), icon: MessageSquare },
    { href: '/business/screening', label: t('nav_find_students'), icon: Users },
    { href: '/business/profile', label: t('nav_business_profile'), icon: Settings },
  ];

  const visibleLinks = publicChatConfig()
    ? [...baseLinks, { href: '/business/messages', label: t('messages') !== 'messages' ? t('messages') : 'Messages', icon: MessageSquare }]
    : baseLinks;

  return (
    <nav
      aria-label={mobile ? 'Mobile business navigation' : 'Business navigation'}
      className={
        mobile
          ? 'flex flex-wrap gap-2 border-b-2 border-[#111111] bg-[#F7F0D2] px-4 py-2.5 lg:hidden'
          : 'space-y-1.5'
      }
    >
      {visibleLinks.map(({ href, label, icon: Icon }) => {
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
