import Link from "next/link";
import { BarChart3, BriefcaseBusiness, ClipboardCheck, FolderKanban, LayoutDashboard, Settings, Sparkles, UserCheck, Users } from "lucide-react";
import type { Role } from "@/types";
const links: Record<Role, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  student: [
    { href: "/student/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/student/profile", label: "Profile & Portfolio", icon: UserCheck },
    { href: "/student/projects", label: "Find projects", icon: FolderKanban },
    { href: "/student/applications", label: "Applications", icon: ClipboardCheck },
    { href: "/student/my-projects", label: "My projects", icon: BriefcaseBusiness },
    { href: "/student/assessments", label: "Assessments", icon: BarChart3 }
  ],
  business: [{ href: "/business/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/business/projects", label: "My projects", icon: FolderKanban }, { href: "/business/post-problem", label: "Post a problem", icon: Sparkles }, { href: "/business/screening", label: "AI screening", icon: ClipboardCheck }, { href: "/business/billing", label: "Billing", icon: BriefcaseBusiness }],
  admin: [{ href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard }, { href: "/admin/users", label: "Users", icon: Users }, { href: "/admin/projects", label: "Projects", icon: FolderKanban }],
};
export function Sidebar({ role }: { role: Role }) { return <aside className="hidden w-64 shrink-0 border-r border-line bg-white lg:block"><div className="sticky top-0 flex h-screen flex-col p-5"><Link href="/" className="mb-10 flex items-center gap-2 font-bold"><span className="grid size-8 place-items-center rounded-lg bg-brand text-white"><Sparkles size={15} /></span>skillbridge</Link><p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{role} workspace</p><nav className="space-y-1">{links[role].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-brand-soft hover:text-brand"><Icon size={17} />{label}</Link>)}</nav><div className="mt-auto rounded-2xl bg-brand-soft p-4"><p className="text-xs font-bold text-brand-dark">Demo workspace</p><p className="mt-1 text-xs leading-5 text-muted">You&apos;re exploring mock data. Supabase is ready to connect later.</p></div><Link href="/" className="mt-4 flex items-center gap-3 px-3 text-sm text-muted"><Settings size={16} />Back to home</Link></div></aside>; }
