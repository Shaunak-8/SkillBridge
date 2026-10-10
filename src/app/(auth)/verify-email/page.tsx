import { AuthForm } from '@/components/auth/AuthForm';
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ delivery?: string }> }) {
  const { delivery } = await searchParams;
  return <AuthForm mode="verify" notice={delivery === 'retry' ? 'Your account was created, but the code could not be sent. Please use “Send a new code” to retry.' : undefined} />;
}
