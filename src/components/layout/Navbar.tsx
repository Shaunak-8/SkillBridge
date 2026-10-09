'use client';

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { NavAuth } from "./NavAuth";

export function Navbar() {
  const { data } = authClient.useSession();
  return (
    <header className="border-b-2 border-[#111111] bg-white sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-black tracking-tight text-[#151515]">
          <span className="grid size-9 place-items-center rounded-lg border-2 border-[#111111] bg-[#D83D63] text-white shadow-[2px_2px_0_#111111]">
            <Sparkles size={18} strokeWidth={2.5} />
          </span>
          <span className="text-xl font-black">
            Skill<span className="text-[#D83D63]">Bridge</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-xs sm:text-sm font-bold text-[#151515] md:flex">
          <Link href="/projects" className="transition hover:text-[#D83D63]">
            Explore projects
          </Link>
          <Link href="/about" className="transition hover:text-[#D83D63]">
            How it works
          </Link>
          {!data?.user && (
            <Link href="/register" className="transition hover:text-[#D83D63]">
              For businesses
            </Link>
          )}
        </nav>

        <NavAuth />
      </div>
    </header>
  );
}
