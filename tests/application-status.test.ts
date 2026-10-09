import { describe, expect, it } from 'vitest';
import { APPLICATION_STATUSES, allowedNextStatuses, canTransition, isApplicationStatus, type ApplicationStatus } from '@/lib/applications/status';

const OWNER_VALID: [ApplicationStatus, ApplicationStatus][] = [
  ['submitted', 'viewed'], ['submitted', 'shortlisted'], ['submitted', 'declined'],
  ['viewed', 'shortlisted'], ['viewed', 'declined'],
  ['shortlisted', 'accepted'], ['shortlisted', 'declined'],
];
const APPLICANT_VALID: [ApplicationStatus, ApplicationStatus][] = [
  ['submitted', 'withdrawn'], ['viewed', 'withdrawn'], ['shortlisted', 'withdrawn'],
];
const pairs = APPLICATION_STATUSES.flatMap((f) => APPLICATION_STATUSES.map((t) => [f, t] as const));

describe('application status transitions', () => {
  it.each(OWNER_VALID)('owner may move %s to %s', (from, to) => {
    expect(canTransition(from, to, 'business_owner')).toBe(true);
  });

  it.each(APPLICANT_VALID)('applicant may move %s to %s', (from, to) => {
    expect(canTransition(from, to, 'applicant')).toBe(true);
  });

  it('rejects every owner transition outside the table', () => {
    const invalid = pairs.filter(([f, t]) => !OWNER_VALID.some(([a, b]) => a === f && b === t));
    expect(invalid.length).toBeGreaterThan(0);
    for (const [f, t] of invalid) expect(canTransition(f, t, 'business_owner')).toBe(false);
  });

  it('rejects every applicant transition outside the table', () => {
    const invalid = pairs.filter(([f, t]) => !APPLICANT_VALID.some(([a, b]) => a === f && b === t));
    for (const [f, t] of invalid) expect(canTransition(f, t, 'applicant')).toBe(false);
  });

  it('treats accepted, declined and withdrawn as terminal for both actors', () => {
    for (const from of ['accepted', 'declined', 'withdrawn'] as const) {
      expect(allowedNextStatuses(from, 'business_owner')).toEqual([]);
      expect(allowedNextStatuses(from, 'applicant')).toEqual([]);
    }
  });

  it('rejects actor mismatch: applicant cannot shortlist, owner cannot withdraw', () => {
    expect(canTransition('submitted', 'shortlisted', 'applicant')).toBe(false);
    expect(canTransition('submitted', 'withdrawn', 'business_owner')).toBe(false);
  });

  it('rejects skipping states and same-state transitions', () => {
    expect(canTransition('submitted', 'accepted', 'business_owner')).toBe(false);
    expect(canTransition('viewed', 'viewed', 'business_owner')).toBe(false);
  });

  it('lists allowed next states for an owner on a submitted application', () => {
    expect(allowedNextStatuses('submitted', 'business_owner')).toEqual(['viewed', 'shortlisted', 'declined']);
  });

  it('validates status strings', () => {
    expect(isApplicationStatus('viewed')).toBe(true);
    expect(isApplicationStatus('hired')).toBe(false);
    expect(isApplicationStatus(undefined)).toBe(false);
  });
});
