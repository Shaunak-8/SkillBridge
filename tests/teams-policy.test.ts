import { describe, expect, it } from 'vitest';
import {
  INVITE_TTL_DAYS, TEAM_MAX_SIZE, TEAM_MIN_SIZE,
  applicationKindAllowed, canAssignTasks, canCreateTask, canEditTask, canManageTeam, canMoveTask,
  hasValidTeamSize, inviteExpiry, isInviteExpired, isWorkspaceWritable, memberProgress, teamProgress,
  type TaskStatus,
} from '@/lib/teams/policy';

const task = (status: TaskStatus, assignee: string | null = null) => ({ status, assigneeId: assignee });

describe('team size', () => {
  it('requires between 2 and 5 active members', () => {
    expect([TEAM_MIN_SIZE, TEAM_MAX_SIZE]).toEqual([2, 5]);
    expect([0, 1].map(hasValidTeamSize)).toEqual([false, false]);
    expect([2, 3, 4, 5].map(hasValidTeamSize)).toEqual([true, true, true, true]);
    expect(hasValidTeamSize(6)).toBe(false);
  });
});

describe('application kind by project mode', () => {
  it('lets individual projects accept solo applications only', () => {
    expect(applicationKindAllowed('individual', 'solo')).toBe(true);
    expect(applicationKindAllowed('individual', 'team')).toBe(false);
  });
  it('lets team projects accept a team or a solo applicant', () => {
    expect(applicationKindAllowed('team', 'team')).toBe(true);
    expect(applicationKindAllowed('team', 'solo')).toBe(true);
  });
});

describe('invites', () => {
  it('expire after the configured number of days', () => {
    const sent = new Date('2026-10-01T00:00:00Z');
    const expires = inviteExpiry(sent);
    expect(expires.getTime() - sent.getTime()).toBe(INVITE_TTL_DAYS * 86_400_000);
    expect(isInviteExpired(expires, new Date(expires.getTime() - 1))).toBe(false);
    expect(isInviteExpired(expires, expires)).toBe(true);
  });
});

describe('team management permissions', () => {
  it('lets only the leader manage a forming or active team', () => {
    expect(canManageTeam('leader', 'forming')).toBe(true);
    expect(canManageTeam('leader', 'active')).toBe(true);
    expect(canManageTeam('member', 'active')).toBe(false);
    expect(canManageTeam(null, 'active')).toBe(false);
  });
  it('freezes management once the team is archived or disbanded', () => {
    expect(canManageTeam('leader', 'archived')).toBe(false);
    expect(canManageTeam('leader', 'disbanded')).toBe(false);
  });
  it('makes the workspace writable only while the team is active', () => {
    expect(isWorkspaceWritable('active')).toBe(true);
    expect(isWorkspaceWritable('forming')).toBe(false);
    expect(isWorkspaceWritable('archived')).toBe(false);
    expect(isWorkspaceWritable('disbanded')).toBe(false);
  });
});

describe('task permissions', () => {
  it('lets only the leader assign tasks', () => {
    expect(canAssignTasks('leader')).toBe(true);
    expect(canAssignTasks('member')).toBe(false);
    expect(canAssignTasks(null)).toBe(false);
  });
  it('lets members create only tasks assigned to themselves', () => {
    expect(canCreateTask('leader', false)).toBe(true);
    expect(canCreateTask('member', true)).toBe(true);
    expect(canCreateTask('member', false)).toBe(false);
    expect(canCreateTask(null, true)).toBe(false);
  });
  it('lets only the leader edit or reassign a task', () => {
    expect(canEditTask('leader')).toBe(true);
    expect(canEditTask('member')).toBe(false);
  });
  it('lets a member move only their own tasks up to review', () => {
    expect(canMoveTask('member', true, 'todo', 'in_progress')).toBe(true);
    expect(canMoveTask('member', true, 'in_progress', 'review')).toBe(true);
    expect(canMoveTask('member', true, 'review', 'in_progress')).toBe(true);
    expect(canMoveTask('member', false, 'todo', 'in_progress')).toBe(false);
  });
  it('requires the leader to approve a task as done', () => {
    expect(canMoveTask('member', true, 'review', 'done')).toBe(false);
    expect(canMoveTask('leader', false, 'review', 'done')).toBe(true);
  });
  it('stops a member from reopening a done task but lets the leader', () => {
    expect(canMoveTask('member', true, 'done', 'todo')).toBe(false);
    expect(canMoveTask('leader', false, 'done', 'in_progress')).toBe(true);
  });
  it('treats a no-op move as not allowed', () => {
    expect(canMoveTask('leader', false, 'todo', 'todo')).toBe(false);
  });
  it('gives outsiders nothing', () => {
    expect(canMoveTask(null, false, 'todo', 'in_progress')).toBe(false);
  });
});

describe('progress', () => {
  const tasks = [
    task('done', 'a'), task('done', 'a'), task('review', 'a'), task('todo', 'a'),
    task('in_progress', 'b'), task('todo', 'b'),
    task('todo'),
  ];
  it('computes per-member progress from assigned tasks', () => {
    expect(memberProgress(tasks, 'a')).toEqual({ total: 4, done: 2, inReview: 1, percent: 50 });
    expect(memberProgress(tasks, 'b')).toEqual({ total: 2, done: 0, inReview: 0, percent: 0 });
  });
  it('reports zero progress for a member with no tasks', () => {
    expect(memberProgress(tasks, 'nobody')).toEqual({ total: 0, done: 0, inReview: 0, percent: 0 });
  });
  it('computes team progress across all tasks, including unassigned ones', () => {
    expect(teamProgress(tasks)).toEqual({ total: 7, done: 2, inReview: 1, percent: 29 });
    expect(teamProgress([])).toEqual({ total: 0, done: 0, inReview: 0, percent: 0 });
  });
});
