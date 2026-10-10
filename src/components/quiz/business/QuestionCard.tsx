'use client';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { AI_NOTE, btnCls, fieldCls, labelCls, mutedCls } from './parts';
import type { DraftQuestion } from './types';
import { OPTION_MAX, PROMPT_MAX, RUBRIC_MAX } from './validate';

interface Props {
  index: number; q: DraftQuestion; problems: string[]; editing: boolean;
  onToggleEdit: () => void; onChange: (next: DraftQuestion) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

/** One question: review view with the AI-chosen answer highlighted, and an inline editor behind the Edit button. */
export function QuestionCard({ index, q, problems, editing, onToggleEdit, onChange }: Props) {
  const id = `quiz-q${index}`;
  const setOption = (i: number, v: string) => onChange({ ...q, options: q.options.map((o, j) => (j === i ? v : o)) });
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#655F52]">Question {index + 1} of 5 {'·'} {q.kind === 'mcq' ? 'Multiple choice' : 'Short answer'}</p>
        <Button type="button" variant="secondary" className={cn(btnCls, 'w-auto shrink-0')} aria-expanded={editing} onClick={onToggleEdit}>{editing ? 'Done' : 'Edit'}</Button>
      </div>
      {!editing && <>
        <p className="mt-2 break-words text-base font-semibold leading-6">{q.prompt}</p>
        {q.kind === 'mcq' ? <ul className="mt-3 space-y-2">{q.options.map((o, i) => {
          const correct = i === q.correctIndex;
          return <li key={i} className={cn('rounded-xl border-2 px-3 py-2 text-sm break-words', correct ? 'border-[#137333] bg-[#E6F4EA] font-semibold' : 'border-[#111111]/30 bg-white')}>
            <span className="font-bold">{LETTERS[i]}.</span> {o}
            {correct && <span className="mt-1 block text-xs font-bold text-[#137333]">{AI_NOTE}</span>}
          </li>;
        })}</ul> : <div className="mt-3 rounded-xl border-2 border-[#137333] bg-[#E6F4EA] px-3 py-2 text-sm">
          <p className="text-xs font-bold text-[#137333]">Marking guide {'—'} AI-suggested, please check it</p>
          <p className="mt-1 whitespace-pre-line break-words">{q.rubric}</p>
        </div>}
      </>}
      {editing && <div className="mt-3 space-y-3">
        <div>
          <label htmlFor={`${id}-prompt`} className={labelCls}>Question</label>
          <textarea id={`${id}-prompt`} rows={4} maxLength={PROMPT_MAX} className={fieldCls} value={q.prompt} onChange={(e) => onChange({ ...q, prompt: e.target.value })} />
        </div>
        {q.kind === 'mcq' ? <fieldset>
          <legend className={labelCls}>Options {'—'} tick the correct one</legend>
          <div className="space-y-2">{q.options.map((o, i) => (
            <div key={i} className="flex items-start gap-2">
              <label className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#111111] bg-white" title="Correct answer">
                <input type="radio" name={`${id}-correct`} className="size-5" checked={q.correctIndex === i} onChange={() => onChange({ ...q, correctIndex: i })} aria-label={`Option ${LETTERS[i]} is correct`} />
              </label>
              <input aria-label={`Option ${LETTERS[i]}`} maxLength={OPTION_MAX} className={fieldCls} value={o} onChange={(e) => setOption(i, e.target.value)} />
            </div>
          ))}</div>
        </fieldset> : <div>
          <label htmlFor={`${id}-rubric`} className={labelCls}>Marking guide (what a good answer covers)</label>
          <textarea id={`${id}-rubric`} rows={5} maxLength={RUBRIC_MAX} className={fieldCls} value={q.rubric} onChange={(e) => onChange({ ...q, rubric: e.target.value })} />
        </div>}
      </div>}
      {problems.length > 0 && <ul role="alert" className={cn(mutedCls, 'mt-3 list-disc pl-5 !text-[#9B1C3A]')}>{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
    </Card>
  );
}
