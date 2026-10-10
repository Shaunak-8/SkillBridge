'use client';

import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import type { Role } from "@/types";
import { BusinessNav } from "@/components/business/BusinessNav";
import { useLanguage } from "@/lib/i18n/context";

export function Sidebar({ role }: { role: Role }) {
  const { t } = useLanguage();

  const links: Record<Role, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
    student: [
      { href: "/student/dashboard", label: t('nav_overview'), icon: LayoutDashboard },
      { href: "/student/projects", label: t('nav_discover_projects'), icon: FolderKanban },
      { href: "/community", label: t('community'), icon: MessageSquare },
      { href: "/student/applications", label: t('nav_my_applications'), icon: ClipboardCheck },
      { href: "/student/my-projects", label: t('nav_active_projects'), icon: BriefcaseBusiness },
      { href: "/student/assessments", label: "Assessments", icon: BarChart3 },
      { href: "/student/profile", label: t('nav_profile_portfolio'), icon: UserCheck },
    ],
    business: [
      { href: "/business/dashboard", label: t('nav_overview'), icon: LayoutDashboard },
      { href: "/business/projects/new", label: t('nav_create_project'), icon: Sparkles },
      { href: "/business/projects", label: t('nav_my_projects'), icon: FolderKanban },
      { href: "/community", label: t('community'), icon: MessageSquare },
      { href: "/business/screening", label: t('nav_find_students'), icon: Users },
      { href: "/business/profile", label: t('nav_business_profile'), icon: Settings },
    ],
    admin: [
      { href: "/admin/dashboard", label: t('nav_overview'), icon: LayoutDashboard },
      { href: "/community", label: t('community'), icon: MessageSquare },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    ],
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r-2 border-[#111111] bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col p-5">
        <Link href="/" className="mb-8 flex items-center gap-2.5 font-black text-lg">
          <span className="grid size-9 place-items-center rounded-lg border-2 border-[#111111] bg-[#D83D63] text-white shadow-[2px_2px_0_#111111]">
            <Sparkles size={17} strokeWidth={2.5} />
          </span>
          <span className="text-xl">
            Skill<span className="text-[#D83D63]">Bridge</span>
          </span>
        </Link>

        <div className="mb-4 inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111111] bg-[#F7F0D2] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
          <span className="size-1.5 rounded-full bg-[#D83D63]" />
          {role} workspace
        </div>

        {role === "business" ? (
          <BusinessNav />
        ) : (
          <nav className="space-y-1.5">
            {links[role].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2 text-xs font-bold text-[#151515] transition-all hover:border-[#111111] hover:bg-[#F7F0D2] hover:shadow-[2px_2px_0_#111111]"
              >
                <Icon size={16} strokeWidth={2.2} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        )}

        <div className="mt-auto rounded-xl border-2 border-[#111111] bg-[#F7F0D2] p-4 shadow-[3px_3px_0_#111111]">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#151515]">
            <span className="size-2 rounded-full bg-[#D83D63]" />
            {role === "business" ? "Business Mode" : "Student Mode"}
          </div>
          <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[#655F52]">
            {role === "business"
              ? "Turn real business problems into student deliverables."
              : "Find local projects and build your verified portfolio."}
          </p>
        </div>

        <Link
          href="/"
          className="mt-3 flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs font-bold text-[#655F52] hover:text-[#151515]"
        >
          <Settings size={14} />
          Back to home
        </Link>
      </div>
    </aside>
  );
}
