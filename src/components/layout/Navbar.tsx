'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth/client";

export function Navbar() {
  const router = useRouter();
  const { data } = authClient.useSession();
  const [profile, setProfile] = useState<{ role?: string; username?: string; full_name?: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (data?.user) {
      fetch('/api/profile')
        .then((res) => res.json())
        .then((json) => {
          if (json.profile) setProfile(json.profile);
        })
        .catch(() => {});
    } else {
      setProfile(null);
    }
  }, [data?.user]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      setProfile(null);
      router.replace('/login');
      router.refresh();
    } catch (e) {
      console.warn('Failed to log out:', e);
    } finally {
      setLoggingOut(false);
    }
  };

  const dashboardUrl = profile?.role === 'business'
    ? '/business/projects'
    : profile?.role === 'student'
    ? '/student/projects'
    : profile?.role === 'admin'
    ? '/admin/overview'
    : '/projects';

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-white">
            <Sparkles size={18} />
          </span>
          skill<span className="text-brand">bridge</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
          <Link href={profile?.role === 'student' ? '/student/projects' : '/projects'} className="hover:text-ink">
            Explore projects
          </Link>
          <Link href="/about" className="hover:text-ink">
            How it works
          </Link>
          {!data?.user && (
            <Link href="/register" className="hover:text-ink">
              For businesses
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {data?.user ? (
            <div className="flex items-center gap-3">
              <Link href={dashboardUrl}>
                <Button variant="ghost" className="gap-2 text-sm font-semibold">
                  <User size={16} />
                  <span>{profile?.full_name || data.user.name || 'Dashboard'}</span>
                </Button>
              </Link>
              <Button
                variant="secondary"
                disabled={loggingOut}
                onClick={() => void handleSignOut()}
                className="gap-1.5 text-xs"
              >
                <LogOut size={14} />
                <span>{loggingOut ? 'Logging out...' : 'Log out'}</span>
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/register">
                <Button>
                  Get started <ArrowRight size={15} />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
