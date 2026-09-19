import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { listSavedItems } from '@/features/social/service';
import { Card, CardContent, CardHeader, Badge, SectionHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Saved items' };

export default async function SavedPage() {
  const user = await requireUserPage();
  const items = await listSavedItems(user.id);

  const grouped = items.reduce<Record<string, typeof items>>((accumulator, item) => {
    const key = item.targetType;
    accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item];
    return accumulator;
  }, {});

  return (
    <div className="grid gap-6">
      <SectionHeading
        title="Saved items"
        description="Everything you bookmarked: help posts, resources, groups, campaigns and your own notes."
        icon={<Heart className="h-5 w-5" aria-hidden="true" />}
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-5">
            <EmptyState
              title="Nothing saved yet"
              description="Use the Save button on any help post, resource, campaign or group and it will collect here."
              icon={<Heart className="h-8 w-8" aria-hidden="true" />}
            />
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([targetType, entries]) => (
          <Card key={targetType}>
            <CardHeader title={labelize(targetType.replace(/_/g, ' '))} description={`${entries.length} saved`} />
            <CardContent>
              <ul className="divide-y divide-border">
                {entries.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                    <Link href={item.href} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground hover:text-primary">{item.title}</span>
                      {item.note ? <span className="block truncate text-sm text-muted-foreground">{item.note}</span> : null}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <Badge tone="neutral">saved {item.createdAt.toLocaleDateString()}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
