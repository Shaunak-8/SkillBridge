import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // TODO [WS-6]: Verify user is authenticated and owns this project
  // const user = await getAuthSession();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    const body = await request.json();
    const { questionId, answerText } = body;
    
    // TODO [WS-6]: UPSERT into `project_answers` table
    // await db.query(`
    //   INSERT INTO project_answers (project_id, question_id, business_user_id, answer_text) 
    //   VALUES ($1, $2, $3, $4) 
    //   ON CONFLICT (question_id, project_id) DO UPDATE SET answer_text = $4, updated_at = NOW()
    // `, [id, questionId, user.id, answerText]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
  }
}
