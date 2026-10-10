"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";

export default function InterviewPage({ params }: { params: { id: string } }) {
  // Hardcoded for demo if auth not fully wired. In real app, fetch from session.
  const studentId = "*01013ee3-6b62-45ae-8f53-b27f9b8780df*";
  const projectId = params.id;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [questionOrder, setQuestionOrder] = useState<number>(1);
  const [answer, setAnswer] = useState("");
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Start Session
      const startRes = await fetch("/api/interviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, studentId }) // Needs real studentId
      });
      if (!startRes.ok) throw new Error("Failed to start session");
      const { sessionId } = await startRes.json();
      setSessionId(sessionId);

      // 2. Fetch first question
      await fetchNextQuestion(sessionId);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchNextQuestion = async (sid: string) => {
    try {
      const qRes = await fetch("/api/interviews/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid })
      });
      if (!qRes.ok) throw new Error("Failed to get question");
      const { question, questionOrder } = await qRes.json();
      setQuestion(question);
      setQuestionOrder(questionOrder);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interviews/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionText: question,
          answerText: answer,
          questionOrder
        })
      });
      if (!res.ok) throw new Error("Failed to save answer");

      setAnswer("");
      if (questionOrder >= 3) { // Hard limit of 3 questions for hackathon
        await completeInterview(sessionId!);
      } else {
        await fetchNextQuestion(sessionId!);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const completeInterview = async (sid: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/interviews/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid })
      });
      if (!res.ok) throw new Error("Failed to complete interview");
      const { assessment } = await res.json();
      setAssessment(assessment);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (assessment) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Interview Assessment</h1>
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Summary</h2>
          <p className="mb-6">{assessment.summary}</p>

          <h3 className="font-bold text-green-700 mb-2">Demonstrated Strengths</h3>
          <ul className="list-disc pl-5 mb-6">
            {assessment.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>

          <h3 className="font-bold text-red-700 mb-2">Identified Gaps</h3>
          <ul className="list-disc pl-5 mb-6">
            {assessment.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}
          </ul>

          <h3 className="font-bold text-blue-700 mb-2">Recommendation</h3>
          <p>{assessment.recommendation}</p>
        </Card>
      </div>
    );
  }

  if (question) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">Technical Interview</h1>
        <Card className="p-6">
          <p className="text-sm text-slate-500 mb-4">Question {questionOrder} of 3</p>
          <h2 className="text-lg font-medium mb-6">{question}</h2>

          <textarea
            className="w-full rounded-xl border p-4 min-h-[150px] mb-4 outline-none focus:ring-2 focus:ring-brand"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={loading}
          />

          {error && <p className="text-red-500 mb-4">{error}</p>}

          <Button onClick={submitAnswer} disabled={loading || !answer.trim()}>
            {loading ? "Processing..." : "Submit Answer"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Technical Interview</h1>
      <p className="text-slate-600 mb-8">
        You are about to start a 3-question technical interview. Our AI will evaluate your suitability for this project based on your problem-solving skills and experience.
      </p>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <Button onClick={startInterview} disabled={loading} className="px-8 py-3 text-lg">
        {loading ? "Starting..." : "Start Interview"}
      </Button>
    </div>
  );
}
