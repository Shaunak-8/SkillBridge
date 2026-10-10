'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, SectionTitle } from '@/components/ui';
import { SkillBadge } from '@/components/shared/ProjectCard';
import { MapPin } from 'lucide-react';
import { useTextToSpeech } from '@/lib/utils/speech';

interface StudentProjectDetailViewProps {
  project: {
    id: string;
    title: string;
    summary: string;
    problemStatement: string | null;
    category: string;
    locationText?: string | null;
    remoteOk?: boolean;
    requiredSkills: string[];
    preferredLanguage?: string;
  };
}

export function StudentProjectDetailView({ project }: StudentProjectDetailViewProps) {
  // STRICT REQUIREMENT: Student side MUST default to English
  const [viewMode, setViewMode] = useState<'english' | 'local'>('english');
  const [englishTitle, setEnglishTitle] = useState(project.title);
  const [englishSummary, setEnglishSummary] = useState(project.summary);
  const [englishProblem, setEnglishProblem] = useState(project.problemStatement || '');
  const [isTranslatingToEnglish, setIsTranslatingToEnglish] = useState(false);

  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();
  const ownerLang = project.preferredLanguage || 'en';

  const translateToEnglish = useCallback(async () => {
    setIsTranslatingToEnglish(true);
    try {
      const [titleRes, summaryRes, problemRes] = await Promise.all([
        fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: project.title, targetLang: 'en' }) }).then(r => r.json()),
        fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: project.summary, targetLang: 'en' }) }).then(r => r.json()),
        project.problemStatement ? fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: project.problemStatement, targetLang: 'en' }) }).then(r => r.json()) : Promise.resolve({ translatedText: '' }),
      ]);

      if (titleRes?.translatedText) setEnglishTitle(titleRes.translatedText);
      if (summaryRes?.translatedText) setEnglishSummary(summaryRes.translatedText);
      if (problemRes?.translatedText) setEnglishProblem(problemRes.translatedText);
    } catch (e) {
      console.warn('Failed to translate project for student view:', e);
    } finally {
      setIsTranslatingToEnglish(false);
    }
  }, [project.problemStatement, project.summary, project.title]);

  // If the owner's preferred language is non-English, ensure English version is loaded for the student.
  useEffect(() => {
    if (ownerLang === 'en') return;
    const timer = window.setTimeout(() => void translateToEnglish(), 0);
    return () => window.clearTimeout(timer);
  }, [ownerLang, project.id, translateToEnglish]);

  const toggleAudio = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const textToRead = viewMode === 'local' ? (project.problemStatement || '') : englishProblem;
      const langToRead = viewMode === 'local' ? ownerLang : 'en';
      speak(textToRead, langToRead);
    }
  };

  const activeTitle = viewMode === 'english' ? englishTitle : project.title;
  const activeSummary = viewMode === 'english' ? englishSummary : project.summary;
  const activeProblem = viewMode === 'english' ? (isTranslatingToEnglish ? 'Translating to English...' : englishProblem) : (project.problemStatement || '');

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{project.category}</Badge>
          <Badge tone="green">Open</Badge>
          {project.remoteOk && <Badge tone="blue">Remote OK</Badge>}
        </div>

        {/* Student View Language Toggle Button - English is Default */}
        {ownerLang !== 'en' && (
          <div className="inline-flex rounded-xl border border-line bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('english')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'english' ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇬🇧 English (Default)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('local')}
              className={`rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'local' ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗣️ Spoken Language ({ownerLang.toUpperCase()})
            </button>
          </div>
        )}
      </div>

      <SectionTitle title={activeTitle} description={activeSummary} />
      
      <div className="flex flex-wrap items-center justify-between gap-5 border-y border-line py-5 text-sm text-muted">
        <span className="flex items-center gap-2">
          <MapPin size={16} />
          {project.locationText ?? (project.remoteOk ? 'Remote' : 'Location flexible')}
        </span>
        {activeProblem && (
          <button
            type="button"
            onClick={toggleAudio}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            <span>{isSpeaking ? '⏹️' : '🔊'}</span>
            {isSpeaking ? 'Stop Audio' : `Listen (${viewMode === 'local' ? ownerLang.toUpperCase() : 'English'})`}
          </button>
        )}
      </div>

      {activeProblem && (
        <>
          <div className="mt-9 flex items-center justify-between">
            <h2 className="text-lg font-bold">About the project</h2>
            {viewMode === 'local' && (
              <span className="text-xs text-brand font-medium bg-brand/10 px-2.5 py-1 rounded-full">
                Original Spoken Input from Shopkeeper ({ownerLang.toUpperCase()})
              </span>
            )}
          </div>
          <p className="mt-3 whitespace-pre-line leading-7 text-muted">{activeProblem}</p>
        </>
      )}

      {project.requiredSkills.length > 0 && (
        <>
          <h2 className="mt-9 text-lg font-bold">Skills we&apos;re looking for</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.requiredSkills.map((s) => (
              <SkillBadge key={s} name={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
