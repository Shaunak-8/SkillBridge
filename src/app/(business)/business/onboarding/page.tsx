import { requireRole } from '@/lib/auth/profile';
import { getBusiness } from '@/lib/business/service';
import { SectionTitle } from '@/components/ui';
import { BusinessProfileForm } from '@/components/business/BusinessProfileForm';
export default async function Page() {
  const { profile } = await requireRole('business');
  return <><SectionTitle title="Tell us a little about your business" description="This helps us understand your business and connect you with students who can help." /><BusinessProfileForm profile={await getBusiness(String(profile.id))} onboarding /></>;
}
