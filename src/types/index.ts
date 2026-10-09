export type Role = "student" | "business" | "admin";
export interface ProjectQuestion { id: string; projectId: string; text: string; type: 'yes_no' | 'short_text' | 'multiple_choice'; options?: string[]; sortOrder: number; required?: boolean; answerText?: string; }
export type SkillType = "technical" | "creative" | "business";
export type ProjectStatus = "open" | "in_progress" | "completed" | "draft";
export type ApplicationStatus = "submitted" | "reviewing" | "shortlisted" | "accepted" | "declined";
export type ProjectMode = "individual" | "team";
export interface Skill { id: string; name: string; type: SkillType; color?: string; }
export interface User { id: string; name: string; email: string; role: Role; avatar?: string; joinedAt: string; }
export interface StudentProfile extends User { role: "student"; headline: string; bio: string; location: string; skills: Skill[]; availability: string; education: string; portfolioUrl?: string; }
export interface BusinessProfile extends User { role: "business"; businessName: string; industry: string; description: string; location: string; verified: boolean; }
export interface ProjectRequirement { id: string; skill: Skill; level: "beginner" | "intermediate" | "advanced"; essential: boolean; }
export interface ProjectMilestone { id: string; title: string; dueDate: string; status: "upcoming" | "in_progress" | "complete"; }
export interface Project { id: string; title: string; summary: string; description: string; businessId: string; businessName: string; category: string; location: string; status: ProjectStatus; mode: ProjectMode; budgetLabel: string; postedAt: string; duration: string; requirements: ProjectRequirement[]; milestones: ProjectMilestone[]; applicants: number; featured?: boolean; }
export interface Application { id: string; projectId: string; projectTitle: string; studentId: string; studentName: string; message: string; status: ApplicationStatus; matchScore: number; appliedAt: string; }
export interface Team { id: string; name: string; projectId: string; memberIds: string[]; }
export interface TeamMember { teamId: string; studentId: string; role: string; }
export interface AssessmentResult { label: string; score: number; feedback: string; }
export interface Assessment { id: string; title: string; type: "skill" | "portfolio" | "challenge"; status: "not_started" | "in_progress" | "complete"; duration: string; results?: AssessmentResult[]; }
export interface ProjectSubmission { id: string; projectId: string; title: string; url: string; submittedAt: string; status: "pending" | "reviewed"; }
export interface BusinessFeedback { id: string; projectId: string; rating: number; comment: string; createdAt: string; }
export interface ScreeningPackage { id: string; name: string; description: string; priceLabel: string; features: string[]; }
