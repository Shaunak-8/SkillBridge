import { describe, expect, it } from 'vitest';
import { createTeamSchema, inviteSchema, respondSchema, searchQuerySchema } from '@/lib/teams/schemas';
import { teamErrorResponse } from '@/lib/teams/errors';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('team input schemas', () => {
  it('trims and bounds the team name and defaults the description', () => {
    expect(createTeamSchema.parse({ name: '  Pixel Pioneers ' })).toEqual({ name: 'Pixel Pioneers', description: '' });
    expect(createTeamSchema.safeParse({ name: 'x' }).success).toBe(false);
    expect(createTeamSchema.safeParse({ name: 'a'.repeat(81) }).success).toBe(false);
    expect(createTeamSchema.safeParse({ name: 'Good name', description: 'd'.repeat(501) }).success).toBe(false);
  });
  it('requires a uuid student id for an invitation', () => {
    expect(inviteSchema.safeParse({ studentId: UUID }).success).toBe(true);
    expect(inviteSchema.safeParse({ studentId: 'nope' }).success).toBe(false);
    expect(inviteSchema.safeParse({}).success).toBe(false);
  });
  it('requires a boolean answer to an invitation', () => {
    expect(respondSchema.safeParse({ accept: true }).success).toBe(true);
    expect(respondSchema.safeParse({ accept: 'yes' }).success).toBe(false);
  });
  it('limits teammate search text', () => {
    expect(searchQuerySchema.safeParse('a').success).toBe(false);
    expect(searchQuerySchema.parse('  ab ')).toBe('ab');
    expect(searchQuerySchema.safeParse('x'.repeat(61)).success).toBe(false);
  });
});

describe('team error mapping', () => {
  it('turns database rule messages into safe user messages', () => {
    expect(teamErrorResponse(new Error('The team is full'))).toEqual({ status: 409, message: expect.stringContaining('full') });
    expect(teamErrorResponse(new Error('The invitation has expired')).status).toBe(410);
    expect(teamErrorResponse(new Error('This student already applied to the project on their own')).status).toBe(409);
    expect(teamErrorResponse(new Error('A team needs 2 to 5 members to apply')).message).toMatch(/at least 2/);
  });
  it('maps a duplicate team name to a conflict', () => {
    const error = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505', constraint: 'teams_project_name_idx' });
    expect(teamErrorResponse(error)).toEqual({ status: 409, message: expect.stringContaining('name') });
  });
  it('maps being active in two teams to a conflict', () => {
    const error = Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'team_members_one_active_per_project_idx' });
    expect(teamErrorResponse(error).status).toBe(409);
  });
  it('explains a frozen roster and an unknown team', () => {
    expect(teamErrorResponse(new Error('The team has already applied, so its roster is final')))
      .toEqual({ status: 409, message: expect.stringContaining('already applied') });
    const error = Object.assign(new Error('violates foreign key'), { code: '23503', constraint: 'applications_team_project_fkey' });
    expect(teamErrorResponse(error).status).toBe(404);
  });
  it('hides anything unrecognised', () => {
    const result = teamErrorResponse(new Error('connection to server at 10.0.0.1 failed: password authentication'));
    expect(result).toEqual({ status: 503, message: 'Something went wrong. Please try again.' });
  });
});
