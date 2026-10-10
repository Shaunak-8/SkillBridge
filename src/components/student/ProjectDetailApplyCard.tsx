'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import { ApplyForm } from '@/components/ws5/actions';
import { useLanguage } from '@/lib/i18n/context';

interface ProjectDetailApplyCardProps {
  projectId: string;
  role: string | null;
  applied: boolean;
}

export function ProjectDetailApplyCard({ projectId, role, applied }: ProjectDetailApplyCardProps) {
  const { t } = useLanguage();

  return (
    <Card className="h-fit p-6 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111] lg:sticky lg:top-6">
      <h3 className="text-lg font-black text-[#151515]">{t('apply_to_project')}</h3>
      <p className="mb-4 mt-1 text-xs text-[#655F52]">
        {t('apply_note')}
      </p>

      {role === "student" ? (
        applied ? (
          <div
            role="status"
            className="rounded-xl border-2 border-[#111111] bg-[#dbf5ed] p-4 text-xs font-bold text-emerald-900 shadow-[2px_2px_0_#111111]"
          >
            {t('already_applied')}{" "}
            <Link href="/student/applications" className="font-black text-[#151515] underline block mt-1">
              {t('view_application_status')}
            </Link>
          </div>
        ) : (
          <ApplyForm projectId={projectId} />
        )
      ) : role ? (
        <div className="rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/50 p-4 text-xs font-bold text-[#655F52]">
          {t('students_only_apply')} {role}.
        </div>
      ) : (
        <>
          <Link
            href="/login"
            className="btn-press inline-flex w-full items-center justify-center rounded-xl border-2 border-[#111111] bg-[#D83D63] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#111111] hover:bg-[#c22e53] transition"
          >
            {t('sign_in_to_apply')}
          </Link>
          <p className="mt-3 text-center text-xs text-[#655F52]">
            {t('new_here')}{" "}
            <Link href="/register" className="font-bold text-[#D83D63] underline">
              {t('create_student_profile')}
            </Link>
          </p>
        </>
      )}
    </Card>
  );
}
