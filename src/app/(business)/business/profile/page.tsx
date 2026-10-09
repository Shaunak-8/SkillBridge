import { SectionTitle } from '@/components/ui';
import { BusinessProfileForm } from '@/components/business/BusinessProfileForm';
import { businessPage } from '@/lib/business/pages';
export default async function Page() { const { business } = await businessPage(); return <><SectionTitle title="Business profile" description="Keep your business details up to date." /><BusinessProfileForm profile={business} /></>; }
