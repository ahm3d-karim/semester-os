'use client';

// Nav links with active state (usePathname requires a client component)
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/today', label: 'Today' },
  { href: '/settings', label: 'Settings' },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + '/');
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
