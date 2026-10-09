import Link from "next/link";
import { Bell, Search } from "lucide-react";
import type { Role } from "@/types";
import { Input } from "@/components/ui";
import { Sidebar } from "./Sidebar";
export function DashboardLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar role={role} />
      <main className="min-w-0 flex-1">
        <div className="flex h-16 items-center justify-between border-b border-line bg-white px-5 sm:px-8">
          <div className="relative hidden w-72 sm:block">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <Input className="py-2 pl-9" placeholder="Search anything..." />
          </div>
          <div className="ml-auto flex items-center gap-4 text-muted">
            <Bell size={18} />
            <div className="flex items-center gap-2 border-l border-line pl-4">
              {role === "student" ? (
                <Link href="/student/profile" className="flex items-center gap-2 hover:opacity-85 transition">
                  <div className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">AM</div>
                  <span className="hidden text-sm font-semibold text-ink sm:block">Aarav Mehta</span>
                </Link>
              ) : (
                <>
                  <div className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">AM</div>
                  <span className="hidden text-sm font-semibold text-ink sm:block">{role === "business" ? "Green Leaf Café" : "Admin team"}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
