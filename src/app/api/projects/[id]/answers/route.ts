import { ownedVerification, editable, verificationError } from '@/lib/projects/verification';
import { database } from '@/lib/db';
import { jsonBody, textField, uuid } from '@/lib/validation';
import { ApiFailure } from '@/lib/api';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { project, profileId } = await ownedVerification(id, request);
    editable(project);
    const body = await jsonBody(request);
    if (body.briefVersion !== undefined && body.briefVersion !== project.brief_version) throw new ApiFailure(409, 'STALE_BRIEF', 'Project changed. Reload before answering.');
    if (typeof body.questionId !== 'string') throw new ApiFailure(400, 'INVALID_INPUT', 'Question ID required.');
    const questionId = uuid(body.questionId), answerText = textField(body.answerText, 5000);
    const [question] = await database()`SELECT question_type, options FROM skillbridge.project_questions WHERE id = ${questionId} AND project_id = ${id}`;
    if (!question) throw new ApiFailure(400, 'INVALID_QUESTION', 'Question does not belong to this project.');
    if (question.question_type === 'yes_no' && !['Yes', 'No', 'Not sure'].includes(answerText)) throw new ApiFailure(400, 'INVALID_INPUT', 'Choose Yes, No, or Not sure.');
    if (question.question_type === 'multiple_choice' && answerText !== 'Not sure' && !question.options?.includes(answerText)) throw new ApiFailure(400, 'INVALID_INPUT', 'Choose one of the available options.');
    const sql = database();
    const rows = await sql.transaction([
      sql`INSERT INTO skillbridge.project_answers(project_id, question_id, business_user_id, answer)
        SELECT ${id}, q.id, ${profileId}, ${answerText} FROM skillbridge.project_questions q JOIN skillbridge.projects p ON p.id = q.project_id
        WHERE q.id = ${questionId} AND q.project_id = ${id} AND p.owner_profile_id = ${profileId}
          AND p.status IN ('draft', 'published') AND p.brief_version = ${project.brief_version}
        ON CONFLICT(question_id) DO UPDATE SET answer = EXCLUDED.answer, business_user_id = EXCLUDED.business_user_id, updated_at = now() RETURNING id`,
      sql`SELECT brief_version FROM skillbridge.projects WHERE id = ${id}`,
    ]);
    if (!rows[0][0]) throw new ApiFailure(409, 'CONFLICT', 'Project changed. Reload and retry.');
    return Response.json({ success: true, briefVersion: rows[1][0].brief_version });
  } catch (error) { return verificationError(error); }
}
