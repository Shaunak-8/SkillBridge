export function username(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(value)) throw new Error('Use 3–30 letters, numbers, or underscores for your username.');
  return value.toLowerCase();
}
export function email(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email address.');
  return value.trim().toLowerCase();
}
export function password(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value) || !/[^a-zA-Z0-9]/.test(value)) throw new Error('Use 12–128 characters with uppercase, lowercase, a number, and a symbol.');
  return value;
}
export function onboardingRole(value: unknown): 'student' | 'business' {
  if (value !== 'student' && value !== 'business') throw new Error('Choose Student or Business.');
  return value;
}
export function dashboardPath(role: string | null) {
  return role === 'student' || role === 'business' || role === 'admin' ? `/${role}/dashboard` : '/onboarding';
}
