'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { languages, problemSchema, type BriefInput, type BusinessProject, type BusinessProfile } from '@/lib/business/contracts';
import { businessRequest, FormError } from '@/lib/business/client';
import { FormField, controlClass } from './FormField';
import { useSpeechToText, useTextToSpeech } from '@/lib/utils/speech';

export function ProblemForm({ business }: { business: BusinessProfile }) {
  const router = useRouter();
  const [problem, setProblem] = useState('');
  const [language, setLanguage] = useState(business.preferred_language || 'en');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const [viewMode, setViewMode] = useState<'original' | 'english'>('original');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const { isListening, isSupported: speechSupported, error: speechError, startListening, stopListening } = useSpeechToText({
    language,
    onTranscriptChange: (text) => {
      setProblem(text);
      setTranslatedText('');
    },
  });

  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();

  useEffect(() => {
    if (!problem) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [problem]);

  async function translateToEnglish() {
    if (!problem.trim() || translatedText) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: problem, targetLang: 'en', sourceLang: language }),
      });
      const data = await res.json();
      if (data?.translatedText) {
        setTranslatedText(data.translatedText);
      }
    } catch (e) {
      console.warn('Auto translation error:', e);
    } finally {
      setIsTranslating(false);
    }
  }

  const handleToggleView = (mode: 'original' | 'english') => {
    setViewMode(mode);
    if (mode === 'english' && !translatedText && problem) {
      void translateToEnglish();
    }
  };

  async function submit(generate: boolean) {
    if (isListening) stopListening();
    if (isSpeaking) stopSpeaking();
    const parsed = problemSchema.safeParse({ problem, preferred_language: language });
    setError(''); setFields({});
    if (!parsed.success) { setFields(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    setPending(generate ? 'generate' : 'draft');
    try {
      if (generate) {
        const project = await businessRequest<BusinessProject>('/api/business/generate', 'POST', parsed.data);
        setProblem(''); router.push(`/business/projects/${project.id}/edit`); router.refresh(); return;
      }
      const brief: BriefInput = {
        title: '', summary: '', problem_statement: parsed.data.problem, category: business.business_type,
        deliverables: [], required_skills: [], budget_label: '', timeline: '', preferred_language: language as any,
        location_text: business.location, remote_ok: false, mode: 'individual', compensation: 'negotiable',
      };
      const project = await businessRequest<BusinessProject>('/api/business/projects', 'POST', brief);
      setProblem(''); router.push(`/business/projects/${project.id}/edit`); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); if (error instanceof FormError) setFields(error.fields); }
    finally { setPending(''); }
  }

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleListenAloud = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const textToSpeak = viewMode === 'english' ? (translatedText || problem) : problem;
      const langToUse = viewMode === 'english' ? 'en' : language;
      speak(textToSpeak, langToUse);
    }
  };

  const displayedText = viewMode === 'english' ? (translatedText || (isTranslating ? 'Translating to English...' : problem)) : problem;

  return (
    <Card className="max-w-3xl p-5 sm:p-7">
      <form onSubmit={e => { e.preventDefault(); void submit(true); }} className="space-y-6" aria-busy={!!pending}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="problem" className="block text-sm font-semibold text-main">
              Describe your business problem
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {/* Original vs English Toggle */}
              {language !== 'en' && problem && (
                <div className="inline-flex rounded-lg border border-line bg-slate-100 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => handleToggleView('original')}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      viewMode === 'original' ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🗣️ Spoken ({language.toUpperCase()})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleView('english')}
                    className={`rounded-md px-2.5 py-1 transition-all ${
                      viewMode === 'english' ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌐 English {isTranslating && '...'}
                  </button>
                </div>
              )}

              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={!!pending}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    isListening
                      ? 'animate-pulse bg-red-600 text-white shadow-md'
                      : 'bg-brand-soft text-brand hover:bg-brand/10'
                  }`}
                  title={isListening ? 'Click to stop recording' : 'Click to dictate with voice'}
                >
                  <span className="text-sm">{isListening ? '🛑' : '🎙️'}</span>
                  {isListening ? 'Listening... (Tap to stop)' : 'Speak your problem'}
                </button>
              )}
              {problem && (
                <button
                  type="button"
                  onClick={toggleListenAloud}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  title="Listen to dictated text"
                >
                  <span>{isSpeaking ? '⏹️' : '🔊'}</span>
                  {isSpeaking ? 'Stop Audio' : 'Listen'}
                </button>
              )}
            </div>
          </div>

          <FormField name="problem" label="" error={fields.problem} hint="Tell us what happens today, what is difficult, and what you would like to improve. You can type or use voice.">
            <textarea
              id="problem"
              className={controlClass}
              rows={9}
              required
              minLength={10}
              maxLength={4000}
              value={displayedText}
              disabled={!!pending || viewMode === 'english'}
              aria-invalid={!!fields.problem}
              aria-describedby={`problem-hint${fields.problem ? ' problem-error' : ''}`}
              placeholder="अपनी व्यावसायिक समस्या का वर्णन करें... e.g. Our bakery receives many orders on WhatsApp, difficult to track."
              onChange={e => {
                if (viewMode === 'original') {
                  setProblem(e.target.value);
                  setTranslatedText('');
                }
              }}
            />
          </FormField>
          {speechError && <p className="text-xs text-amber-700">{speechError}</p>}
        </div>

        <FormField name="language" label="Preferred Language" hint="Choose your language for voice input and project brief.">
          <select
            id="language"
            className={controlClass}
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            disabled={!!pending}
          >
            {languages.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="rounded-xl bg-brand-soft p-4 text-sm leading-6 text-muted flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <strong>Multilingual Voice & AI:</strong> Select your language (e.g. Hindi), then speak or type. The AI will translate and build a project brief in your language!
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <p role="status" className="text-sm text-muted">{pending === 'generate' ? 'Creating your brief. Your problem stays here if this fails…' : pending ? 'Saving your draft…' : ''}</p>
        <div className="flex flex-wrap gap-3">
          <Button disabled={!!pending}>Generate Project Brief</Button>
          <Button type="button" variant="secondary" disabled={!!pending} onClick={() => void submit(false)}>Save problem and write a draft</Button>
        </div>
      </form>
    </Card>
  );
}

