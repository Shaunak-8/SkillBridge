import { DbError } from "@/components/ws5/parts";
import { StudentsDirectoryView } from "@/components/business/StudentsDirectory";
import { parseDirectoryParams, searchStudents, type DirectoryPage } from "@/lib/ws5/students-directory";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseDirectoryParams(await searchParams);
  let data: DirectoryPage;
  try { data = await searchStudents(params); } catch { return <DbError />; }
  return <StudentsDirectoryView data={data} q={params.q} skill={params.skill} minHours={params.minHours} />;
}
