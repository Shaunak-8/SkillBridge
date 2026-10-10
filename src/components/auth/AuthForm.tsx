'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { authClient } from '@/lib/auth/client';
import { email, password, username } from '@/lib/auth/validation';
import { loginDestination } from '@/lib/auth/login-destination';

export function AuthForm({ mode, notice = '' }: { mode: 'login' | 'signup' | 'forgot' | 'reset' | 'verify'; notice?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(notice);
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Keep only the email in this tab; never retain passwords or verification codes.
    if (mode !== 'verify') return;
    try {
      const input = formRef.current?.elements.namedItem('email');
      if (input instanceof HTMLInputElement && !input.value) input.value = sessionStorage.getItem('skillbridge-verification-email') || '';
    } catch { /* Storage restrictions must not prevent manual email entry. */ }
  }, [mode]);
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
        if (!result.data?.user?.emailVerified) {
          try { sessionStorage.setItem('skillbridge-verification-email', address); } catch {}
          // Neon shared SMTP supports codes. Explicitly request one for this UI.
          let sent = false;
          try { sent = !(await authClient.emailOtp.sendVerificationOtp({ email: address, type: 'email-verification' })).error; } catch {}
          window.location.replace(sent ? '/verify-email' : '/verify-email?delivery=retry'); return;
        }
      } else if (mode === 'login') {
        const result = await authClient.signIn.email({ email: address, password: secret });
        if (result.error) throw new Error(result.error.message || 'Unable to sign in.');
        if (!result.data?.user?.id) throw new Error('Sign-in did not complete. Please try again.');
        const destination = await loginDestination(result.data.user.id);
        window.location.replace(destination);
        return;
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
        try { sessionStorage.removeItem('skillbridge-verification-email'); } catch {}
        const session = await authClient.getSession();
        if (session.data?.user?.id && session.data.user.emailVerified) {
          window.location.replace(await loginDestination(session.data.user.id));
        } else window.location.replace('/login?verified=1');
        return;
      }
      // Start a fresh document with the new HttpOnly cookie; don't reuse an
      // anonymous prefetched redirect or race replace() against refresh().
      window.location.replace('/auth/continue');
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
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-5 py-12">
      <Card className="w-full max-w-md p-8 bg-white border-2 border-[#111111] shadow-[6px_6px_0_#111111]">
        <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl border-2 border-[#111111] bg-[#D83D63] text-white font-black text-xs shadow-[2px_2px_0_#111111]">
            SB
          </div>
          <span className="text-xl font-black text-[#151515] tracking-tight">
            SkillBridge
          </span>
        </Link>
        <h1 className="text-2xl font-black text-[#151515]">{titles[mode]}</h1>
        <p className="mt-1.5 text-xs font-medium text-[#655F52]">
          Connect your skills with real local opportunities.
        </p>

        {(mode === 'login' || mode === 'signup') && (
          <>
            <Button
              variant="secondary"
              className="mt-6 w-full"
              disabled={busy}
              onClick={google}
            >
              Continue with Google
            </Button>
            <div className="my-5 flex items-center gap-3">
              <div className="h-0.5 flex-1 bg-[#111111]/15" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#655F52]">
                or email
              </span>
              <div className="h-0.5 flex-1 bg-[#111111]/15" />
            </div>
          </>
        )}

        {mode === 'verify' && <p className="mt-4 text-xs font-medium text-[#655F52]">Enter the code sent to your email. Check your spam folder too. If it hasn’t arrived, use “Send a new code” below.</p>}
        <form ref={formRef} onSubmit={submit} className="mt-4 space-y-4" aria-busy={busy}>
          {mode === 'signup' && (
            <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
              Username
              <Input
                name="username"
                autoComplete="username"
                required
                pattern="[a-zA-Z0-9_]{3,30}"
                minLength={3}
                maxLength={30}
                className="mt-1.5"
              />
              <span className="mt-1 block text-[11px] font-medium text-[#655F52]">
                3–30 letters, numbers or underscores. Confirmed during onboarding.
              </span>
            </label>
          )}

          {mode !== 'reset' && (
            <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
              Email
              <Input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                className="mt-1.5"
              />
            </label>
          )}

          {['signup', 'login', 'reset'].includes(mode) && (
            <>
              <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
                Password
                <Input
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'login' ? 1 : 12}
                  maxLength={128}
                  required
                  className="mt-1.5"
                />
              </label>
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="text-xs font-bold text-[#D83D63] hover:underline"
                aria-pressed={show}
              >
                {show ? 'Hide password' : 'Show password'}
              </button>
            </>
          )}

          {(mode === 'signup' || mode === 'reset') && (
            <>
              <p className="text-[11px] font-medium text-[#655F52]">
                12–128 characters with uppercase, lowercase, a number and a symbol.
              </p>
              <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
                Confirm password
                <Input
                  name="confirmPassword"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1.5"
                />
              </label>
            </>
          )}

          {mode === 'verify' && (
            <label className="block text-xs font-black uppercase tracking-wider text-[#151515]">
              Verification code
              <Input
                name="otp"
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                className="mt-1.5"
              />
            </label>
          )}

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="text-xs font-bold text-[#D83D63] bg-[#FCE8ED] p-2.5 rounded-lg border border-[#D83D63]/30"
            >
              {message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? 'Please wait…'
              : {
                  login: 'Sign in',
                  signup: 'Create account',
                  forgot: 'Send reset link',
                  reset: 'Update password',
                  verify: 'Verify email',
                }[mode]}
          </Button>

          {mode === 'verify' && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy}
              onClick={(e) => resend(e.currentTarget.form!)}
            >
              Send a new code
            </Button>
          )}
        </form>

        {mode === 'login' && (
          <div className="mt-5 space-y-1.5 text-xs font-bold">
            <Link className="block text-[#D83D63] hover:underline" href="/forgot-password">
              Forgot password?
            </Link>
            <Link className="block text-[#655F52] hover:underline" href="/verify-email">
              Verify your email
            </Link>
          </div>
        )}

        <p className="mt-6 text-xs font-semibold text-[#655F52] border-t-2 border-[#111111]/10 pt-4">
          {mode === 'login' ? (
            <Link href="/signup" className="hover:text-[#151515]">
              New to SkillBridge? <span className="text-[#D83D63] font-bold underline">Create an account</span>
            </Link>
          ) : (
            <Link href="/login" className="hover:text-[#151515]">
              Already have an account? <span className="text-[#D83D63] font-bold underline">Back to sign in</span>
            </Link>
          )}
        </p>
      </Card>
    </main>
  );

}
