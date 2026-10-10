import { rateLimit, sameOrigin } from '@/lib/auth/security';
import { fail, guard, unavailable } from '@/lib/ws5/guard';
import { studentIdForProfile } from '@/lib/ws5/repo';
import { storage } from '@/lib/storage/adapter';
import { database } from '@/lib/db';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail('Invalid request origin.', 403);
  try {
    const auth = await guard('student');
    if (auth instanceof Response) return auth;
    if (!await rateLimit('resume_upload', auth.profile.id, 5)) return fail('Too many attempts. Try again later.', 429);
    
    const studentId = await studentIdForProfile(auth.profile.id);
    if (!studentId) return fail('Complete your student profile first.', 409);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file || !(file instanceof File)) {
      return fail('No file uploaded.', 400);
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return fail('File is too large. Maximum size is 10MB.', 400);
    }

    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      return fail('Invalid file type. Only PDF and DOCX are allowed.', 400);
    }

    const fileUrl = await storage.uploadFile(file, 'resumes');
    
    const rows = await database()`
      INSERT INTO skillbridge.resumes (student_id, file_name, file_url, file_type, file_size)
      VALUES (${studentId}, ${file.name}, ${fileUrl}, ${file.type}, ${file.size})
      RETURNING id, file_name, file_url, created_at
    `;

    return Response.json({ resume: rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return unavailable();
  }
}
