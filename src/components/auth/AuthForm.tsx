'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { authClient } from '@/lib/auth/client';
import { email, password, username } from '@/lib/auth/validation';

export function AuthForm({ mode }: { mode: 'login' | 'signup' | 'forgot' | 'reset' | 'verify' }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [show, setShow] = useState(false);
  const titles = { login: 'Welcome back', signup: 'Create your account', forgot: 'Forgot your password?', reset: 'Choose a new password', verify: 'Verify your email' };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const address = mode === 'reset' ? '' : email(form.get('email'));
      const secret = String(form.get('password') ?? '');
      if (mode === 'signup' || mode === 'reset') {
        password(secret);
        if (secret !== form.get('confirmPassword')) throw new Error('Passwords do not match.');
      }
      if (mode === 'signup') {
        const result = await authClient.signUp.email({ email: address, name: username(form.get('username')), password: secret, callbackURL: `${window.location.origin}/auth/continue` });
        if (result.error) throw new Error(result.error.message || 'Unable to create your account.');
        if (!result.data?.user?.emailVerified) { setMessage('Account created. Verify your email before continuing.'); router.replace('/verify-email'); router.refresh(); return; }
      } else if (mode === 'login') {
        const result = await authClient.signIn.email({ email: address, password: secret });
        if (result.error) throw new Error(result.error.message || 'Unable to sign in.');
      } else if (mode === 'forgot') {
        const result = await authClient.requestPasswordReset({ email: address, redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw new Error('Unable to send a reset request. Please try again later.');
        setMessage('If an account exists, a reset email will arrive shortly.'); return;
      } else if (mode === 'reset') {
        const token = new URLSearchParams(window.location.search).get('token');
        if (!token) throw new Error('This reset link is invalid. Request a new one.');
        const result = await authClient.resetPassword({ newPassword: secret, token });
        if (result.error) throw new Error('This reset link has expired or is invalid. Request a new one.');
        setMessage('Password updated. You can now sign in.'); return;
      } else {
        const result = await authClient.emailOtp.verifyEmail({ email: address, otp: String(form.get('otp')) });
        if (result.error) throw new Error('The code is invalid or expired. Request a new code.');
        setMessage('Email verified. Sign in to continue.'); return;
      }
      router.replace('/auth/continue'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setMessage('');
    try {
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: `${window.location.origin}/auth/continue`, newUserCallbackURL: `${window.location.origin}/auth/continue`, errorCallbackURL: `${window.location.origin}/login?oauthError=1` });
      if (result.error) throw new Error('Google sign-in is unavailable. Please try again.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Google sign-in failed.'); }
    finally { setBusy(false); }
  }
  async function resend(form: HTMLFormElement) {
    setBusy(true); setMessage('');
    try {
      const address = email(new FormData(form).get('email'));
      const result = await authClient.emailOtp.sendVerificationOtp({ email: address, type: 'email-verification' });
      if (result.error) throw new Error('Unable to send verification. Please try again later.');
      setMessage('If verification is available for this account, a code will arrive shortly.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12"><Card className="w-full max-w-md p-7">
    <Link href="/" className="mb-8 block text-lg font-bold text-brand">SkillBridge</Link>
    <h1 className="text-2xl font-bold">{titles[mode]}</h1><p className="mt-2 text-sm text-muted">Connect your skills with real local opportunities.</p>
    {(mode === 'login' || mode === 'signup') && <><Button variant="secondary" className="mt-6 w-full" disabled={busy} onClick={google}>Continue with Google</Button><p className="my-5 text-center text-xs text-muted">or continue with email</p></>}
    <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={busy}>
      {mode === 'signup' && <label className="block text-sm font-semibold">Username<Input name="username" autoComplete="username" required pattern="[a-zA-Z0-9_]{3,30}" minLength={3} maxLength={30} className="mt-2" /><span className="mt-1 block text-xs font-normal text-muted">3–30 letters, numbers or underscores. Confirmed during onboarding.</span></label>}
      {mode !== 'reset' && <label className="block text-sm font-semibold">Email<Input name="email" type="email" autoComplete="email" maxLength={254} required className="mt-2" /></label>}
      {['signup', 'login', 'reset'].includes(mode) && <><label className="block text-sm font-semibold">Password<Input name="password" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 1 : 12} maxLength={128} required className="mt-2" /></label><button type="button" onClick={() => setShow(!show)} className="text-xs font-semibold text-brand" aria-pressed={show}>{show ? 'Hide' : 'Show'} passwords</button></>}
      {(mode === 'signup' || mode === 'reset') && <><p className="text-xs text-muted">12–128 characters with uppercase, lowercase, a number and a symbol.</p><label className="block text-sm font-semibold">Confirm password<Input name="confirmPassword" type={show ? 'text' : 'password'} autoComplete="new-password" required className="mt-2" /></label></>}
      {mode === 'verify' && <label className="block text-sm font-semibold">Verification code<Input name="otp" autoComplete="one-time-code" inputMode="numeric" required className="mt-2" /></label>}
      <p role="status" aria-live="polite" className="text-sm text-brand-dark">{message}</p>
      <Button className="w-full" disabled={busy}>{busy ? 'Please wait…' : { login: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Update password', verify: 'Verify email' }[mode]}</Button>
      {mode === 'verify' && <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={e => resend(e.currentTarget.form!)}>Send a new code</Button>}
    </form>
    {mode === 'login' && <><Link className="mt-5 block text-sm text-brand" href="/forgot-password">Forgot password?</Link><Link className="mt-3 block text-sm text-brand" href="/verify-email">Verify your email</Link></>}
    <p className="mt-6 text-sm text-muted">{mode === 'login' ? <Link href="/signup">New to SkillBridge? Create an account</Link> : <Link href="/login">Back to sign in</Link>}</p>
  </Card></main>;
}
