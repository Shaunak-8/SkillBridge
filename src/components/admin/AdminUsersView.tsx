'use client';

import { useState } from 'react';
import { User, ShieldCheck, Briefcase, GraduationCap, Search, CheckCircle2, Clock } from 'lucide-react';
import { Card, Badge, SectionTitle } from '@/components/ui';

export interface UserProfileRow {
  id: string;
  auth_user_id: string;
  username: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: 'student' | 'business' | 'admin' | string | null;
  onboarding_completed: boolean;
  created_at: string;
}

export function AdminUsersView({ users }: { users: UserProfileRow[] }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'business' | 'admin'>('all');

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const totalCount = users.length;
  const studentCount = users.filter((u) => u.role === 'student').length;
  const businessCount = users.filter((u) => u.role === 'business').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Admin Workspace"
        title="Real Registered Users"
        description="Live data directly from Neon Database (skillbridge.profiles). Zero mock or hardcoded entries."
      />

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
            <User size={20} />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Total Users</p>
            <p className="text-xl font-bold text-ink">{totalCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Students</p>
            <p className="text-xl font-bold text-ink">{studentCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Briefcase size={20} />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Businesses</p>
            <p className="text-xl font-bold text-ink">{businessCount}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-muted font-medium">Admins</p>
            <p className="text-xl font-bold text-ink">{adminCount}</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'student', 'business', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                roleFilter === r
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-canvas text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {r === 'all' ? 'All Roles' : `${r}s`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, username..."
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3.5 py-1.5 text-xs font-medium outline-none focus:border-brand"
          />
        </div>
      </Card>

      {/* Real Users Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-line text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Username & Email</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Onboarding</th>
                <th className="px-5 py-3.5">Registered</th>
                <th className="px-5 py-3.5">Profile ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted">
                    No matching users found in the database.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-semibold text-ink">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand font-bold uppercase text-xs">
                          {user.full_name?.[0] || user.username?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.full_name || 'Unnamed User'}</p>
                          <p className="text-[11px] text-muted font-normal">@{user.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{user.email}</p>
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        tone={
                          user.role === 'admin'
                            ? 'purple'
                            : user.role === 'business'
                            ? 'green'
                            : user.role === 'student'
                            ? 'amber'
                            : 'default'
                        }
                      >
                        {user.role || 'Unassigned'}
                      </Badge>
                    </td>

                    <td className="px-5 py-4">
                      {user.onboarding_completed ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          <CheckCircle2 size={14} /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                          <Clock size={14} /> Pending
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-500 font-medium">
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(
                        new Date(user.created_at)
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      {user.id.slice(0, 8)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
