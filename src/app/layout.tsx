import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "skillbridge — local problems, meaningful projects", description: "A skills-first marketplace connecting local businesses and students." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
