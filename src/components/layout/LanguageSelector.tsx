'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Select Language"
        className={`btn-press inline-flex items-center gap-1.5 rounded-xl border-2 border-[#111111] bg-white font-black text-xs text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
        }`}
      >
        <Globe size={15} className="text-[#D83D63]" />
        <span className="font-extrabold">{language.nativeName}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border-2 border-[#111111] bg-white p-1.5 shadow-[4px_4px_0_#111111] z-50 focus:outline-none"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#655F52] border-b border-[#111111]/10 mb-1">
            Language / भाषा
          </div>
          <div className="space-y-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setLocale(lang.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-bold transition text-left ${
                    isSelected
                      ? 'bg-[#F2BE4E] text-[#151515] border border-[#111111]'
                      : 'text-[#151515] hover:bg-[#F7F0D2]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-black leading-tight">{lang.nativeName}</span>
                    <span className="text-[10px] text-[#655F52] font-semibold">{lang.name}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-[#151515] stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
