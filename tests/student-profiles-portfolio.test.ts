// tests/student-profiles-portfolio.test.ts
// Comprehensive automated test suite for Workstream 4: Student Profiles & Portfolio
// Covers:
// 1. Skill tag normalization, deduplication & bounding
// 2. Safe URL sanitization (protocol injection prevention)
// 3. Portfolio input validation (lengths, counts, sanitized fields)
// 4. Profile update validation (bio, name, availability ranges, visibility options)
// 5. Profile completeness calculation & actionable suggestions
// 6. Candidate matching DTO transformation (strict privacy, zero secret/contact leakage)
// 7. Structured profile text generation for Member 5's RAG/pgvector engine
// 8. Database service CRUD & server-side ownership enforcement
// 9. Visibility & privacy rules

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeTagList,
  validateSafeUrl,
  validatePortfolioInput,
  validateProfileUpdate,
  calculateProfileCompleteness,
  transformToCandidateMatchingDTO,
  generateStructuredProfileTextForMatching,
} from "@/lib/validation/student";

import {
  getStudentProfileByUserId,
  updateStudentProfile,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  getStudentProfileById,
} from "@/lib/db/student-service";

// ==========================================
// 1. SKILL TAG NORMALIZATION & DEDUPLICATION
// ==========================================
test("Skill Tag Normalization: whitespace trimming, casing, and duplicate prevention", () => {
  const input = ["  React  ", "react", "REACT", "  Next.js   Framework  ", "", "   "];
  const { valid, errors } = normalizeTagList(input, 10, 40);

  assert.equal(errors.length, 0);
  assert.equal(valid.length, 2, "Should deduplicate case-insensitively and ignore empty strings");
  assert.equal(valid[0], "React", "Should preserve casing of first occurrence");
  assert.equal(valid[1], "Next.js Framework", "Should collapse multiple inner whitespaces");
});

test("Skill Tag Normalization: enforces maximum tag length and item counts", () => {
  const longTag = "a".repeat(45);
  const { valid, errors } = normalizeTagList([longTag, "ValidSkill"], 10, 40);

  assert.equal(valid.length, 1);
  assert.equal(valid[0], "ValidSkill");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /exceeds max length/);
});

// ==========================================
// 2. URL SAFETY & PROTOCOL SANITIZATION
// ==========================================
test("URL Validation: accepts valid HTTP and HTTPS URLs", () => {
  const resHttp = validateSafeUrl("http://example.com/project");
  assert.equal(resHttp.valid, true);
  assert.equal(resHttp.normalized, "http://example.com/project");

  const resHttps = validateSafeUrl("https://github.com/student/repo");
  assert.equal(resHttps.valid, true);
  assert.equal(resHttps.normalized, "https://github.com/student/repo");
});

test("URL Validation: strictly rejects script schemes and data URLs (XSS prevention)", () => {
  const resJs = validateSafeUrl("javascript:alert('XSS')");
  assert.equal(resJs.valid, false);
  assert.match(resJs.error!, /standard http/);

  const resData = validateSafeUrl("data:text/html,<script>alert(1)</script>");
  assert.equal(resData.valid, false);

  const resVbs = validateSafeUrl("vbscript:MsgBox(1)");
  assert.equal(resVbs.valid, false);

  const resInvalid = validateSafeUrl("not-a-valid-url");
  assert.equal(resInvalid.valid, false);
});

// ==========================================
// 3. PORTFOLIO INPUT VALIDATION
// ==========================================
test("Portfolio Validation: validates title length boundaries (3 - 120 chars)", () => {
  const tooShort = validatePortfolioInput({ title: "Hi", description: "Valid project description here" });
  assert.equal(tooShort.valid, false);
  assert.ok(tooShort.errors.title);

  const tooLong = validatePortfolioInput({
    title: "T".repeat(125),
    description: "Valid project description here",
  });
  assert.equal(tooLong.valid, false);
  assert.ok(tooLong.errors.title);
});

test("Portfolio Validation: validates description length (10 - 2,000 chars)", () => {
  const shortDesc = validatePortfolioInput({ title: "Valid Title", description: "Too short" });
  assert.equal(shortDesc.valid, false);
  assert.ok(shortDesc.errors.description);

  const validItem = validatePortfolioInput({
    title: "Kirana Store Counter",
    description: "This is a practical project for a local grocery shop to track orders.",
    role: "Lead Developer",
    skillsUsed: ["React", "TypeScript"],
    projectUrl: "https://example.com/demo",
  });
  assert.equal(validItem.valid, true);
  assert.equal(validItem.sanitized?.title, "Kirana Store Counter");
  assert.equal(validItem.sanitized?.skillsUsed.length, 2);
});

// ==========================================
// 4. PROFILE UPDATE VALIDATION
// ==========================================
test("Profile Update Validation: validates bio, name, availability, and visibility", () => {
  const emptyName = validateProfileUpdate({ displayName: "   " });
  assert.equal(emptyName.valid, false);
  assert.ok(emptyName.errors.displayName);

  const validUpdate = validateProfileUpdate({
    displayName: "Aarav Mehta",
    bio: "Helping local MSMEs digitize their stores.",
    educationLevel: "Undergraduate",
    fieldOfStudy: "Computer Science",
    studyYear: "3rd Year",
    skills: ["React", "UI/UX", "react"],
    learningGoals: ["PostgreSQL", "Next.js"],
    preferredCategories: ["Web development", "Retail technology"],
    availability: { hoursPerWeek: 15, schedulePreference: "Weekdays" },
    visibility: "public_to_businesses",
  });

  assert.equal(validUpdate.valid, true);
  assert.equal(validUpdate.sanitized?.skills?.length, 2, "Deduplicated skills");
  assert.equal(validUpdate.sanitized?.availability?.hoursPerWeek, 15);
  assert.equal(validUpdate.sanitized?.visibility, "public_to_businesses");
});

// ==========================================
// 5. PROFILE COMPLETENESS CALCULATION
// ==========================================
test("Profile Completeness: transparent suggestions and score calculation", () => {
  const emptyProfile = { displayName: "", bio: "", skills: [] };
  const emptyRes = calculateProfileCompleteness(emptyProfile, []);
  assert.equal(emptyRes.score, 0);
  assert.ok(emptyRes.checklist.length >= 5);

  const fullProfile = {
    displayName: "Aarav Mehta",
    educationLevel: "Undergraduate",
    fieldOfStudy: "Computer Science",
    studyYear: "3rd Year",
    bio: "I turn messy workflows into simple, friendly digital products for local shops.",
    skills: ["React", "TypeScript", "Tailwind CSS"],
    interests: ["Retail technology"],
    preferredCategories: ["Web development"],
    availability: { hoursPerWeek: 12, schedulePreference: "Flexible" as const },
    visibility: "public_to_businesses" as const,
    id: "sp-s1",
    userId: "s1",
    learningGoals: [],
    createdAt: "",
    updatedAt: "",
  };

  const samplePortfolio = [
    {
      id: "p1",
      studentId: "sp-s1",
      title: "Store Counter",
      description: "Description of the store counter web application.",
      skillsUsed: ["React"],
      createdAt: "",
      updatedAt: "",
    },
  ];

  const fullRes = calculateProfileCompleteness(fullProfile, samplePortfolio);
  assert.equal(fullRes.score, 100);
  assert.equal(fullRes.checklist.every((c) => c.completed), true);
});

// ==========================================
// 6. MEMBER 5 MATCHING DTO & PRIVACY RULES
// ==========================================
test("Candidate Matching DTO: strictly omits private contact info and session secrets", () => {
  const sampleProfile = {
    id: "sp-s1",
    userId: "s1",
    displayName: "Aarav Mehta",
    bio: "Passionate about building software for local stores.",
    educationLevel: "B.Tech",
    fieldOfStudy: "Computer Science",
    studyYear: "3rd Year",
    skills: ["React", "TypeScript"],
    interests: ["Kirana digitisation"],
    learningGoals: ["PostgreSQL optimization"],
    preferredCategories: ["Web development"],
    availability: { hoursPerWeek: 12, schedulePreference: "Flexible" as const },
    visibility: "public_to_businesses" as const,
    createdAt: "2025-08-12T00:00:00.000Z",
    updatedAt: "2025-08-12T00:00:00.000Z",
  };

  const candidateDTO = transformToCandidateMatchingDTO(sampleProfile, []);

  // Assert sensitive fields are ABSENT
  assert.equal((candidateDTO as any).email, undefined);
  assert.equal((candidateDTO as any).userId, undefined);
  assert.equal(candidateDTO.isVerified, false, "Honest indicator: unverified claims");
  assert.equal(candidateDTO.displayName, "Aarav Mehta");
  assert.deepEqual(candidateDTO.skills, ["React", "TypeScript"]);
});

test("Structured Profile Text: deterministic output with clearly separated aspirations", () => {
  const sampleProfile = {
    id: "sp-s1",
    userId: "s1",
    displayName: "Aarav Mehta",
    bio: "Frontend builder.",
    educationLevel: "Undergraduate",
    fieldOfStudy: "IT",
    studyYear: "3rd Year",
    skills: ["React", "CSS"],
    interests: ["E-commerce"],
    learningGoals: ["Deep Learning"],
    preferredCategories: ["Web development"],
    availability: { hoursPerWeek: 10, schedulePreference: "Flexible" as const },
    visibility: "public_to_businesses" as const,
    createdAt: "",
    updatedAt: "",
  };

  const text = generateStructuredProfileTextForMatching(sampleProfile, [
    {
      id: "port-1",
      studentId: "sp-s1",
      title: "Order Desk",
      role: "Lead",
      description: "Order booking system",
      skillsUsed: ["React"],
      createdAt: "",
      updatedAt: "",
    },
  ]);

  assert.match(text, /STUDENT CANDIDATE OVERVIEW \(Self-reported\)/);
  assert.match(text, /Current Practiced Skills: React, CSS/);
  assert.match(text, /Aspirational Learning Goals \(Not yet mastered\): Deep Learning/);
  assert.match(text, /Project 1: Order Desk \| Role: Lead/);
});

// ==========================================
// 7. DATABASE SERVICE CRUD & OWNERSHIP CHECK
// ==========================================
test("Student Profile Service: fetch and update authenticated student profile", async () => {
  const profile = await getStudentProfileByUserId("s1");
  assert.ok(profile);
  assert.equal(profile?.userId, "s1");

  const updated = await updateStudentProfile("s1", {
    displayName: "Aarav Mehta (Verified Test)",
    bio: "Updated bio for test suite.",
  });

  assert.equal(updated.displayName, "Aarav Mehta (Verified Test)");
  assert.equal(updated.bio, "Updated bio for test suite.");
});

test("Portfolio Ownership: student cannot update or delete another student's item", async () => {
  // s1 owns port-1
  // Attempt update from Maya Shah's profile (sp-s2)
  const forbiddenUpdate = await updatePortfolioItem("sp-s2", "port-1", {
    title: "Hacked Title",
  });
  assert.equal(forbiddenUpdate, null, "Should return null when unauthorized");

  // Attempt delete from Maya Shah's profile (sp-s2)
  const forbiddenDelete = await deletePortfolioItem("sp-s2", "port-1");
  assert.equal(forbiddenDelete.success, false);
  assert.equal(forbiddenDelete.unauthorized, true, "Should report unauthorized");

  // Delete non-existent item
  const notFoundDelete = await deletePortfolioItem("sp-s1", "non-existent-id");
  assert.equal(notFoundDelete.success, false);
  assert.equal(notFoundDelete.notFound, true);
});

test("Portfolio CRUD: authorized student can create, update, and delete own project", async () => {
  const created = await createPortfolioItem("sp-s1", {
    title: "Automated Verification Test Tool",
    description: "Built a test tool for local automated tests with full verification.",
    role: "Quality Engineer",
    skillsUsed: ["Node.js", "TypeScript"],
    projectUrl: "https://example.com/test-project",
  });

  assert.ok(created.id);
  assert.equal(created.title, "Automated Verification Test Tool");

  // Update
  const updated = await updatePortfolioItem("sp-s1", created.id, {
    title: "Updated Test Project Title",
  });
  assert.ok(updated);
  assert.equal(updated?.title, "Updated Test Project Title");

  // Delete
  const deleted = await deletePortfolioItem("sp-s1", created.id);
  assert.equal(deleted.success, true);
});
