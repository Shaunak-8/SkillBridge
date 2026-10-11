'use client';

import { useState } from "react";
import Link from "next/link";
import { Menu, Sparkles, X } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { NavAuth } from "./NavAuth";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "@/lib/i18n/context";

export function Navbar() {
  const { data } = authClient.useSession();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b-2 border-[#111111] bg-white sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-2.5 text-lg font-black tracking-tight text-[#151515]"
        >
          <span className="grid size-9 place-items-center rounded-lg border-2 border-[#111111] bg-[#D83D63] text-white shadow-[2px_2px_0_#111111]">
            <Sparkles size={18} strokeWidth={2.5} />
          </span>
          <span className="text-xl font-black">
            Skill<span className="text-[#D83D63]">Bridge</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-7 text-xs sm:text-sm font-bold text-[#151515] md:flex">
          <Link href="/projects" className="transition hover:text-[#D83D63]">
            {t('explore_projects')}
          </Link>
          <Link href="/community" className="transition hover:text-[#D83D63]">
            {t('community')}
          </Link>
          <Link href="/about" className="transition hover:text-[#D83D63]">
            {t('how_it_works')}
          </Link>
          {!data?.user && (
            <Link href="/register" className="transition hover:text-[#D83D63]">
              {t('for_businesses')}
            </Link>
          )}
        </nav>

        {/* Right actions: Language, Session Auth & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector />
          <NavAuth />

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="grid size-10 place-items-center rounded-lg border-2 border-[#111111] bg-white text-[#151515] shadow-[2px_2px_0_#111111] transition hover:bg-[#F7F0D2] active:translate-x-[1px] active:translate-y-[1px] md:hidden"
          >
            {mobileMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="border-t-2 border-[#111111] bg-[#F7F0D2] px-5 py-4 shadow-[0_4px_0_#111111] md:hidden">
          <nav className="flex flex-col gap-2 font-bold text-[#151515]">
            <Link
              href="/projects"
              onClick={closeMenu}
              className="flex items-center justify-between rounded-lg border-2 border-[#111111] bg-white px-4 py-2.5 text-sm shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E]"
            >
              <span>{t('explore_projects')}</span>
              <span className="text-xs text-[#655F52]">Browse</span>
            </Link>
            <Link
              href="/community"
              onClick={closeMenu}
              className="flex items-center justify-between rounded-lg border-2 border-[#111111] bg-white px-4 py-2.5 text-sm shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E]"
            >
              <span>{t('community')}</span>
              <span className="text-xs text-[#655F52]">Discussions</span>
            </Link>
            <Link
              href="/about"
              onClick={closeMenu}
              className="flex items-center justify-between rounded-lg border-2 border-[#111111] bg-white px-4 py-2.5 text-sm shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E]"
            >
              <span>{t('how_it_works')}</span>
              <span className="text-xs text-[#655F52]">Guide</span>
            </Link>
            {!data?.user && (
              <Link
                href="/register"
                onClick={closeMenu}
                className="flex items-center justify-between rounded-lg border-2 border-[#111111] bg-[#FCE8ED] px-4 py-2.5 text-sm text-[#D83D63] shadow-[2px_2px_0_#111111] hover:bg-[#D83D63] hover:text-white"
              >
                <span>{t('for_businesses')}</span>
                <span className="text-xs">Post brief</span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
