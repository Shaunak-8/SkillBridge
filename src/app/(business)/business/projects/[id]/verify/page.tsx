import { projects } from "@/data/mock-data";
import { notFound } from "next/navigation";
import VerificationFlow from "@/components/projects/VerificationFlow";

export default async function VerifyProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = projects.find(p => p.id === id);

  if (!project) {
    notFound();
  }

  if (project.status !== "draft") {
    return <div className="p-8">This project has already been confirmed and is no longer a draft.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-2">Review Project Brief</h1>
      <p className="text-slate-500 mb-8">
        We have generated a technical brief for students based on your needs. 
        Please answer a few simple questions to clarify the scope, and then confirm the final version.
      </p>
      
      <VerificationFlow project={project} />
    </div>
  );
}
