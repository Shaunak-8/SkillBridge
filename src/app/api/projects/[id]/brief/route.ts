import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // TODO [WS-6]: Verify user is authenticated and owns this project
  // const user = await getAuthSession();
  // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    const body = await request.json();
    const { title, summary, description } = body;
    
    // TODO [WS-6]: Update the `projects` table with new brief info
    // NOTE: Per WS-3 docs, any material edit MUST invalidate prior confirmations!
    // await db.query(`
    //   UPDATE projects 
    //   SET title = COALESCE($1, title), 
    //       summary = COALESCE($2, summary), 
    //       description = COALESCE($3, description),
    //       owner_confirmed = false, -- Reset confirmation automatically
    //       updated_at = NOW()
    //   WHERE id = $4
    // `, [title, summary, description, id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update brief" }, { status: 500 });
  }
}
