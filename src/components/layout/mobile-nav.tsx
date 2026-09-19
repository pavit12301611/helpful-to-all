'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { MOBILE_NAV_HREFS, NAV_ITEMS } from '@/lib/navigation';

/** Bottom navigation for phones - the five actions people use most. */
export function MobileNav() {
  const pathname = usePathname();
  const items = MOBILE_NAV_HREFS.map((href) => NAV_ITEMS.find((item) => item.href === href)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden"
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-[11px] font-medium',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                <span className="truncate px-1">{item.label.split(' ')[0]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
