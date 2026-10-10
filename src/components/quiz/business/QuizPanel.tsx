'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { quizApi } from './api';
import { generationStep } from './format';
import { btnCls, mutedCls, Notice } from './parts';
import { QuizPanelView } from './QuizPanelView';
import type { Busy } from './QuizReview';
import type { QuestionPayload, Quiz, QuizState } from './types';

const messageOf = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Please try again.');

/**
 * Client island for the applicants page. Loads the quiz state on its own so the server-rendered applicants list is never
 * blocked, and owns the network calls. All rendering lives in QuizPanelView.
 */
export function QuizPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<QuizState | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<Busy>('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(generationStep(0));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    quizApi(projectId).state().then((s) => { if (live) { setData(s); setLoadError(''); } }).catch((e: unknown) => { if (live) setLoadError(messageOf(e)); });
    return () => { live = false; };
  }, [projectId, attempt]);

  // Stepped text while the AI writes the questions (up to ~15 s).
  useEffect(() => {
    if (busy !== 'generate') return;
    const started = Date.now();
    setProgress(generationStep(0));
    const timer = setInterval(() => setProgress(generationStep(Date.now() - started)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  const run = useCallback(async (kind: Busy, call: () => Promise<Quiz>): Promise<boolean> => {
    setBusy(kind); setError('');
    try {
      const quiz = await call();
      setData((d) => (d ? { ...d, quiz, eligible: d.eligible || quiz.status !== 'draft' } : d));
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally { setBusy(''); }
  }, []);

  const api = quizApi(projectId);
  if (loadError) return <Card className="mb-6 p-4"><h2 className="text-xl font-black">AI quiz</h2><Notice tone="error">{loadError}</Notice>
    <Button type="button" variant="secondary" className={`${btnCls} mt-3`} onClick={() => { setLoadError(''); setAttempt((n) => n + 1); }}>Try again</Button></Card>;
  if (!data) return <Card className="mb-6 p-4"><p role="status" className={mutedCls}>Loading AI quiz{'…'}</p></Card>;
  return <QuizPanelView projectId={projectId} data={data} busy={busy} progress={progress} error={error}
    onGenerate={() => void run('generate', api.generate)} onRegenerate={() => void run('generate', api.generate)}
    onOpen={() => void run('open', api.open)} onClose={() => void run('close', api.close)}
    onSave={(patch: { timeLimitSeconds: number; questions: QuestionPayload[] }) => run('save', () => api.save(patch))} />;
}
