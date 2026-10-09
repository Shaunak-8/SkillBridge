import { Card } from '@/components/ui';
import { requireRole } from '@/lib/auth/profile';
import type { Role } from '@/types';
export async function ProfileCard({ role }: { role: Role }) {
  const { profile } = await requireRole(role);
  return <Card className="max-w-2xl p-7"><h1 className="text-2xl font-bold">Your SkillBridge profile</h1><dl className="mt-6 grid gap-5 sm:grid-cols-2">{[['Name', profile.full_name], ['Username', profile.username], ['Email', profile.email], ['Role', profile.role]].map(([label, value]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl></Card>;
}
