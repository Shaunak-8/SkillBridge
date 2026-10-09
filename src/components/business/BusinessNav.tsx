'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Sparkles, Settings } from 'lucide-react';
const links = [
  { href: '/business/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/business/projects/new', label: 'Post a Problem', icon: Sparkles },
  { href: '/business/projects', label: 'My Projects', icon: FolderKanban },
  { href: '/business/profile', label: 'Business Profile', icon: Settings },
];
export function BusinessNav({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return <nav aria-label={mobile ? 'Mobile business navigation' : 'Business navigation'} className={mobile ? 'flex flex-wrap gap-1 border-b border-line bg-white px-4 py-2 lg:hidden' : 'space-y-1'}>{links.map(({ href, label, icon: Icon }) => {
    const active = path === href || (href === '/business/projects' && path.startsWith('/business/projects/') && path !== '/business/projects/new');
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? 'bg-brand-soft text-brand-dark' : 'text-muted hover:bg-brand-soft hover:text-brand'}`}><Icon size={17} aria-hidden="true" />{label}</Link>;
  })}</nav>;
}
