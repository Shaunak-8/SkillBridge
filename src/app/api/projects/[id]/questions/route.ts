import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // TODO [WS-6]: Verify user is authenticated and owns this project
  // const user = await getAuthSession();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // TODO [WS-6]: Fetch questions from Neon `project_questions` table for this project
    // const questions = await db.query('SELECT * FROM project_questions WHERE project_id = $1 ORDER BY sort_order', [id]);
    
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
