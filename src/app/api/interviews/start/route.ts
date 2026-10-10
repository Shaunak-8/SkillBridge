import { NextResponse } from "next/server";
import { database } from "@/lib/db";


export async function POST(request: Request) {
  try {
    // Basic auth check
    const authHeader = request.headers.get("cookie"); // stub for proper auth
    // In a real app we'd use the proper auth helper.
    // For this hackathon, we'll extract studentId from the request if getSession is not wired properly.
    
    const body = await request.json();
    const { projectId, studentId } = body;
    
    if (!projectId || !studentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = database();
    
    // Check if session already exists
    const existing = await db`SELECT id FROM skillbridge.interview_sessions WHERE student_id = ${studentId} AND project_id = ${projectId}`;
    
    if (existing.length > 0) {
      return NextResponse.json({ sessionId: existing[0].id });
    }
    
    const result = await db`
      INSERT INTO skillbridge.interview_sessions (student_id, project_id)
      VALUES (${studentId}, ${projectId})
      RETURNING id
    `;

    return NextResponse.json({ sessionId: result[0].id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
