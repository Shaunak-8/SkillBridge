import { SectionTitle } from '@/components/ui';
import { ProblemForm } from '@/components/business/ProblemForm';
import { businessPage } from '@/lib/business/pages';
export default async function Page() { const { business } = await businessPage(); return <><SectionTitle title="What problem can we help you solve?" description="Tell us what is difficult in your business. We’ll help turn it into a clear project for students." /><ProblemForm business={business} /></>; }
