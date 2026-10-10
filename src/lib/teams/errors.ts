// Maps the messages and constraints raised by migration 011 to safe responses. Anything unrecognised becomes a
// generic 503 so database internals never reach the browser.
interface Mapped { status: number; message: string }

const BY_MESSAGE: [RegExp, Mapped][] = [
  [/The team is full/, { status: 409, message: 'This team is full: members and pending invitations already add up to 5.' }],
  [/The invitation has expired/, { status: 410, message: 'This invitation has expired. Ask the team leader to invite you again.' }],
  [/already applied to the project on their own/, { status: 409, message: 'That student has already applied to this project on their own.' }],
  [/You are on a team for this project/, { status: 409, message: 'You are on a team for this project. Apply through your team.' }],
  [/not open for new members/, { status: 409, message: 'This team is no longer open for new members.' }],
  [/can only be created on a published team project/, { status: 409, message: 'This project does not accept team applications.' }],
  [/team application must come from the team leader/, { status: 403, message: 'Only the team leader can apply for the team.' }],
  [/needs 2 to 5 members to apply/, { status: 409, message: 'Your team needs at least 2 members who accepted before it can apply.' }],
  [/A team needs an active leader/, { status: 409, message: 'Complete your student profile before creating a team.' }],
  [/cannot become/, { status: 409, message: 'That change is not allowed for this team member.' }],
];
const BY_CONSTRAINT: Record<string, Mapped> = {
  teams_project_name_idx: { status: 409, message: 'A team with that name already exists for this project. Choose another name.' },
  team_members_one_active_per_project_idx: { status: 409, message: 'This student is already on a team for this project.' },
  applications_team_idx: { status: 409, message: 'Your team has already applied.' },
};
const GENERIC: Mapped = { status: 503, message: 'Something went wrong. Please try again.' };

export function teamErrorResponse(error: unknown): Mapped {
  const { message = '', constraint } = (error ?? {}) as { message?: string; constraint?: string };
  if (constraint && BY_CONSTRAINT[constraint]) return BY_CONSTRAINT[constraint];
  return BY_MESSAGE.find(([pattern]) => pattern.test(message))?.[1] ?? GENERIC;
}
