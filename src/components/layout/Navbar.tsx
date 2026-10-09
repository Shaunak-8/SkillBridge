import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function Navbar() {
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
          <Link href="/register" className="transition hover:text-[#D83D63]">
            For businesses
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link href="/login" className="hidden sm:block">
            <button className="inline-flex items-center justify-center rounded-xl border-2 border-[#111111] bg-white px-4 py-2 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] active:translate-x-[1px] active:translate-y-[1px] transition">
              Log in
            </button>
          </Link>
          <Link href="/register">
            <button className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-[#111111] bg-[#D83D63] px-4 py-2 text-xs font-bold text-white shadow-[3px_3px_0_#111111] hover:bg-[#C02C51] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#111111] transition">
              <span>Get started</span>
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
