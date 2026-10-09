"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui";

/** Header buttons that follow the session. The rest of the header stays static, so public pages can still be cached. */
export function NavAuth() {
  const { data, isPending } = authClient.useSession();
  // Reserve the space while the session loads so the buttons do not flash or shift the layout.
  if (isPending) return <div aria-hidden className="h-10 w-48" />;
  if (data?.user) {
    // /auth/continue sends each account to its own dashboard (student, business or admin).
    return <div className="flex items-center gap-2"><Link href="/auth/continue"><Button>Dashboard <ArrowRight size={15} /></Button></Link></div>;
  }
  return <div className="flex items-center gap-2"><Link href="/login" className="hidden sm:block"><Button variant="ghost">Log in</Button></Link><Link href="/register"><Button>Get started <ArrowRight size={15} /></Button></Link></div>;
}
