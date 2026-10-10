import { z } from 'zod';
import {
  MAX_TIME_LIMIT_SECONDS, MCQ_OPTION_COUNT, MIN_TIME_LIMIT_SECONDS, QUIZ_MCQ_COUNT, QUIZ_QUESTION_COUNT, QUIZ_SHORT_COUNT,
} from './constants';

const prompt = z.string().trim().min(10).max(600);
const option = z.string().trim().min(1).max(300);

export const mcqQuestionSchema = z.object({
  kind: z.literal('mcq'),
  prompt,
  options: z.array(option).length(MCQ_OPTION_COUNT).refine(
    (o) => new Set(o.map((x) => x.toLowerCase())).size === o.length, 'Options must be distinct.',
  ),
  correctIndex: z.number().int().min(0).max(MCQ_OPTION_COUNT - 1),
}).strict();

export const shortQuestionSchema = z.object({
  kind: z.literal('short'),
  prompt,
  rubric: z.string().trim().min(10).max(1000),
}).strict();

export const questionSchema = z.discriminatedUnion('kind', [mcqQuestionSchema, shortQuestionSchema]);

/** Exactly 5 questions: 4 multiple choice and 1 short answer. Used for AI output and for business edits. */
export const questionsSchema = z.array(questionSchema).length(QUIZ_QUESTION_COUNT).refine(
  (qs) => qs.filter((q) => q.kind === 'mcq').length === QUIZ_MCQ_COUNT && qs.filter((q) => q.kind === 'short').length === QUIZ_SHORT_COUNT,
  'A quiz needs exactly 4 multiple choice questions and 1 short answer question.',
);

export const generatedQuizSchema = z.object({ questions: questionsSchema });

const timeLimit = z.number().int().min(MIN_TIME_LIMIT_SECONDS).max(MAX_TIME_LIMIT_SECONDS);

export const editQuizSchema = z.object({
  timeLimitSeconds: timeLimit.optional(),
  questions: questionsSchema.optional(),
}).strict().refine((b) => b.timeLimitSeconds !== undefined || b.questions !== undefined, 'Nothing to update.');

export type QuizQuestionInput = z.infer<typeof questionSchema>;
