export const APPLICATION_STATUSES = ['submitted', 'viewed', 'shortlisted', 'accepted', 'declined', 'withdrawn'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type ApplicationActor = 'business_owner' | 'applicant';

const TRANSITIONS: Record<ApplicationActor, Partial<Record<ApplicationStatus, readonly ApplicationStatus[]>>> = {
  business_owner: {
    submitted: ['viewed', 'shortlisted', 'declined'],
    viewed: ['shortlisted', 'declined'],
    shortlisted: ['accepted', 'declined'],
  },
  applicant: {
    submitted: ['withdrawn'],
    viewed: ['withdrawn'],
    shortlisted: ['withdrawn'],
  },
};

export const TERMINAL_STATUSES: readonly ApplicationStatus[] = ['accepted', 'declined', 'withdrawn'];

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function allowedNextStatuses(from: ApplicationStatus, actor: ApplicationActor): readonly ApplicationStatus[] {
  return TRANSITIONS[actor][from] ?? [];
}

export function canTransition(from: ApplicationStatus, to: ApplicationStatus, actor: ApplicationActor): boolean {
  return allowedNextStatuses(from, actor).includes(to);
}
