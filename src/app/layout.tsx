import type { Metadata } from 'next';
import '@cometchat/chat-uikit-react/styles';
import './globals.css';
export const metadata: Metadata = { title: 'SkillBridge - local problems, meaningful projects', description: 'A skills-first marketplace connecting local businesses and students.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
