import "server-only";

const getApiKey = () => {
  const key = process.env.GEMINI_INTERVIEW_API_KEY;
  if (!key) {
    throw new Error("GEMINI_INTERVIEW_API_KEY is not configured.");
  }
  return key;
};

export async function generateInterviewQuestion(
  project: any,
  studentProfile: any,
  previousQA: { question: string; answer: string }[]
): Promise<string> {
  const apiKey = getApiKey();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  
  let prompt = `You are an AI interviewer assessing a student for a project.
Project Title: ${project.title}
Project Requirements: ${project.description || project.problem_statement || project.summary}
Student Bio: ${studentProfile.bio || 'Not provided'}
Student Skills: ${studentProfile.skills?.join(', ') || 'Not provided'}

Previous Q&A:
`;
  if (previousQA.length === 0) {
    prompt += "(None yet. This is the first question.)\n";
  } else {
    previousQA.forEach(qa => {
      prompt += `Q: ${qa.question}\nA: ${qa.answer}\n\n`;
    });
  }

  prompt += `Based on the project requirements and the previous Q&A, generate exactly ONE concise, relevant technical or behavioral question to evaluate the student's suitability. 
If this is the first question, ask about their relevant experience. 
If there are previous questions, follow up on their last answer or pivot to a new requirement.
DO NOT include any other text, pleasantries, or formatting. Just output the question text directly.`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) throw new Error("Empty response from Gemini API");
  
  return text.trim();
}

export async function generateInterviewAssessment(
  project: any,
  studentProfile: any,
  allQA: { question: string; answer: string }[]
): Promise<any> {
  const apiKey = getApiKey();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  
  const prompt = `You have concluded an interview with a student for a project.
Project: ${project.title}
Student: ${studentProfile.name}

Interview Q&A:
${allQA.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n')}

Generate a JSON response assessing the student based on the interview evidence. 
Use this exact JSON schema:
{
  "summary": "A concise summary of the interview performance.",
  "strengths": ["list", "of", "demonstrated", "strengths"],
  "gaps": ["list", "of", "missing skills", "or gaps"],
  "recommendation": "Recommended next steps"
}
Output only raw JSON. Do not include markdown blocks like \`\`\`json.`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned ${res.status}`);
  }

  const data = await res.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) throw new Error("Empty response from Gemini API");
  
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  
  return JSON.parse(text);
}
