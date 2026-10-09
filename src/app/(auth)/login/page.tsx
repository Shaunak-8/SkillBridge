import { AuthForm } from '@/components/auth/AuthForm';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ oauthError?: string }> }) {
  const { oauthError } = await searchParams;
  return <>{oauthError && <p role="alert" className="bg-red-50 p-4 text-center text-red-700">Google sign-in did not finish. Please try again.</p>}<AuthForm mode="login" /></>;
}
