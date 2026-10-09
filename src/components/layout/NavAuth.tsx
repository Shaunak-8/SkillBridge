"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, User } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui";

/** Header buttons that follow the session. The rest of the header stays static, so public pages can still be cached. */
export function NavAuth() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  async function signOut() {
    setLoggingOut(true);
    try {
      const result = await authClient.signOut();
      if (result?.error) throw new Error("Unable to sign out.");
      router.replace("/login");
      router.refresh();
    } catch { setLoggingOut(false); }
  }

  // Reserve the space while the session loads so the buttons do not flash or shift the layout.
  if (isPending) return <div aria-hidden className="h-10 w-48" />;
  if (data?.user) {
    // /auth/continue sends each account to its own dashboard (student, business or admin).
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/continue"><Button variant="ghost" className="gap-2"><User size={16} /><span className="hidden max-w-[10rem] truncate sm:inline">{data.user.name || "Dashboard"}</span></Button></Link>
        <Button variant="secondary" disabled={loggingOut} onClick={() => void signOut()} className="gap-1.5 text-xs"><LogOut size={14} />{loggingOut ? "Logging out…" : "Log out"}</Button>
      </div>
    );
  }
  return <div className="flex items-center gap-2"><Link href="/login" className="hidden sm:block"><Button variant="ghost">Log in</Button></Link><Link href="/register"><Button>Get started <ArrowRight size={15} /></Button></Link></div>;
}
