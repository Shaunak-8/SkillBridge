import { NextResponse } from "next/server";
import { database } from "@/lib/db";
import { generateInterviewQuestion } from "@/lib/ai/interview";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const db = database();
    
    const sessions = await db`SELECT * FROM skillbridge.interview_sessions WHERE id = ${sessionId}`;
    if (sessions.length === 0) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const session = sessions[0];
    
    if (session.status === 'completed') {
      return NextResponse.json({ error: "Interview already completed" }, { status: 400 });
    }

    // Fetch project
    const projects = await db`SELECT * FROM skillbridge.projects WHERE id = ${session.project_id}`;
    const project = projects[0];

    // Fetch student profile
    const profiles = await db`SELECT * FROM skillbridge.student_profiles WHERE id = ${session.student_id}`;
    const profile = profiles[0];

    // Fetch Q&A history
    const responses = await db`SELECT * FROM skillbridge.interview_responses WHERE session_id = ${sessionId} ORDER BY question_order ASC`;
    const previousQA = responses.map((r: any) => ({ question: r.question_text, answer: r.answer_text }));

    const questionText = await generateInterviewQuestion(project, profile, previousQA);

    return NextResponse.json({ question: questionText, questionOrder: previousQA.length + 1 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
