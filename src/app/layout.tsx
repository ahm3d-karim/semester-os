import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Semester OS',
  description: 'LUMS syllabus copilot — upload a syllabus, get weekly briefings and grade tracking.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <nav className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-semibold tracking-tight">
              Semester<span className="text-blue-600">OS</span>
            </a>
            <div className="flex gap-6 text-sm">
              <a href="/courses" className="hover:text-blue-600 transition-colors">Courses</a>
              <a href="/today" className="hover:text-blue-600 transition-colors">Today</a>
              <a href="/settings" className="hover:text-blue-600 transition-colors">Settings</a>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
