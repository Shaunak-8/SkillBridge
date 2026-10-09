import Link from 'next/link';
import { Card } from '@/components/ui';
export default function NotFound() { return <Card className="p-8"><h1 className="text-xl font-bold">Project not found</h1><p className="mt-3 text-sm text-muted">This project is unavailable or does not belong to your business.</p><Link href="/business/projects" className="mt-4 inline-flex min-h-11 items-center text-brand">Back to my projects</Link></Card>; }
