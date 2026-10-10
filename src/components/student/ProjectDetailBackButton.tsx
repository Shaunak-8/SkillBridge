'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface ProjectDetailBackButtonProps {
  href: string;
}

export function ProjectDetailBackButton({ href }: ProjectDetailBackButtonProps) {
  const { t } = useLanguage();

  return (
    <Link
      href={href}
      className="btn-press mb-8 inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-white px-3.5 py-2 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition"
    >
      <ArrowLeft size={14} /> {t('back_to_projects')}
    </Link>
  );
}
