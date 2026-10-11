'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Sparkles, Settings } from 'lucide-react';
import type { Role } from '@/types';
import { BusinessNav } from '@/components/business/BusinessNav';
import { StudentNav } from '@/components/student/StudentNav';

export function MobileNavDrawer({ role }: { role: Role }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      {/* Menu Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        className="grid size-9 place-items-center rounded-lg border-2 border-[#111111] bg-white text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition-colors"
      >
        <Menu size={18} strokeWidth={2.5} />
      </button>

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Drawer */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="relative flex w-72 max-w-[85vw] flex-col border-r-2 border-[#111111] bg-white p-5 shadow-[6px_0_0_#111111] overflow-y-auto"
          >
            {/* Top Bar with Logo & Close Button */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-gray-100">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 font-black text-lg"
              >
                <span className="grid size-8 place-items-center rounded-lg border-2 border-[#111111] bg-[#D83D63] text-white shadow-[2px_2px_0_#111111]">
                  <Sparkles size={16} strokeWidth={2.5} />
                </span>
                <span className="text-lg">
                  Skill<span className="text-[#D83D63]">Bridge</span>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation menu"
                className="grid size-8 place-items-center rounded-lg border border-[#111111] hover:bg-[#F7F0D2]"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Role Workspace Pill */}
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-[#111111] bg-[#F7F0D2] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#151515] shadow-[1.5px_1.5px_0_#111111] self-start">
              <span className="size-1.5 rounded-full bg-[#D83D63]" />
              {role} workspace
            </div>

            {/* Navigation Links */}
            <div className="space-y-1 mb-6">
              {role === 'business' ? (
                <BusinessNav />
              ) : role === 'student' ? (
                <StudentNav />
              ) : null}
            </div>

            {/* Mode Card at Bottom */}
            <div className="mt-auto rounded-xl border-2 border-[#111111] bg-[#F7F0D2] p-4 shadow-[3px_3px_0_#111111]">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#151515]">
                <span className="size-2 rounded-full bg-[#D83D63]" />
                {role === 'business' ? 'Business Mode' : 'Student Mode'}
              </div>
              <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-[#655F52]">
                {role === 'business'
                  ? 'Turn real business problems into student deliverables.'
                  : 'Find local projects and build your verified portfolio.'}
              </p>
            </div>

            {/* Back to home */}
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="mt-3 flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs font-bold text-[#655F52] hover:text-[#151515]"
            >
              <Settings size={14} />
              Back to home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
