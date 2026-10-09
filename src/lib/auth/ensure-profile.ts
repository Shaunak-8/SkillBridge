import 'server-only';
import { createHash } from 'node:crypto';
import { database } from '@/lib/db';

type AuthUser = { id: string; email: string; name: string; image?: string | null };
// Identity comes only from a validated Neon session or the upstream signup result.
// A single INSERT is transactional. Retried callbacks keep the original profile.
export async function ensureProfile(user: AuthUser) {
  const fallback = `member_${createHash('sha256').update(user.id).digest('hex').slice(0, 20)}`;
  const desired = /^[a-zA-Z0-9_]{3,30}$/.test(user.name) ? user.name.toLowerCase() : fallback;
  for (const candidate of [desired, fallback]) {
    try {
      await database()`INSERT INTO skillbridge.profiles (auth_user_id, username, email, full_name, avatar_url)
        VALUES (${user.id}, ${candidate}, ${user.email}, ${user.name}, ${user.image ?? null})
        ON CONFLICT (auth_user_id) DO NOTHING`;
      return;
    } catch (error) {
      if ((error as { code?: string }).code !== '23505' || candidate === fallback) throw error;
    }
  }
}
