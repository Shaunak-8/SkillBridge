import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import '@cometchat/chat-uikit-react/styles';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/context';

export const metadata: Metadata = {
  title: 'SkillBridge - local problems, meaningful projects',
  description: 'A skills-first marketplace connecting local businesses and students.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialLocale = cookieStore.get('skillbridge_locale')?.value || 'en';

  return (
    <html lang={initialLocale}>
      <body>
        <LanguageProvider initialLocale={initialLocale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
