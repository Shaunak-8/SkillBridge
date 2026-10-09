'use client';
import { Button, Card } from '@/components/ui';
export default function ErrorPage({ reset }: { reset: () => void }) { return <Card className="m-5 space-y-4 p-6"><h1 className="text-xl font-bold">We could not load your business workspace</h1><p role="alert" className="text-sm text-muted">Please check your connection and try again.</p><Button onClick={reset}>Try again</Button></Card>; }
