'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  IndianRupee,
  Layers,
  MapPin,
  Sparkles,
  Store,
  Users2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import { SkillBadge } from '@/components/shared/ProjectCard';
import { useTextToSpeech } from '@/lib/utils/speech';
import type { FullProjectDetail } from '@/lib/ws5/repo';
import { useLanguage } from '@/lib/i18n/context';
import { getPretranslatedText } from '@/lib/i18n/pretranslated-briefs';

interface StudentProjectDetailViewProps {
  project: FullProjectDetail;
}

export function StudentProjectDetailView({ project }: StudentProjectDetailViewProps) {
  const { locale, language, t } = useLanguage();
  const [showOriginal, setShowOriginal] = useState(false);
  const originalLang = project.preferredLanguage || 'en';

  const [activeTranslation, setActiveTranslation] = useState<{
    title?: string;
    summary?: string;
    problemStatement?: string;
    deliverables?: string[];
  } | null>(() => {
    if (locale !== originalLang) {
      const preTitle = getPretranslatedText(project.title, locale);
      const preSummary = getPretranslatedText(project.summary, locale);
      const preProblem = project.problemStatement ? getPretranslatedText(project.problemStatement, locale) : undefined;
      const preDelivs = project.deliverables?.map((d) => getPretranslatedText(d, locale) || d);
      if (preTitle || preSummary) {
        return {
          title: preTitle || project.title,
          summary: preSummary || project.summary,
          problemStatement: preProblem || project.problemStatement,
          deliverables: preDelivs || project.deliverables,
        };
      }
    }
    return null;
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();

  const handleTranslateBrief = async () => {
    if (activeTranslation) {
      setShowOriginal(!showOriginal);
      return;
    }

    setIsTranslating(true);
    try {
      const [tTitleRes, tSummaryRes, tProblemRes] = await Promise.all([
        fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: project.title, targetLang: locale, sourceLang: originalLang }),
        }),
        fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: project.summary, targetLang: locale, sourceLang: originalLang }),
        }),
        project.problemStatement
          ? fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: project.problemStatement, targetLang: locale, sourceLang: originalLang }),
            })
          : Promise.resolve(null),
      ]);

      const tTitleData = await tTitleRes.json();
      const tSummaryData = await tSummaryRes.json();
      const tProblemData = tProblemRes ? await tProblemRes.json() : null;

      // Deliverables translation
      let translatedDelivs: string[] | undefined = undefined;
      if (project.deliverables?.length) {
        const delivPromises = project.deliverables.map((d) =>
          fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: d, targetLang: locale, sourceLang: originalLang }),
          }).then((r) => r.json())
        );
        const delivResults = await Promise.all(delivPromises);
        translatedDelivs = delivResults.map((r) => r.translated || r.translatedText);
      }

      setActiveTranslation({
        title: tTitleData.translated || tTitleData.translatedText,
        summary: tSummaryData.translated || tSummaryData.translatedText,
        problemStatement: tProblemData?.translated || tProblemData?.translatedText,
        deliverables: translatedDelivs,
      });
      setShowOriginal(false);
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-translate project brief whenever the user selects a language different from English
  useEffect(() => {
    if (locale !== originalLang) {
      const preTitle = getPretranslatedText(project.title, locale);
      const preSummary = getPretranslatedText(project.summary, locale);
      const preProblem = project.problemStatement ? getPretranslatedText(project.problemStatement, locale) : undefined;
      const preDelivs = project.deliverables?.map((d) => getPretranslatedText(d, locale) || d);

      if (preTitle || preSummary) {
        setActiveTranslation({
          title: preTitle || project.title,
          summary: preSummary || project.summary,
          problemStatement: preProblem || project.problemStatement,
          deliverables: preDelivs || project.deliverables,
        });
        setShowOriginal(false);
      } else {
        setActiveTranslation(null);
      }
      void handleTranslateBrief();
    } else {
      setActiveTranslation(null);
      setShowOriginal(false);
    }
  }, [locale, originalLang, project]);

  // Toggle voice narration of the project brief
  const toggleAudio = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const isUsingTranslation = !showOriginal && activeTranslation;
      const tTitle = isUsingTranslation && activeTranslation?.title ? activeTranslation.title : project.title;
      const tSummary = isUsingTranslation && activeTranslation?.summary ? activeTranslation.summary : project.summary;
      const tProblem = isUsingTranslation && activeTranslation?.problemStatement ? activeTranslation.problemStatement : project.problemStatement;
      const tDelivs = isUsingTranslation && activeTranslation?.deliverables ? activeTranslation.deliverables : project.deliverables;

      const textToRead = [
        tTitle,
        `${t('project_goals')}: ${tSummary}`,
        tProblem ? `${t('the_problem')}: ${tProblem}` : '',
        tDelivs?.length ? `${t('expected_deliverables')}: ${tDelivs.join('. ')}` : '',
      ]
        .filter(Boolean)
        .join('. ');

      const voiceLang = isUsingTranslation ? locale : originalLang;
      speak(textToRead, voiceLang);
    }
  };

  const formattedDate = project.publishedAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : locale, { dateStyle: 'medium' }).format(new Date(project.publishedAt))
    : project.createdAt
    ? new Intl.DateTimeFormat(locale === 'en' ? 'en-IN' : locale, { dateStyle: 'medium' }).format(new Date(project.createdAt))
    : t('recently');

  const displayedTitle = showOriginal || !activeTranslation?.title ? project.title : activeTranslation.title;
  const displayedSummary = showOriginal || !activeTranslation?.summary ? project.summary : activeTranslation.summary;
  const displayedProblem = showOriginal || !activeTranslation?.problemStatement ? project.problemStatement : activeTranslation.problemStatement;
  const displayedDeliverables = showOriginal || !activeTranslation?.deliverables ? project.deliverables : activeTranslation.deliverables;

  const displayedCategory = project.category ? (t(project.category) !== project.category ? t(project.category) : project.category) : t('general_project');

  const displayedBusiness = project.businessName
    ? (t(project.businessName) !== project.businessName ? t(project.businessName) : project.businessName)
    : t('verified_local_business');

  const displayedBusinessType = project.businessType
    ? (t(project.businessType) !== project.businessType ? t(project.businessType) : project.businessType)
    : '';

  const displayedLocation = project.locationText
    ? (t(project.locationText) !== project.locationText ? t(project.locationText) : project.locationText)
    : project.businessLocation
    ? (t(project.businessLocation) !== project.businessLocation ? t(project.businessLocation) : project.businessLocation)
    : project.remoteOk
    ? t('remote_ok')
    : t('india');

  const displayedBudget = project.budgetLabel
    ? (t(project.budgetLabel) !== project.budgetLabel ? t(project.budgetLabel) : project.budgetLabel)
    : project.compensation === 'paid'
    ? t('paid_project')
    : project.compensation === 'negotiable'
    ? t('stipend_negotiable')
    : t('learning_project');

  const displayedTimeline = project.timeline
    ? (t(project.timeline) !== project.timeline ? t(project.timeline) : project.timeline)
    : t('flexible_duration');

  const displayedMode = project.mode === 'team' ? t('student_team_mode') : t('individual_builder_mode');

  return (
    <div className="space-y-6">
      {/* NeoFlux Project Header Card */}
      <Card className="p-6 sm:p-8 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
        {/* Meta badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#111111]/10 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-2.5 py-0.5 text-xs font-black text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
              {displayedCategory}
            </span>
            <Badge tone="green">{t('open_for_applications')}</Badge>
            {project.remoteOk && (
              <span className="rounded-lg border border-[#111111] bg-[#dbf5ed] px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                {t('remote_ok')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {locale !== originalLang && (
              <button
                type="button"
                onClick={handleTranslateBrief}
                disabled={isTranslating}
                className="btn-press inline-flex items-center gap-1.5 rounded-xl border-2 border-[#111111] bg-white px-3 py-1.5 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F7F0D2] transition"
              >
                <Globe size={14} className="text-[#D83D63]" />
                <span>
                  {isTranslating
                    ? t('loading')
                    : activeTranslation
                    ? showOriginal
                      ? `${language.name}`
                      : t('view_original')
                    : `${language.name} ${t('translate_to_lang')}`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleAudio}
              className="btn-press inline-flex items-center gap-1.5 rounded-xl border-2 border-[#111111] bg-[#F7F0D2] px-3 py-1.5 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E] transition"
              aria-label={isSpeaking ? t('stop_audio') : t('listen_to_brief')}
            >
              {isSpeaking ? <VolumeX size={14} className="text-[#D83D63]" /> : <Volume2 size={14} />}
              <span>{isSpeaking ? t('stop_audio') : t('listen_to_brief')}</span>
            </button>
          </div>
        </div>

        {/* Translation attribution banner */}
        {activeTranslation && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-[#111111]/20 bg-[#F7F0D2]/40 px-3 py-1.5 text-xs font-bold text-[#655F52]">
            <span>
              {showOriginal
                ? `Original: ${originalLang.toUpperCase()}`
                : `${t('translated_from')} English (${language.nativeName})`}
            </span>
            <button
              type="button"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-[#D83D63] underline hover:text-[#c22e53]"
            >
              {showOriginal ? `${language.name}` : t('view_original')}
            </button>
          </div>
        )}

        {/* Title & Summary */}
        <div className="mt-5">
          <h1 className="text-2xl sm:text-3xl font-black text-[#151515] tracking-tight">
            {displayedTitle}
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#655F52] font-medium">
            {displayedSummary}
          </p>
        </div>

        {/* Business details banner */}
        <div className="mt-6 flex flex-wrap items-center gap-y-2 gap-x-6 rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/40 p-4 text-xs font-bold text-[#151515] shadow-[2px_2px_0_#111111]">
          <div className="inline-flex items-center gap-2">
            <Store size={16} className="text-[#D83D63]" />
            <span>
              {t('posted_by')}{' '}
              <span className="font-black text-[#151515]">{displayedBusiness}</span>
              {displayedBusinessType ? ` (${displayedBusinessType})` : ''}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 text-[#655F52]">
            <MapPin size={15} />
            <span>{displayedLocation}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 text-[#655F52]">
            <Calendar size={15} />
            <span>{t('published_on')} {formattedDate}</span>
          </div>

          {originalLang !== 'en' && (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-[#111111] bg-white px-2 py-0.5 text-[11px] font-black text-[#151515]">
              <Globe size={13} className="text-[#D83D63]" />
              <span>Original Language: {originalLang.toUpperCase()}</span>
            </div>
          )}
        </div>
      </Card>

      {/* The Problem Statement */}
      {displayedProblem && (
        <Card className="p-6 sm:p-7 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
          <div className="flex items-center gap-2.5 border-b-2 border-[#111111]/10 pb-3">
            <div className="flex size-8 items-center justify-center rounded-lg border border-[#111111] bg-[#F2BE4E]">
              <Sparkles size={16} className="text-[#151515]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#151515]">{t('the_problem')}</h2>
              <p className="text-xs text-[#655F52]">{t('the_problem_sub')}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#151515] font-medium bg-[#F7F0D2]/25 p-4 rounded-xl border border-[#111111]/15">
            {displayedProblem}
          </p>
        </Card>
      )}

      {/* Expected Deliverables */}
      {displayedDeliverables && displayedDeliverables.length > 0 && (
        <Card className="p-6 sm:p-7 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
          <div className="flex items-center gap-2.5 border-b-2 border-[#111111]/10 pb-3">
            <div className="flex size-8 items-center justify-center rounded-lg border border-[#111111] bg-[#D83D63] text-white">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h2 className="text-base font-black text-[#151515]">{t('expected_deliverables')}</h2>
              <p className="text-xs text-[#655F52]">{t('deliverables_sub')}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {displayedDeliverables.map((deliv, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-xl border-2 border-[#111111] bg-[#F7F0D2]/30 p-3.5 text-xs sm:text-sm font-bold text-[#151515] shadow-[2px_2px_0_#111111]"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-[#111111] bg-[#F2BE4E] text-xs font-black">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{deliv}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Required Skills & Technologies */}
      {project.requiredSkills && project.requiredSkills.length > 0 && (
        <Card className="p-6 sm:p-7 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]">
          <div className="flex items-center gap-2.5 border-b-2 border-[#111111]/10 pb-3">
            <div className="flex size-8 items-center justify-center rounded-lg border border-[#111111] bg-[#F7F0D2]">
              <Layers size={16} className="text-[#151515]" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#151515]">{t('required_skills')}</h2>
              <p className="text-xs text-[#655F52]">{t('skills_sub')}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.requiredSkills.map((s) => (
              <SkillBadge key={s} name={s} />
            ))}
          </div>
        </Card>
      )}

      {/* Project Logistics: Compensation, Timeline, Mode */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border-2 border-[#111111] bg-white p-5 shadow-[3px_3px_0_#111111]">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#655F52]">
            <IndianRupee size={15} className="text-[#D83D63]" />
            <span>{t('compensation')}</span>
          </div>
          <p className="mt-2 text-base font-black text-[#151515]">
            {displayedBudget}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#655F52]">
            {t('agreed_with_business')}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-[#111111] bg-white p-5 shadow-[3px_3px_0_#111111]">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#655F52]">
            <Clock size={15} className="text-[#D83D63]" />
            <span>{t('timeline')}</span>
          </div>
          <p className="mt-2 text-base font-black text-[#151515]">
            {displayedTimeline}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#655F52]">
            {t('part_time_friendly')}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-[#111111] bg-white p-5 shadow-[3px_3px_0_#111111]">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#655F52]">
            <Users2 size={15} className="text-[#D83D63]" />
            <span>{t('project_mode')}</span>
          </div>
          <p className="mt-2 text-base font-black text-[#151515]">
            {displayedMode}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-[#655F52]">
            {t('direct_mentoring')}
          </p>
        </div>
      </div>
    </div>
  );
}
