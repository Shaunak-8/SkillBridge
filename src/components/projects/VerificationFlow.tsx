'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectQuestion } from '@/types';
import type { ProjectBrief } from '@/types/backend';
import { Button, Card, Input } from '@/components/ui';

// Adapted from WS-3's guided flow: every save now persists through the authenticated API.
export default function VerificationFlow({ project, questions }: { project: ProjectBrief; questions: ProjectQuestion[] }) {
  const router = useRouter();
  const [brief, setBrief] = useState(project);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(Object.fromEntries(questions.map(q => [q.id, q.answerText ?? ''])));
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>(Object.fromEntries(questions.map(q => [q.id, q.answerText ?? ''])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({ title: project.title, summary: project.summary, description: project.description, deliverables: project.deliverables.join('\n') });
  async function request(action: string, method: string, body: unknown) {
    const response = await fetch(`/api/projects/${project.id}${action}`, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'Unable to save. Please try again.');
    return result;
  }
  async function saveAnswer() {
    const question = questions[step];
    const answerText = answers[question.id]?.trim();
    if (!answerText) { setMessage('Choose an answer or select Not sure.'); return; }
    setBusy(true); setMessage('');
    try {
      const result = await request('/answers', 'POST', { questionId: question.id, answerText, briefVersion: brief.briefVersion });
      setSavedAnswers(a => ({ ...a, [question.id]: answerText }));
      setBrief(b => ({ ...b, briefVersion: result.briefVersion, ownerConfirmed: false, confirmedVersion: null, status: 'draft' }));
      setStep(s => s + 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save answer.'); }
    finally { setBusy(false); }
  }
  async function saveBrief() {
    setBusy(true); setMessage('');
    try {
      const result = await request('/brief', 'PATCH', { ...fields, deliverables: fields.deliverables.split('\n').map(s => s.trim()).filter(Boolean), briefVersion: brief.briefVersion });
      setBrief(result.data); setEditing(false); setMessage('Changes saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save brief.'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setMessage('');
    try {
      const result = await request('/confirm', 'POST', { briefVersion: brief.briefVersion });
      setBrief(result.data); setMessage('Brief confirmed. You can now publish it.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to confirm.'); }
    finally { setBusy(false); }
  }
  async function publish() {
    setBusy(true); setMessage('');
    try { await request('', 'PATCH', { status: 'published' }); router.push(`/projects/${project.id}`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish.'); setBusy(false); }
  }
  const question = questions[step];
  return <div className="grid gap-8 md:grid-cols-2">
    <div>
      <p role="status" aria-live="polite" className="mb-4 text-sm text-brand-dark">{message}</p>
      {question ? <Card className="p-6">
        <p className="mb-4 text-sm text-muted">Question {step + 1} of {questions.length}</p>
        <h2 className="mb-6 text-lg font-bold">{question.text}</h2>
        {question.type === 'short_text' ? <Input aria-label={question.text} maxLength={5000} value={answers[question.id] || ''} disabled={busy}
          onChange={event => setAnswers(a => ({ ...a, [question.id]: event.target.value }))} placeholder="Your answer..." /> :
          <fieldset disabled={busy} className="space-y-3"><legend className="sr-only">{question.text}</legend>
            {(question.type === 'yes_no' ? ['Yes', 'No'] : question.options ?? []).map(option => <label key={option} className="flex cursor-pointer gap-3 rounded-xl border p-3">
              <input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers(a => ({ ...a, [question.id]: option }))} />{option}
            </label>)}
          </fieldset>}
        <Button variant="secondary" className="mt-4" disabled={busy} onClick={() => setAnswers(a => ({ ...a, [question.id]: 'Not sure' }))}>Not sure</Button>
        <div className="mt-8 flex justify-between gap-2">
          <Button variant="ghost" disabled={busy || step === 0} onClick={() => setStep(s => s - 1)}>Back</Button>
          {!question.required && <Button variant="ghost" disabled={busy} onClick={() => { setAnswers(a => ({ ...a, [question.id]: savedAnswers[question.id] || '' })); setStep(s => s + 1); }}>Skip for now</Button>}
          <Button disabled={busy} onClick={saveAnswer}>{busy ? 'Saving…' : 'Save and next'}</Button>
        </div>
      </Card> : <Card className="p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Final Review</h2>
          {!editing && <Button variant="secondary" disabled={busy} onClick={() => setEditing(true)}>Edit fields</Button>}
        </div>
        {editing ? <div className="space-y-4">
          <label className="block text-sm font-semibold">Project title<Input value={fields.title} maxLength={200} disabled={busy} onChange={e => setFields(f => ({ ...f, title: e.target.value }))} /></label>
          <label className="block text-sm font-semibold">Summary<Input value={fields.summary} maxLength={1000} disabled={busy} onChange={e => setFields(f => ({ ...f, summary: e.target.value }))} /></label>
          <label className="block text-sm font-semibold">Requirements<textarea className="mt-2 min-h-28 w-full rounded-xl border p-3" value={fields.description} maxLength={10000} disabled={busy} onChange={e => setFields(f => ({ ...f, description: e.target.value }))} /></label>
          <label className="block text-sm font-semibold">Deliverables (one per line)<textarea className="mt-2 min-h-24 w-full rounded-xl border p-3" value={fields.deliverables} disabled={busy} onChange={e => setFields(f => ({ ...f, deliverables: e.target.value }))} /></label>
          <Button disabled={busy} onClick={saveBrief}>Save changes</Button>
        </div> : <div className="space-y-4"><h3 className="text-lg font-bold">{brief.title}</h3><p className="text-muted">{brief.summary}</p><p>{brief.description}</p>
          <h3 className="font-semibold">Deliverables</h3><ul className="list-disc pl-5">{brief.deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>}
        <h3 className="mt-6 font-semibold">Clarifications</h3>
        {questions.length ? <ul className="mt-2 space-y-3">{questions.map(q => <li key={q.id}><p>{q.text}</p><p className="text-sm text-muted">Answer: {savedAnswers[q.id] || 'Skipped'}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted">No clarifications needed.</p>}
        <p className="mt-8 border-t pt-4 text-xs text-muted">Confirmation means “this accurately describes what I need,” not a guarantee of project success.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {!brief.ownerConfirmed && <Button disabled={busy || editing} onClick={confirm}>Looks good, confirm!</Button>}
          {brief.ownerConfirmed && brief.status === 'draft' && <Button disabled={busy || editing} onClick={publish}>Publish project</Button>}
          {brief.ownerConfirmed && <span className="text-sm text-brand">Current brief confirmed</span>}
          {questions.length > 0 && <Button variant="secondary" disabled={busy || editing} onClick={() => setStep(0)}>Back to questions</Button>}
        </div>
      </Card>}
    </div>
    <Card className="h-fit border-dashed bg-slate-50 p-6">
      <h2 className="mb-4 text-sm font-bold uppercase text-muted">Draft Brief Preview</h2>
      <h3 className="mb-2 text-lg font-bold">{brief.title}</h3><p className="mb-6 text-muted">{brief.summary}</p><p>{brief.description}</p>
      <h3 className="mb-2 mt-6 font-semibold">Required skills</h3><p>{brief.requiredSkills.join(', ') || 'To be agreed'}</p>
    </Card>
  </div>;
}
