'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import { businessSchema, languages, type BusinessInput, type BusinessProfile } from '@/lib/business/contracts';
import { businessRequest, FormError } from '@/lib/business/client';
import { FormField, controlClass } from './FormField';

export function BusinessProfileForm({ profile, onboarding = false }: { profile: BusinessProfile | null; onboarding?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<BusinessInput>({ business_name: profile?.business_name ?? '', business_type: profile?.business_type ?? '', location: profile?.location ?? '', preferred_language: 'en' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setFields({}); setMessage(''); setFailed(false);
    const parsed = businessSchema.safeParse(form);
    if (!parsed.success) { setFields(Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))); setFailed(true); setMessage('Please check the highlighted fields.'); return; }
    setPending(true);
    try {
      await businessRequest('/api/business/me', 'PATCH', parsed.data);
      setMessage('Your business profile is saved.');
      if (onboarding) router.push('/business/dashboard');
      router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Please try again.'); if (error instanceof FormError) setFields(error.fields); }
    finally { setPending(false); }
  }
  return <Card className="max-w-2xl p-5 sm:p-7"><form onSubmit={submit} className="space-y-6" aria-busy={pending}>
    {(['business_name', 'business_type', 'location'] as const).map(name => <FormField key={name} name={name} label={{ business_name: 'Business name', business_type: 'Business category', location: 'City or general location (optional)' }[name]} error={fields[name]}>
      <input id={name} className={controlClass} value={form[name]} required={name !== 'location'} maxLength={name === 'business_name' ? 120 : name === 'business_type' ? 100 : 200} disabled={pending} aria-invalid={!!fields[name]} aria-describedby={fields[name] ? `${name}-error` : undefined} autoComplete={name === 'business_name' ? 'organization' : name === 'location' ? 'address-level2' : 'off'} onChange={e => setForm({ ...form, [name]: e.target.value })} />
    </FormField>)}
    <FormField name="preferred_language" label="Preferred language" hint="English is available for this launch. More languages will be added after testing." error={fields.preferred_language}>
      <select id="preferred_language" className={controlClass} value={form.preferred_language} disabled={pending} aria-describedby="preferred_language-hint" onChange={() => setForm({ ...form, preferred_language: 'en' })}>{languages.map(language => <option key={language.value} value={language.value}>{language.label}</option>)}</select>
    </FormField>
    {profile && profile.preferred_language !== 'en' && <p className="text-sm text-muted">Your previous language is not supported in this launch. Saving selects English.</p>}
    <p role={failed ? 'alert' : 'status'} className={failed ? 'text-sm text-red-700' : 'text-sm text-emerald-700'}>{message}</p>
    <Button disabled={pending}>{pending ? 'Saving…' : onboarding ? 'Save and continue' : 'Save profile'}</Button>
  </form></Card>;
}
