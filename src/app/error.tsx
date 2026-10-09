'use client';
import { Button, Card } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-canvas p-5"><Card className="max-w-md p-8"><h1 className="text-xl font-bold">Unable to load SkillBridge</h1><p className="my-5 text-sm text-muted">The service is temporarily unavailable. Please try again.</p><Button onClick={reset}>Try again</Button></Card></main>;
}
