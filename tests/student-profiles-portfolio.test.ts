// tests/student-profiles-portfolio.test.ts
// Comprehensive automated test suite for Workstream 4: Student Profiles & Portfolio
// Covers:
// 1. Skill tag normalization, deduplication & bounding
// 2. Safe URL sanitization (protocol injection prevention)
// 3. Portfolio input validation (lengths, counts, sanitized fields)
// 4. Profile update validation (bio, name, availability ranges, visibility options)
// 5. Profile completeness calculation & actionable suggestions
// DB/API behaviour lives in students-api.test.ts
import { expect, it } from "vitest";

import {
  normalizeTagList,
  validateSafeUrl,
  validatePortfolioInput,
  validateProfileUpdate,
  calculateProfileCompleteness,
} from "@/lib/validation/student";

// ==========================================
// 1. SKILL TAG NORMALIZATION & DEDUPLICATION
// ==========================================
it("Skill Tag Normalization: whitespace trimming, casing, and duplicate prevention", () => {
  const input = ["  React  ", "react", "REACT", "  Next.js   Framework  ", "", "   "];
  const { valid, errors } = normalizeTagList(input, 10, 40);

  expect(errors.length).toBe(0);
  expect(valid.length).toBe(2);
  expect(valid[0]).toBe("React");
  expect(valid[1]).toBe("Next.js Framework");
});

it("Skill Tag Normalization: enforces maximum tag length and item counts", () => {
  const longTag = "a".repeat(45);
  const { valid, errors } = normalizeTagList([longTag, "ValidSkill"], 10, 40);

  expect(valid.length).toBe(1);
  expect(valid[0]).toBe("ValidSkill");
  expect(errors.length).toBe(1);
  expect(errors[0]).toMatch(/exceeds max length/);
});

// ==========================================
// 2. URL SAFETY & PROTOCOL SANITIZATION
// ==========================================
it("URL Validation: accepts valid HTTP and HTTPS URLs", () => {
  const resHttp = validateSafeUrl("http://example.com/project");
  expect(resHttp.valid).toBe(true);
  expect(resHttp.normalized).toBe("http://example.com/project");

  const resHttps = validateSafeUrl("https://github.com/student/repo");
  expect(resHttps.valid).toBe(true);
  expect(resHttps.normalized).toBe("https://github.com/student/repo");
});

it("URL Validation: strictly rejects script schemes and data URLs (XSS prevention)", () => {
  const resJs = validateSafeUrl("javascript:alert('XSS')");
  expect(resJs.valid).toBe(false);
  expect(resJs.error!).toMatch(/standard http/);

  const resData = validateSafeUrl("data:text/html,<script>alert(1)</script>");
  expect(resData.valid).toBe(false);

  const resVbs = validateSafeUrl("vbscript:MsgBox(1)");
  expect(resVbs.valid).toBe(false);

  const resInvalid = validateSafeUrl("not-a-valid-url");
  expect(resInvalid.valid).toBe(false);
});

// ==========================================
// 3. PORTFOLIO INPUT VALIDATION
// ==========================================
it("Portfolio Validation: validates title length boundaries (3 - 120 chars)", () => {
  const tooShort = validatePortfolioInput({ title: "Hi", description: "Valid project description here" });
  expect(tooShort.valid).toBe(false);
  expect(tooShort.errors.title).toBeTruthy();

  const tooLong = validatePortfolioInput({
    title: "T".repeat(125),
    description: "Valid project description here",
  });
  expect(tooLong.valid).toBe(false);
  expect(tooLong.errors.title).toBeTruthy();
});

it("Portfolio Validation: validates description length (10 - 2,000 chars)", () => {
  const shortDesc = validatePortfolioInput({ title: "Valid Title", description: "Too short" });
  expect(shortDesc.valid).toBe(false);
  expect(shortDesc.errors.description).toBeTruthy();

  const validItem = validatePortfolioInput({
    title: "Kirana Store Counter",
    description: "This is a practical project for a local grocery shop to track orders.",
    role: "Lead Developer",
    skillsUsed: ["React", "TypeScript"],
    projectUrl: "https://example.com/demo",
  });
  expect(validItem.valid).toBe(true);
  expect(validItem.sanitized?.title).toBe("Kirana Store Counter");
  expect(validItem.sanitized?.skillsUsed?.length).toBe(2);
});

// ==========================================
// 4. PROFILE UPDATE VALIDATION
// ==========================================
it("Profile Update Validation: validates bio, name, availability, and visibility", () => {
  const emptyName = validateProfileUpdate({ displayName: "   " });
  expect(emptyName.valid).toBe(false);
  expect(emptyName.errors.displayName).toBeTruthy();

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

  expect(validUpdate.valid).toBe(true);
  expect(validUpdate.sanitized?.skills?.length).toBe(2);
  expect(validUpdate.sanitized?.availability?.hoursPerWeek).toBe(15);
  expect(validUpdate.sanitized?.visibility).toBe("public_to_businesses");
});

// ==========================================
// 5. PROFILE COMPLETENESS CALCULATION
// ==========================================
it("Profile Completeness: transparent suggestions and score calculation", () => {
  const emptyProfile = { displayName: "", bio: "", skills: [] };
  const emptyRes = calculateProfileCompleteness(emptyProfile, []);
  expect(emptyRes.score).toBe(0);
  expect(emptyRes.checklist.length >= 5).toBeTruthy();

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
  expect(fullRes.score).toBe(100);
  expect(fullRes.checklist.every((c) => c.completed)).toBe(true);
});

