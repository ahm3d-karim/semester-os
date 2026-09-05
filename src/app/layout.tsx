import type { Metadata } from 'next';
import Link from 'next/link';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { NavLinks } from './NavLinks';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Semester OS',
    template: '%s · Semester OS',
  },
  description:
    'Upload a syllabus, get a verified semester plan. Every deadline and grade weight checked against its source before it reaches your schedule.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-white text-stone-900 antialiased">
        <nav className="border-b border-stone-200 bg-white sticky top-0 z-50">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span
                aria-hidden="true"
                className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8.5l3.2 3.2L13 5" />
                </svg>
              </span>
              <span className="text-base font-semibold tracking-tight">
                Semester OS
              </span>
            </Link>
            <NavLinks />
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
