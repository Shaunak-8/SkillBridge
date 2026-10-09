'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { briefSchema, publicationIssues, type BriefInput, type BusinessProject } from '@/lib/business/contracts';
import { businessRequest, FormError } from '@/lib/business/client';
import { FormField, controlClass } from './FormField';

function briefOf(project: BusinessProject): BriefInput {
  return { title: project.title, summary: project.summary, problem_statement: project.problem_statement, category: project.category,
    deliverables: project.deliverables, required_skills: project.required_skills, budget_label: project.budget_label,
    timeline: project.timeline ?? '', preferred_language: 'en', location_text: project.location_text ?? '',
    remote_ok: project.remote_ok, mode: project.mode, compensation: project.compensation };
}
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
  const editable = project.status === 'draft';
  const confirmationValid = project.owner_confirmed && project.confirmed_version === project.brief_version && project.questions.every(q => !q.required || !!q.answer?.trim());
  const editingFields = editable && editing;
  const input = { ...form, deliverables: deliverables.split('\n').map(s => s.trim()).filter(Boolean), required_skills: skills.split('\n').map(s => s.trim()).filter(Boolean) };
  const issues = publicationIssues(input);
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  function update<K extends keyof BriefInput>(key: K, value: BriefInput[K]) { setForm({ ...form, [key]: value }); setDirty(true); setConfirmed(false); setMessage(''); }
  async function act(action: 'save' | 'confirm' | 'publish' | 'regenerate') {
    setMessage(''); setFailed(false); setFields({});
    const parsed = briefSchema.safeParse(input);
    if (!parsed.success) { setFailed(true); setMessage('Please check the highlighted fields.'); setFields(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    if (action === 'regenerate' && dirty && !window.confirm('Creating another brief may replace your unsaved edits. Continue?')) return;
    setPending(action);
    try {
      if (action === 'regenerate') {
        const generated = await businessRequest<BusinessProject>('/api/business/generate', 'POST', { problem: form.problem_statement, preferred_language: 'en', project_id: project.id, brief_version: project.brief_version });
        setProject(generated); setForm(briefOf(generated)); setDeliverables(generated.deliverables.join('\n')); setSkills(generated.required_skills.join('\n')); setAnswers(Object.fromEntries(generated.questions.map(q => [q.id,q.answer ?? '']))); setDirty(false); setConfirmed(false);
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
      // One publish path: Member 6's PATCH /api/projects/[id] {status:'published'} (owner, confirmed version and deliverables enforced server-side and by projects_publish_ready).
      if (action === 'publish') await businessRequest(`/api/projects/${project.id}`, 'PATCH', { status: 'published', briefVersion: project.brief_version }, false);
      else await businessRequest(`/api/business/projects/${project.id}`, 'PATCH', { ...parsed.data, brief_version: project.brief_version });
      const next = await businessRequest<BusinessProject>(`/api/business/projects/${project.id}`, 'GET');
      setProject(next); setForm(briefOf(next)); setDeliverables(next.deliverables.join('\n')); setSkills(next.required_skills.join('\n')); setDirty(false); setConfirmed(false);
      setMessage(action === 'save' ? 'Your draft is saved. Please confirm these details before publishing.' : 'Your project is published!');
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Please try again.'); if (error instanceof FormError) setFields(error.fields); }
    finally { setPending(''); }
  }
  const field = (name: 'title' | 'summary' | 'problem_statement' | 'category' | 'budget_label' | 'timeline' | 'location_text', label: string, rows?: number) => <FormField key={name} name={name} label={label} error={fields[name]}>
    {editingFields ? rows ? <textarea id={name} className={controlClass} rows={rows} disabled={!!pending} value={form[name]} aria-invalid={!!fields[name]} aria-describedby={fields[name] ? `${name}-error` : undefined} onChange={e => update(name, e.target.value)} /> : <input id={name} className={controlClass} disabled={!!pending} value={form[name]} aria-invalid={!!fields[name]} aria-describedby={fields[name] ? `${name}-error` : undefined} onChange={e => update(name, e.target.value)} /> : <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted">{form[name] || 'Not added yet'}</p>}
  </FormField>;
  return <div className="max-w-4xl space-y-5"><div className="flex flex-wrap items-center gap-3"><Badge tone={editable ? 'amber' : 'purple'}>{project.status.replaceAll('_', ' ')}</Badge><span className="text-sm text-muted">Version {project.brief_version}{dirty ? ' · Unsaved changes' : project.owner_confirmed ? ' · Details confirmed' : ' · Review needed'}</span><Link href="/business/projects" className="ml-auto inline-flex min-h-11 items-center text-sm font-semibold text-brand" onClick={e => { if (dirty && !window.confirm('Your edits are not saved. Leave this page?')) e.preventDefault(); }}>Back to my projects</Link></div>
    {!editable && <Link href={`/business/projects/${project.id}/applications`} className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">Review applications ({project.application_count})</Link>}
    <Card className="p-5 sm:p-7"><form onSubmit={e => { e.preventDefault(); void act('save'); }} className="space-y-6" aria-busy={!!pending}>
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
  </div>;
}
