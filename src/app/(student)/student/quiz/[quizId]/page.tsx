import { notFound } from "next/navigation";
import type { Viewport } from "next";
import { QuizFlow } from "@/components/quiz/student/QuizFlow";
import { requireRole } from "@/lib/auth/profile";
import { isUuid } from "@/lib/ws5/guard";

export const dynamic = "force-dynamic";
// viewport-fit=cover lets env(safe-area-inset-*) padding work on notched phones.
export const viewport: Viewport = { viewportFit: "cover" };

/** A focused page: no sidebar, so the whole phone screen is the quiz. */
export default async function Page({ params }: { params: Promise<{ quizId: string }> }) {
  await requireRole("student");
  const { quizId } = await params;
  if (!isUuid(quizId)) notFound();
  return <QuizFlow quizId={quizId} />;
}
