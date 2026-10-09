'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { problemSchema, type BriefInput, type BusinessProject, type BusinessProfile } from '@/lib/business/contracts';
import { businessRequest, FormError } from '@/lib/business/client';
import { FormField, controlClass } from './FormField';
const GENERATION_STEPS = ['Reading your problem…', 'Finding similar project templates…', 'Writing your brief…', 'Checking the details…'];
const STEP_MS = 2500;
export function ProblemForm({ business }: { business: BusinessProfile }) {
  const router = useRouter();
  const [problem, setProblem] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  // Drafting takes several seconds: walk through what is actually happening so the wait is visible.
  useEffect(() => {
    if (pending !== 'generate') { setStep(0); return; }
    const timer = setInterval(() => setStep(s => Math.min(s + 1, GENERATION_STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, [pending]);
  useEffect(() => { if (!problem) return; const warn = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [problem]);
  async function submit(generate: boolean) {
    const parsed = problemSchema.safeParse({ problem, preferred_language: 'en' });
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
        deliverables: [], required_skills: [], budget_label: '', timeline: '', preferred_language: 'en',
        location_text: business.location, remote_ok: false, mode: 'individual', compensation: 'negotiable',
      };
      const project = await businessRequest<BusinessProject>('/api/business/projects', 'POST', brief);
      setProblem(''); router.push(`/business/projects/${project.id}/edit`); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); if (error instanceof FormError) setFields(error.fields); }
    finally { setPending(''); }
  }
  return <Card className="max-w-3xl p-5 sm:p-7"><form onSubmit={e => { e.preventDefault(); void submit(true); }} className="space-y-6" aria-busy={!!pending}>
    <FormField name="problem" label="Describe your business problem" error={fields.problem} hint="Tell us what happens today, what is difficult, and what you would like to improve. Use 10–4,000 characters.">
      <textarea id="problem" className={controlClass} rows={9} required minLength={10} maxLength={4000} value={problem} disabled={!!pending} aria-invalid={!!fields.problem} aria-describedby={`problem-hint${fields.problem ? ' problem-error' : ''}`} placeholder="Our shop receives many customer orders on WhatsApp, and it is difficult to track which orders are completed. We need a simple way to manage them." onChange={e => setProblem(e.target.value)} />
    </FormField>
    <FormField name="language" label="Language" hint="English is currently available."><select id="language" className={controlClass} value="en" disabled><option value="en">English</option></select></FormField>
    <p className="rounded-xl bg-brand-soft p-4 text-sm leading-6 text-muted">We’ll suggest a brief for you to review. Nothing is published until you confirm it. Voice input is not available yet; you can type your problem.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {pending && <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-brand-soft"><div className="h-full w-1/3 animate-pulse rounded-full bg-brand" /></div>}
    <p role="status" className="text-sm text-muted">{pending === 'generate' ? `${GENERATION_STEPS[step]} Your problem stays here if this fails.` : pending ? 'Saving your draft…' : ''}</p>
    <div className="flex flex-wrap gap-3"><Button disabled={!!pending}>{pending === 'generate' ? 'Generating…' : 'Generate Project Brief'}</Button><Button type="button" variant="secondary" disabled={!!pending} onClick={() => void submit(false)}>Save problem and write a draft</Button></div>
  </form></Card>;
}
