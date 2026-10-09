'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { briefSchema, publicationIssues, type BriefInput, type BusinessProject } from '@/lib/business/contracts';
import { businessRequest, FormError } from '@/lib/business/client';
import { FormField, controlClass } from './FormField';
import { useSpeechToText, useTextToSpeech } from '@/lib/utils/speech';

function briefOf(project: BusinessProject): BriefInput {
  return { title: project.title, summary: project.summary, problem_statement: project.problem_statement, category: project.category,
    deliverables: project.deliverables, required_skills: project.required_skills, budget_label: project.budget_label,
    timeline: project.timeline ?? '', preferred_language: 'en', location_text: project.location_text ?? '',
    remote_ok: project.remote_ok, mode: project.mode, compensation: project.compensation };
}

const UI_LABELS: Record<string, {
  cardTitle: string;
  subTitle: string;
  chips: string[];
  placeholder: string;
  button: string;
  asking: string;
}> = {
  hi: {
    cardTitle: 'एआई से पूछें और ब्रिफ बदलें',
    subTitle: 'कोई शब्द समझ नहीं आया? या बदलाव करना चाहते हैं? अपनी भाषा में सवाल पूछें या बोलकर बताएं।',
    chips: ['तकनीकी शब्दों को समझें', 'आवश्यकताओं को सरल बनाएं', 'बजट या समयसीमा बदलें', 'छात्र कैसे मदद करेंगे?'],
    placeholder: "सवाल पूछें या बदलाव बताएं (उदा. 'व्हाट्सऐप की जरूरत हटाएं')...",
    button: 'सवाल पूछें',
    asking: 'पूछ रहे हैं...',
  },
  mr: {
    cardTitle: 'AI ला विचारा आणि प्रोजेक्ट सुधारणा करा',
    subTitle: 'काही शब्द समजला नाही? किंवा बदल करायचा आहे? आपल्या मराठी भाषेत विचारा किंवा बोला.',
    chips: ['तांत्रिक शब्द समजून घ्या', 'गरजा सोप्या करा', 'बजेट किंवा वेळ बदला', 'विद्यार्थी कशी मदत करतील?'],
    placeholder: "प्रश्न विचारा किंवा बदल सांगा (उदा. 'व्हॉट्सअॅपची गरज काढा')...",
    button: 'AI ला विचारा',
    asking: 'विचारत आहे...',
  },
  es: {
    cardTitle: 'Pregunta a IA y Personaliza',
    subTitle: '¿No entiendes un término? ¿Quieres cambiar algo? Pregunta o habla en tu idioma.',
    chips: ['Explicar términos técnicos', 'Simplificar requisitos', 'Cambiar presupuesto o plazo', '¿Cómo ayudarán los estudiantes?'],
    placeholder: "Haz una pregunta o describe un cambio...",
    button: 'Preguntar a IA',
    asking: 'Preguntando...',
  },
  en: {
    cardTitle: 'Ask AI & Customize Brief',
    subTitle: "Don't understand a term? Want to change something? Ask questions or speak your changes in plain English.",
    chips: ['Explain technical terms', 'Simplify requirements', 'Change budget or timeline', 'How will students help?'],
    placeholder: "Ask a question or describe a change (e.g. 'Remove WhatsApp requirement')...",
    button: 'Ask AI',
    asking: 'Asking...',
  },
};

export function BriefEditor({ initial, editing = false }: { initial: BusinessProject; editing?: boolean }) {
  const [project, setProject] = useState(initial);
  const [form, setForm] = useState(briefOf(initial));
  const [deliverables, setDeliverables] = useState(initial.deliverables.join('\n'));
  const [skills, setSkills] = useState(initial.required_skills.join('\n'));
  const [answers, setAnswers] = useState<Record<string, string>>(Object.fromEntries(initial.questions.map(q => [q.id, q.answer ?? ''])));
  const [dirty, setDirty] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  // AI Assistant & Speech state
  const [aiQuery, setAiQuery] = useState('');
  const [aiPending, setAiPending] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiResponseEnglish, setAiResponseEnglish] = useState<string | null>(null);
  const [aiResponseView, setAiResponseView] = useState<'local' | 'english'>('local');
  const [suggestedBrief, setSuggestedBrief] = useState<Partial<BriefInput> | null>(null);

  // Brief Form Language View Toggle (English vs Local)
  const [briefViewMode, setBriefViewMode] = useState<'english' | 'local'>('local');
  const [englishFieldsCache, setEnglishFieldsCache] = useState<Record<string, string>>({});
  const [localFieldsCache, setLocalFieldsCache] = useState<Record<string, string>>({});
  const [isTranslatingBrief, setIsTranslatingBrief] = useState(false);

  const { isListening, isSupported: speechSupported, startListening, stopListening } = useSpeechToText({
    language: form.preferred_language,
    onTranscriptChange: (text) => setAiQuery(text),
  });

  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();

  const editable = project.status === 'draft';
  const confirmationValid = project.owner_confirmed && project.confirmed_version === project.brief_version && project.questions.every(q => !q.required || !!q.answer?.trim());
  const editingFields = editable && editing;
  const input = { ...form, deliverables: deliverables.split('\n').map(s => s.trim()).filter(Boolean), required_skills: skills.split('\n').map(s => s.trim()).filter(Boolean) };
  const issues = publicationIssues(input);

  const activeLang = form.preferred_language || 'en';
  const labels = UI_LABELS[activeLang] || UI_LABELS.en;

  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);

  // Translate brief fields on language toggle
  useEffect(() => {
    if (briefViewMode === 'english' && activeLang !== 'en' && !englishFieldsCache.title) {
      void translateFieldsTo('en');
    } else if (briefViewMode === 'local' && activeLang !== 'en' && !localFieldsCache.title) {
      void translateFieldsTo(activeLang);
    }
  }, [briefViewMode, activeLang]);

  async function translateFieldsTo(targetLang: string) {
    if (isTranslatingBrief) return;
    setIsTranslatingBrief(true);
    try {
      const [titleRes, summaryRes, problemRes] = await Promise.all([
        fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: form.title, targetLang }) }).then(r => r.json()),
        fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: form.summary, targetLang }) }).then(r => r.json()),
        fetch('/api/ai/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: form.problem_statement, targetLang }) }).then(r => r.json()),
      ]);

      const translated = {
        title: titleRes.translatedText || form.title,
        summary: summaryRes.translatedText || form.summary,
        problem_statement: problemRes.translatedText || form.problem_statement,
      };

      if (targetLang === 'en') {
        setEnglishFieldsCache(translated);
      } else {
        setLocalFieldsCache(translated);
      }
    } catch (err) {
      console.warn('Field translation error:', err);
    } finally {
      setIsTranslatingBrief(false);
    }
  }

  function update<K extends keyof BriefInput>(key: K, value: BriefInput[K]) { 
    setForm({ ...form, [key]: value }); 
    setDirty(true); 
    setConfirmed(false); 
    setMessage(''); 
    setEnglishFieldsCache({});
    setLocalFieldsCache({});
  }

  async function askAiAssistant(queryToUse?: string) {
    const q = (queryToUse || aiQuery).trim();
    if (!q) return;
    if (isListening) stopListening();
    setAiPending(true);
    setAiResponse(null);
    setAiResponseEnglish(null);
    setSuggestedBrief(null);
    try {
      const res = await businessRequest<{ explanation: string; explanationEnglish?: string; updatedBrief?: Partial<BriefInput>; changesMade: boolean }>(
        '/api/business/refine',
        'POST',
        { projectId: project.id, userQuery: q, currentBrief: form }
      );
      setAiResponse(res.explanation);
      setAiResponseEnglish(res.explanationEnglish || res.explanation);
      if (res.updatedBrief) {
        setSuggestedBrief(res.updatedBrief);
      }
      speak(res.explanation, form.preferred_language);
    } catch (err) {
      setAiResponse(err instanceof Error ? err.message : 'Could not contact AI assistant. Please try again.');
    } finally {
      setAiPending(false);
    }
  }

  function applySuggestedBrief() {
    if (!suggestedBrief) return;
    const merged = { ...form, ...suggestedBrief };
    setForm(merged);
    if (suggestedBrief.deliverables) {
      setDeliverables(suggestedBrief.deliverables.join('\n'));
    }
    if (suggestedBrief.required_skills) {
      setSkills(suggestedBrief.required_skills.join('\n'));
    }
    setDirty(true);
    setConfirmed(false);
    setSuggestedBrief(null);
    setEnglishFieldsCache({});
    setLocalFieldsCache({});
    setMessage('Applied AI modifications. Save your draft to confirm them.');
  }

  const toggleListenSummary = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const isLocal = briefViewMode === 'local' && activeLang !== 'en';
      const titleVal = isLocal ? (localFieldsCache.title || form.title) : (englishFieldsCache.title || form.title);
      const summaryVal = isLocal ? (localFieldsCache.summary || form.summary) : (englishFieldsCache.summary || form.summary);
      const textToRead = `Project Title: ${titleVal}. Summary: ${summaryVal}`;
      const langToRead = isLocal ? activeLang : 'en';
      speak(textToRead, langToRead);
    }
  };

  async function act(action: 'save' | 'confirm' | 'publish' | 'regenerate') {
    setMessage(''); setFailed(false); setFields({});
    const parsed = briefSchema.safeParse(input);
    if (!parsed.success) { setFailed(true); setMessage('Please check the highlighted fields.'); setFields(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    if (action === 'regenerate' && dirty && !window.confirm('Creating another brief may replace your unsaved edits. Continue?')) return;
    setPending(action);
    try {
      if (action === 'regenerate') {
        const generated = await businessRequest<BusinessProject>('/api/business/generate', 'POST', { problem: form.problem_statement, preferred_language: form.preferred_language, project_id: project.id, brief_version: project.brief_version });
        setProject(generated); setForm(briefOf(generated)); setDeliverables(generated.deliverables.join('\n')); setSkills(generated.required_skills.join('\n')); setAnswers(Object.fromEntries(generated.questions.map(q => [q.id,q.answer ?? '']))); setDirty(false); setConfirmed(false); setEnglishFieldsCache({}); setLocalFieldsCache({});
        setMessage('A new draft is saved. Review the brief and questions before confirming.'); return;
      }
      if (action === 'confirm') {
        let version = project.brief_version;
        for (const question of project.questions) {
          const answer = answers[question.id]?.trim();
          if (!answer || answer === question.answer?.trim()) continue;
          const saved = await businessRequest<{ briefVersion: number }>(`/api/projects/${project.id}/answers`, 'POST', { questionId: question.id, answerText: answer, briefVersion: version },false);
          version = saved.briefVersion;
          setProject(previous => ({ ...previous, brief_version: saved.briefVersion, owner_confirmed: false, confirmed_version: null }));
        }
        await businessRequest(`/api/projects/${project.id}/confirm`, 'POST', { briefVersion: version });
        const next = await businessRequest<BusinessProject>(`/api/business/projects/${project.id}`, 'GET');
        setProject(next); setAnswers(Object.fromEntries(next.questions.map(q => [q.id,q.answer ?? '']))); setConfirmed(false); setMessage('These details are confirmed. You can publish this version.'); return;
      }
      if (action === 'publish') await businessRequest(`/api/projects/${project.id}`, 'PATCH', { status: 'published', briefVersion: project.brief_version }, false);
      else await businessRequest(`/api/business/projects/${project.id}`, 'PATCH', { ...parsed.data, brief_version: project.brief_version });
      const next = await businessRequest<BusinessProject>(`/api/business/projects/${project.id}`, 'GET');
      setProject(next); setForm(briefOf(next)); setDeliverables(next.deliverables.join('\n')); setSkills(next.required_skills.join('\n')); setDirty(false); setConfirmed(false);
      setMessage(action === 'save' ? 'Your draft is saved. Please confirm these details before publishing.' : 'Your project is published!');
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Please try again.'); if (error instanceof FormError) setFields(error.fields); }
    finally { setPending(''); }
  }

  const isLocalView = briefViewMode === 'local' && activeLang !== 'en';
  const isEnglishView = briefViewMode === 'english' && activeLang !== 'en';

  const field = (name: 'title' | 'summary' | 'problem_statement' | 'category' | 'budget_label' | 'timeline' | 'location_text', label: string, rows?: number) => {
    const val = isLocalView
      ? (localFieldsCache[name] || form[name])
      : isEnglishView
      ? (englishFieldsCache[name] || form[name])
      : form[name];
    return (
      <FormField key={name} name={name} label={label} error={fields[name]}>
        {editingFields ? (
          rows ? (
            <textarea
              id={name}
              className={controlClass}
              rows={rows}
              disabled={!!pending}
              value={val}
              aria-invalid={!!fields[name]}
              aria-describedby={fields[name] ? `${name}-error` : undefined}
              onChange={e => update(name, e.target.value)}
            />
          ) : (
            <input
              id={name}
              className={controlClass}
              disabled={!!pending}
              value={val}
              aria-invalid={!!fields[name]}
              aria-describedby={fields[name] ? `${name}-error` : undefined}
              onChange={e => update(name, e.target.value)}
            />
          )
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted">{val || 'Not added yet'}</p>
        )}
      </FormField>
    );
  };

  // Localized suggestion chips for Ask AI
  const localizedChips = form.preferred_language === 'hi'
    ? ["तकनीकी शब्दों को समझें", "आवश्यकताओं को सरल बनाएं", "बजट या समयसीमा बदलें", "छात्र कैसे मदद करेंगे?"]
    : ["Explain technical terms", "Simplify requirements", "Change budget or timeline", "How will students help?"];

  const localizedPlaceholder = form.preferred_language === 'hi'
    ? "सवाल पूछें या बदलाव बताएं (उदा. 'व्हाट्सऐप की आवश्यकता हटाएं')..."
    : "Ask a question or describe a change (e.g. 'Remove WhatsApp requirement')...";

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={editable ? 'amber' : 'purple'}>{project.status.replaceAll('_', ' ')}</Badge>
        <span className="text-sm text-muted">Version {project.brief_version}{dirty ? ' · Unsaved changes' : project.owner_confirmed ? ' · Details confirmed' : ' · Review needed'}</span>
        
        {/* Voice Read Aloud Button */}
        <button
          type="button"
          onClick={toggleListenSummary}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          title="Listen to project brief audio"
        >
          <span>{isSpeaking ? '⏹️' : '🔊'}</span>
          {isSpeaking ? 'Stop Audio' : 'Listen to Brief'}
        </button>

        <Link href="/business/projects" className="ml-auto inline-flex min-h-11 items-center text-sm font-semibold text-brand" onClick={e => { if (dirty && !window.confirm('Your edits are not saved. Leave this page?')) e.preventDefault(); }}>Back to my projects</Link>
      </div>

      {!editable && <Link href={`/business/projects/${project.id}/applications`} className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">Review applications ({project.application_count})</Link>}
      
      {/* Interactive AI Assistant & Refinement Card */}
      {editable && (
        <Card className="border-2 border-brand/20 bg-brand-soft/30 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 text-brand font-bold text-base">
            <span className="text-xl">🤖</span>
            <span>{form.preferred_language === 'hi' ? 'एआई से पूछें और ब्रिफ बदलें' : 'Ask AI & Customize Brief'}</span>
            <span className="ml-auto text-xs font-normal bg-brand/10 text-brand px-2.5 py-0.5 rounded-full">Voice & Text Powered</span>
          </div>
          <p className="text-xs leading-5 text-muted">
            {form.preferred_language === 'hi'
              ? 'कोई शब्द समझ नहीं आया? या बदलाव करना चाहते हैं? अपनी भाषा में सवाल पूछें या बोलकर बताएं।'
              : "Don't understand a term? Want to change something? Ask questions or speak your changes in plain English."}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {localizedChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setAiQuery(chip);
                  void askAiAssistant(chip);
                }}
                className="text-xs bg-white hover:bg-brand-soft border border-line rounded-full px-3 py-1 text-slate-700 transition-colors"
              >
                💡 {chip}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder={localizedPlaceholder}
              className={controlClass}
              disabled={aiPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void askAiAssistant();
                }
              }}
            />
            {speechSupported && (
              <button
                type="button"
                onClick={() => (isListening ? stopListening() : startListening())}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isListening ? 'animate-pulse bg-red-600 text-white' : 'bg-white border border-line text-slate-700 hover:bg-slate-50'
                }`}
                title={isListening ? 'Stop listening' : 'Dictate question with voice'}
              >
                {isListening ? '🛑' : '🎙️'}
              </button>
            )}
            <Button
              type="button"
              disabled={aiPending || !aiQuery.trim()}
              onClick={() => void askAiAssistant()}
            >
              {aiPending ? 'Asking...' : (form.preferred_language === 'hi' ? 'सवाल पूछें' : 'Ask AI')}
            </Button>
          </div>

          {aiResponse && (
            <div className="mt-3 rounded-xl bg-white border border-line p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💬</span>
                  <span className="text-xs font-semibold text-slate-500">AI Response</span>
                </div>
                
                {/* Language Toggle Pill for AI Response */}
                {form.preferred_language !== 'en' && aiResponseEnglish && (
                  <div className="inline-flex rounded-lg border border-line bg-slate-100 p-0.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setAiResponseView('local')}
                      className={`rounded-md px-2 py-0.5 transition-all ${
                        aiResponseView === 'local' ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-600'
                      }`}
                    >
                      🗣️ Local ({form.preferred_language.toUpperCase()})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiResponseView('english')}
                      className={`rounded-md px-2 py-0.5 transition-all ${
                        aiResponseView === 'english' ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-600'
                      }`}
                    >
                      🌐 English
                    </button>
                  </div>
                )}
              </div>

              <div className="text-sm leading-6 text-slate-800 font-medium">
                {aiResponseView === 'english' ? (aiResponseEnglish || aiResponse) : aiResponse}
              </div>

              {suggestedBrief && (
                <div className="pt-2 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-brand font-semibold">✨ AI generated customized updates for your brief</span>
                  <Button type="button" variant="secondary" onClick={applySuggestedBrief}>
                    Apply Changes to Brief
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Brief Form Card Header with Language Toggle */}
      <Card className="p-5 sm:p-7 space-y-6">
        {form.preferred_language !== 'en' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <span>🌐 Brief Language View:</span>
              {isTranslatingBrief && <span className="text-brand animate-pulse">Translating fields...</span>}
            </div>
            <div className="inline-flex rounded-lg border border-line bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setBriefViewMode('local')}
                className={`rounded-md px-3 py-1 transition-all ${
                  briefViewMode === 'local' ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🗣️ Local ({form.preferred_language.toUpperCase()})
              </button>
              <button
                type="button"
                onClick={() => setBriefViewMode('english')}
                className={`rounded-md px-3 py-1 transition-all ${
                  briefViewMode === 'english' ? 'bg-white text-brand shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); void act('save'); }} className="space-y-6" aria-busy={!!pending}>
        {field('title', 'Project title')}{field('problem_statement', 'The problem', 5)}{field('summary', 'Project goals', 4)}
        {(['deliverables', 'required_skills'] as const).map(name => <FormField key={name} name={name} label={name === 'deliverables' ? 'Expected deliverables' : 'Required skills'} hint={editingFields ? 'Put each item on a new line.' : undefined} error={fields[name]}>
          {editingFields ? <textarea id={name} className={controlClass} rows={4} disabled={!!pending} value={name === 'deliverables' ? deliverables : skills} aria-invalid={!!fields[name]} aria-describedby={`${name}-hint${fields[name] ? ` ${name}-error` : ''}`} onChange={e => { (name === 'deliverables' ? setDeliverables : setSkills)(e.target.value); setDirty(true); setConfirmed(false); }} /> : <ul className="list-inside list-disc break-words text-sm leading-7 text-muted">{input[name].length ? input[name].map((item, i) => <li key={i}>{item}</li>) : <li>Not added yet</li>}</ul>}
        </FormField>)}
        <div className="grid gap-6 sm:grid-cols-2">{field('category', 'Category')}{field('location_text', 'Location (optional)')}{field('budget_label', 'Budget (optional)')}{field('timeline', 'Timeline (optional)')}</div>
        {editingFields && <div className="grid gap-6 sm:grid-cols-2"><FormField name="mode" label="Project size"><select id="mode" className={controlClass} value={form.mode} disabled={!!pending} onChange={e => update('mode', e.target.value as BriefInput['mode'])}><option value="individual">One student</option><option value="team">A student team</option></select></FormField><FormField name="compensation" label="Compensation"><select id="compensation" className={controlClass} value={form.compensation} disabled={!!pending} onChange={e => update('compensation', e.target.value as BriefInput['compensation'])}><option value="negotiable">To be discussed</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></FormField><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={form.remote_ok} disabled={!!pending} onChange={e => update('remote_ok', e.target.checked)} />Students can work remotely</label></div>}
        <p className="text-sm text-muted">Language: {project.preferred_language === 'en' ? 'English' : project.preferred_language}{editingFields && project.preferred_language !== 'en' ? ' · Saving selects English, the supported launch language.' : ''}</p>
        {editingFields && <div className="flex flex-wrap gap-3"><Button disabled={!!pending}>{pending === 'save' ? 'Saving…' : 'Save Draft'}</Button><Button variant="secondary" type="button" disabled={!!pending} onClick={() => void act('regenerate')}>{pending === 'regenerate' ? 'Creating another brief…' : 'Regenerate'}</Button></div>}
      </form></Card>
      {editable && <Card className="space-y-5 p-5 sm:p-7"><h2 className="text-lg font-bold">Check your project details</h2><p className="text-sm leading-6 text-muted">Please check that these details describe what your business actually needs. Your project will only be published after you confirm them.</p>
        {issues.length > 0 && <ul className="list-inside list-disc text-sm leading-6 text-amber-800">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}
        {project.questions.map(q => <FormField key={q.id} name={`question-${q.id}`} label={`${q.question}${q.required ? ' (required)' : ' (optional)'}`}>{q.type === 'yes_no' || q.type === 'multiple_choice' ? <select id={`question-${q.id}`} className={controlClass} value={answers[q.id] ?? ''} disabled={!!pending || confirmationValid} onChange={e => { setAnswers({ ...answers,[q.id]:e.target.value }); setConfirmed(false); }}><option value="">Choose an answer</option>{[...new Set([...(q.type === 'yes_no' ? ['Yes','No'] : q.options ?? []),'Not sure'])].map(option => <option key={option} value={option}>{option}</option>)}</select> : <textarea id={`question-${q.id}`} className={controlClass} rows={3} maxLength={2000} value={answers[q.id] ?? ''} required={q.required} disabled={!!pending || confirmationValid} onChange={e => { setAnswers({ ...answers, [q.id]: e.target.value }); setConfirmed(false); }} />}</FormField>)}
        {!confirmationValid && <label className="flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={confirmed} disabled={dirty || !!pending || !!issues.length} onChange={e => setConfirmed(e.target.checked)} />I have reviewed these details and they accurately describe what my business needs.</label>}
        {dirty && <p className="text-sm text-amber-800">Save your changes before confirming.</p>}
        <div className="flex flex-wrap gap-3">{!editing && <Link className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold text-brand" href={`/business/projects/${project.id}/edit`}>Edit details</Link>}<Button type="button" variant="secondary" disabled={!!pending || dirty || !confirmed || confirmationValid || !!issues.length || project.questions.some(q => q.required && !answers[q.id]?.trim())} onClick={() => void act('confirm')}>{pending === 'confirm' ? 'Confirming…' : confirmationValid ? 'Details confirmed' : 'Confirm Details'}</Button><Button type="button" disabled={!!pending || dirty || !confirmationValid || !!issues.length} onClick={() => void act('publish')}>{pending === 'publish' ? 'Publishing…' : 'Publish Project'}</Button></div>
      </Card>}
      <p role={failed ? 'alert' : 'status'} className={`whitespace-pre-wrap text-sm ${failed ? 'text-red-700' : 'text-emerald-700'}`}>{message}</p>
    </div>
  );
}

