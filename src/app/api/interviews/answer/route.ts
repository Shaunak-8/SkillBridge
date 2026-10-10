import { NextResponse } from "next/server";
import { database } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { sessionId, questionText, answerText, questionOrder } = await request.json();
    if (!sessionId || !questionText || !answerText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = database();
    
    await db`
      INSERT INTO skillbridge.interview_responses (session_id, question_text, answer_text, question_order)
      VALUES (${sessionId}, ${questionText}, ${answerText}, ${questionOrder})
    `;
    
    await db`
      UPDATE skillbridge.interview_sessions 
      SET question_count = question_count + 1, updated_at = NOW()
      WHERE id = ${sessionId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
