"use client";

import { useState } from "react";
import { Project, ProjectQuestion } from "@/types";
import { Button, Card, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

export default function VerificationFlow({ project }: { project: Project }) {
  const router = useRouter();
  const questions = project.openQuestions || [];
  const [currentStep, setCurrentStep] = useState(0); // 0 to questions.length - 1 are questions, questions.length is review
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState({ title: project.title, summary: project.summary, description: project.description });

  const handleNext = () => {
    setCurrentStep(s => s + 1);
  };

  const handlePrev = () => {
    setCurrentStep(s => Math.max(0, s - 1));
  };

  const handleConfirm = () => {
    setIsConfirming(true);
    // Simulate API call to confirm
    setTimeout(() => {
      alert("Brief confirmed! This would now be published.");
      router.push("/business/projects");
    }, 1000);
  };

  if (questions.length === 0 || currentStep === questions.length) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Final Review</h2>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Draft Brief</h3>
              {!isEditing && <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit fields</Button>}
            </div>
            {isEditing ? (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="text-sm font-semibold">Project Title</label>
                  <Input value={editedProject.title} onChange={e => setEditedProject({ ...editedProject, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold">Summary</label>
                  <Input value={editedProject.summary} onChange={e => setEditedProject({ ...editedProject, summary: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-semibold">Requirements</label>
                  <textarea className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 min-h-[100px]" value={editedProject.description} onChange={e => setEditedProject({ ...editedProject, description: e.target.value })} />
                </div>
                <Button onClick={() => setIsEditing(false)}>Save changes</Button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-lg">{editedProject.title}</h3>
                <p className="text-sm text-slate-500 mb-4">{editedProject.summary}</p>
                <div className="space-y-4">
                  <div>
                    <strong className="text-sm">Requirements:</strong>
                    <p className="text-sm">{editedProject.description}</p>
                  </div>
              </>
            )}
              
              <div>
                <strong className="text-sm">Clarifications:</strong>
                {questions.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                    {questions.map((q) => (
                      <li key={q.id}>
                        <span className="font-medium">{q.text}</span>
                        <br />
                        <span className="text-slate-600">Answer: {answers[q.id] || "Skipped"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No clarifications needed.</p>
                )}
              </div>
            </div>

            <div className="mt-8 border-t pt-4">
              <p className="text-xs text-slate-500 mb-4">
                Note: Confirmation means "this accurately describes what I need," not a guarantee of project success.
              </p>
              <div className="flex gap-4">
                <Button onClick={handleConfirm} disabled={isConfirming || isEditing}>
                  {isConfirming ? "Confirming..." : "Looks good, Confirm!"}
                </Button>
                {questions.length > 0 && (
                  <Button variant="secondary" onClick={handlePrev} disabled={isEditing}>
                    Back to questions
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentStep];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Q&A Column */}
      <div>
        <div className="mb-4 text-sm font-medium text-slate-500">
          Question {currentStep + 1} of {questions.length}
        </div>
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-6">{currentQ.text}</h3>
          
          {currentQ.type === "multiple_choice" && currentQ.options && (
            <div className="space-y-3">
              {currentQ.options.map(opt => (
                <label key={opt} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <input 
                    type="radio" 
                    name={currentQ.id} 
                    value={opt}
                    checked={answers[currentQ.id] === opt}
                    onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}

          {currentQ.type === "yes_no" && (
            <div className="flex gap-4">
              <Button 
                variant={answers[currentQ.id] === "Yes" ? "primary" : "secondary"}
                onClick={() => setAnswers({ ...answers, [currentQ.id]: "Yes" })}
              >
                Yes
              </Button>
              <Button 
                variant={answers[currentQ.id] === "No" ? "primary" : "secondary"}
                onClick={() => setAnswers({ ...answers, [currentQ.id]: "No" })}
              >
                No
              </Button>
            </div>
          )}

          {currentQ.type === "short_text" && (
            <Input 
              value={answers[currentQ.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
              placeholder="Your answer..."
            />
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={handlePrev} disabled={currentStep === 0}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleNext}>
                Skip for now
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Draft Brief Preview Column */}
      <div className="hidden md:block">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Draft Brief Preview</h2>
        <Card className="p-6 bg-slate-50 border-dashed">
          <h3 className="font-bold text-lg mb-2">{editedProject.title}</h3>
          <p className="text-sm text-slate-500 mb-6">{editedProject.summary}</p>
          <div className="space-y-4 text-sm">
            <div>
              <strong>Goals:</strong>
              <p>{editedProject.description}</p>
            </div>
            <div>
              <strong>Required Skills:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                {project.requirements.map(req => (
                  <span key={req.id} className="bg-white border px-2 py-1 rounded text-xs">
                    {req.skill.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
