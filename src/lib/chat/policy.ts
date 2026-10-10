export const CHAT_ROLE = 'skillbridge-member';
export const CHAT_SYSTEM_UID = 'skillbridge-system';
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function internalId(id: string) {
  if (!idPattern.test(id)) throw new Error('Invalid internal chat identifier.');
  return id.toLowerCase();
}
export function chatUid(profileId: string) { return `sb-user-${internalId(profileId)}`; }
export function chatGuid(projectId: string) { return `sb-project-${internalId(projectId)}`; }
export const chatPermissions = {
  createGroup: 'deny', joinGroup: 'deny', editProfile: 'deny', initiateCall: 'deny', joinCall: 'deny',
  'sendMessage.mode': 'friends', 'getUserDetails.mode': 'friends', 'listUsers.mode': 'friends',
  // History is scoped by CometChat to the authenticated conversation participant.
  // Unlike sendMessage, listMessages does not support the "friends" mode: it
  // silently returns no history. Keep user-only history and friend-only sending.
  'listMessages.mode': 'all', 'getMessageDetails.mode': 'friends',
  'sendMessage.allowedReceiverTypes': ['user'],
  'sendMessage.allowedMessageCategories': ['message'],
  'sendMessage.allowedMessageTypes': ['text', 'image', 'file'],
  'listMessages.allowedReceiverTypes': ['user'],
  'listMessages.allowedMessageCategories': ['message'],
  'listMessages.allowedMessageTypes': ['text', 'image', 'file'],
  'listMessages.allowedSenderRoles': [CHAT_ROLE],
} as const;
export const CHAT_APPLICATION_STATUSES = ['submitted', 'viewed', 'reviewing', 'shortlisted', 'accepted'] as const;
export function canChatForApplication(status: string) {
  return (CHAT_APPLICATION_STATUSES as readonly string[]).includes(status);
}
export type ChatProject = { id: string; title: string; guid: string; ownerProfileId: string; memberIds: string[] };
export type ChatPerson = { id: string; name: string; uid: string };
export type ChatMetadata = { uid: string; projects: ChatProject[]; people: ChatPerson[] };
export type ChatSession = ChatMetadata & { authToken: string; expiresAt: string };
export function authorizedEntity(metadata: ChatMetadata, id: string, type: 'user' | 'group') {
  return type === 'user' && metadata.people.some(person => person.uid === id);
}
// Applicants can contact the owner, never other applicants on the same project.
export function chatContacts(projects: ChatProject[], profileId: string) {
  return [...new Set(projects.filter(project => project.memberIds.includes(profileId))
    .flatMap(project => project.ownerProfileId === profileId
      ? project.memberIds.filter(id => id !== profileId) : [project.ownerProfileId]))];
}
