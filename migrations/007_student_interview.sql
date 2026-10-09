-- Migration 007: Student Interview Tables

CREATE TABLE IF NOT EXISTS skillbridge.interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES skillbridge.student_profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES skillbridge.projects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
    question_count INTEGER NOT NULL DEFAULT 0,
    assessment JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_student_project_interview UNIQUE(student_id, project_id)
);

CREATE TABLE IF NOT EXISTS skillbridge.interview_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES skillbridge.interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    question_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_student_project ON skillbridge.interview_sessions(student_id, project_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_session ON skillbridge.interview_responses(session_id);
