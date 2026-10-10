'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Search, Globe } from 'lucide-react';
import { Badge, Button, Card, Input, SectionTitle } from '@/components/ui';
import { SkillBadge } from '@/components/shared/ProjectCard';
import { EmptyState } from '@/components/ws5/parts';
import { useLanguage } from '@/lib/i18n/context';
import { getPretranslatedText } from '@/lib/i18n/pretranslated-briefs';

interface ProjectItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  required_skills: string[];
  remote_ok: boolean;
  location_text: string | null;
  timeline: string | null;
  compensation: string;
  published_at: string | null;
}

interface ProjectsBoardViewProps {
  initialData: {
    items: ProjectItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  categories: string[];
  q: string | null;
  category: string | null;
  skill: string | null;
  remoteRaw: string | null;
  page: number;
  pages: number;
}

export function ProjectsBoardView({
  initialData,
  categories,
  q,
  category,
  skill,
  remoteRaw,
  page,
  pages,
}: ProjectsBoardViewProps) {
  const { locale, t } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, { title: string; summary: string }>>(() => {
    if (locale === 'en') return {};
    const seeded: Record<string, { title: string; summary: string }> = {};
    for (const item of initialData.items) {
      const pTitle = getPretranslatedText(item.title, locale);
      const pSum = getPretranslatedText(item.summary, locale);
      if (pTitle || pSum) {
        seeded[item.id] = { title: pTitle || item.title, summary: pSum || item.summary };
      }
    }
    return seeded;
  });
  const [translating, setTranslating] = useState(false);

  // Auto-translate project cards when language changes away from English
  useEffect(() => {
    if (locale === 'en') {
      setTranslations({});
      return;
    }

    let active = true;
    const seeded: Record<string, { title: string; summary: string }> = {};
    for (const item of initialData.items) {
      const pTitle = getPretranslatedText(item.title, locale);
      const pSum = getPretranslatedText(item.summary, locale);
      if (pTitle || pSum) {
        seeded[item.id] = { title: pTitle || item.title, summary: pSum || item.summary };
      }
    }
    setTranslations(seeded);
    setTranslating(true);

    const translateItems = async () => {
      const newTranslations: Record<string, { title: string; summary: string }> = { ...seeded };
      for (const item of initialData.items) {
        try {
          const [tTitleRes, tSummaryRes] = await Promise.all([
            fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: item.title, targetLang: locale }),
            }),
            fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: item.summary, targetLang: locale }),
            }),
          ]);
          const tTitle = await tTitleRes.json();
          const tSummary = await tSummaryRes.json();
          newTranslations[item.id] = {
            title: tTitle.translated || tTitle.translatedText || item.title,
            summary: tSummary.translated || tSummary.translatedText || item.summary,
          };
        } catch {
          // Keep pretranslated or original on error
        }
      }
      if (active) {
        setTranslations(newTranslations);
        setTranslating(false);
      }
    };

    void translateItems();

    return () => {
      active = false;
    };
  }, [locale, initialData.items]);

  const href = (over: Record<string, string | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, category, skill, remote: remoteRaw, page: null, ...over })) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return s ? `/projects?${s}` : '/projects';
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      {/* Header Section */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#111111] bg-[#F2BE4E] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#151515] shadow-[2px_2px_0_#111111]">
          {t('project_board_eyebrow') !== 'project_board_eyebrow' ? t('project_board_eyebrow') : 'Project Board'}
        </div>
        <h1 className="mt-3 text-2xl sm:text-4xl font-black text-[#151515] tracking-tight">
          {t('project_board_title') !== 'project_board_title' ? t('project_board_title') : 'Find work that feels meaningful.'}
        </h1>
        <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-[#655F52] max-w-2xl">
          {t('project_board_desc') !== 'project_board_desc'
            ? t('project_board_desc')
            : 'Browse real challenges from local businesses. Every project is clearly scoped, skills-first and ready for curious collaborators.'}
        </p>

        {locale !== 'en' && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#111111] bg-white px-2.5 py-1 text-[11px] font-bold text-[#151515] shadow-[1.5px_1.5px_0_#111111]">
            <Globe size={13} className="text-[#D83D63]" />
            <span>{translating ? 'Translating projects...' : `Displaying in ${locale.toUpperCase()}`}</span>
          </div>
        )}
      </div>

      {/* Search & Filter Form */}
      <form
        method="get"
        action="/projects"
        className="mb-4 grid gap-3 rounded-2xl border-2 border-[#111111] bg-white p-4 shadow-[3px_3px_0_#111111] sm:grid-cols-[2fr_1fr_1fr_auto]"
      >
        {category && <input type="hidden" name="category" value={category} />}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-[#655F52]" size={17} />
          <Input
            name="q"
            defaultValue={q ?? ''}
            aria-label="Search projects"
            className="pl-10 text-xs sm:text-sm font-bold"
            placeholder={t('search_projects') !== 'search_projects' ? t('search_projects') : 'Search projects...'}
          />
        </div>
        <Input
          name="skill"
          defaultValue={skill ?? ''}
          aria-label="Filter by skill"
          placeholder={t('filter_by_skill') !== 'filter_by_skill' ? t('filter_by_skill') : 'Skill, e.g. React'}
          className="text-xs sm:text-sm font-bold"
        />
        <select
          name="remote"
          defaultValue={remoteRaw ?? ''}
          aria-label="Remote filter"
          className="rounded-xl border-2 border-[#111111] bg-white px-3 py-2 text-xs sm:text-sm font-bold text-[#151515]"
        >
          <option value="">{t('any_location') !== 'any_location' ? t('any_location') : 'Any location'}</option>
          <option value="true">{t('remote_ok') !== 'remote_ok' ? t('remote_ok') : 'Remote OK'}</option>
          <option value="false">{t('onsite_only') !== 'onsite_only' ? t('onsite_only') : 'On-site only'}</option>
        </select>
        <Button type="submit" className="text-xs font-black">
          {t('search_action') !== 'search_action' ? t('search_action') : 'Search'}
        </Button>
      </form>

      {/* Category Tabs */}
      <nav aria-label="Categories" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[null, ...categories].map((c) => (
          <Link
            key={c ?? 'all'}
            href={href({ category: c })}
            className={`whitespace-nowrap rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
              c === category
                ? 'border-[#111111] bg-[#F2BE4E] text-[#151515] shadow-[2px_2px_0_#111111]'
                : 'border-[#111111]/30 bg-white text-[#655F52] hover:border-[#111111] hover:text-[#151515]'
            }`}
          >
            {c ? (t(c) !== c ? t(c) : c) : (t('filter_all') !== 'filter_all' ? t('filter_all') : 'All')}
          </Link>
        ))}
      </nav>

      {/* Total Count */}
      <p className="mb-4 text-xs font-bold text-[#655F52]">
        {initialData.total}{' '}
        {t('opportunities_found') !== 'opportunities_found'
          ? t('opportunities_found')
          : initialData.total === 1
          ? 'opportunity found'
          : 'opportunities found'}
      </p>

      {/* Projects Grid */}
      {initialData.items.length === 0 ? (
        <EmptyState>
          {t('no_projects_match') !== 'no_projects_match'
            ? t('no_projects_match')
            : 'No projects match those filters yet.'}{' '}
          <Link href="/projects" className="font-bold text-[#D83D63] underline">
            {t('clear_filters') !== 'clear_filters' ? t('clear_filters') : 'Clear filters'}
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {initialData.items.map((p) => {
            const displayTitle = translations[p.id]?.title || p.title;
            const displaySummary = translations[p.id]?.summary || p.summary;
            const displayCategory = t(p.category) !== p.category ? t(p.category) : p.category;
            const displayLocation = p.location_text
              ? (t(p.location_text) !== p.location_text ? t(p.location_text) : p.location_text)
              : p.remote_ok
              ? t('remote_friendly')
              : t('location_flexible');

            return (
              <Card
                key={p.id}
                className="group flex h-full flex-col p-5 bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111] hover:shadow-[5px_5px_0_#111111] transition"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="rounded-lg border border-[#111111] bg-[#F2BE4E] px-2 py-0.5 text-xs font-black text-[#151515]">
                    {displayCategory}
                  </span>
                  {p.remote_ok && (
                    <span className="rounded-lg border border-[#111111] bg-[#dbf5ed] px-2 py-0.5 text-xs font-bold text-emerald-900">
                      {t('remote_ok')}
                    </span>
                  )}
                </div>

                <h2 className="text-base font-black text-[#151515] leading-snug group-hover:text-[#D83D63] transition">
                  {displayTitle}
                </h2>
                <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-[#655F52]">
                  {displaySummary}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(p.required_skills as string[]).slice(0, 4).map((s) => (
                    <SkillBadge key={s} name={s} />
                  ))}
                </div>

                <div className="mt-auto border-t-2 border-[#111111]/10 pt-4">
                  <span className="flex items-center gap-1 text-xs font-bold text-[#655F52]">
                    <MapPin size={14} />
                    {displayLocation}
                  </span>
                  <Link
                    href={`/projects/${p.id}`}
                    className="btn-press mt-3 inline-flex w-full items-center justify-between rounded-xl border-2 border-[#111111] bg-white px-3 py-2 text-xs font-black text-[#151515] shadow-[2px_2px_0_#111111] hover:bg-[#F2BE4E] transition"
                  >
                    <span>{t('view_project')}</span>
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4 text-xs font-black">
          {page > 1 ? (
            <Link
              href={href({ page: String(page - 1) })}
              className="rounded-lg border-2 border-[#111111] bg-white px-3 py-1 text-[#151515] shadow-[1.5px_1.5px_0_#111111] hover:bg-[#F7F0D2]"
            >
              {t('previous') !== 'previous' ? t('previous') : 'Previous'}
            </Link>
          ) : (
            <span className="text-[#655F52] opacity-50">Previous</span>
          )}
          <span className="text-[#655F52]">
            {t('page_x_of_y') !== 'page_x_of_y' ? t('page_x_of_y') : 'Page'} {page} / {pages}
          </span>
          {page < pages ? (
            <Link
              href={href({ page: String(page + 1) })}
              className="rounded-lg border-2 border-[#111111] bg-white px-3 py-1 text-[#151515] shadow-[1.5px_1.5px_0_#111111] hover:bg-[#F7F0D2]"
            >
              {t('next') !== 'next' ? t('next') : 'Next'}
            </Link>
          ) : (
            <span className="text-[#655F52] opacity-50">Next</span>
          )}
        </nav>
      )}
    </main>
  );
}
