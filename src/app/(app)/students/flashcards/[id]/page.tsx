import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDeck } from '@/features/students/service';
import { CardForm, CardList, FlashcardStudy } from '@/features/students/components';
import { Card, CardContent, CardHeader, SectionHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import { isAppError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Flashcards' };

export default async function FlashcardDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const { id } = await params;

  let deck;
  try {
    deck = await getDeck(user.id, id);
  } catch (error) {
    if (isAppError(error)) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Link href="/students?tab=flashcards" className="link text-sm">
            Back to your decks
          </Link>
        </div>
      );
    }
    throw error;
  }

  const due = deck.cards.filter((card) => !card.nextReviewAt || card.nextReviewAt <= new Date());
  const queue = due.length > 0 ? due : deck.cards;

  return (
    <div className="space-y-5">
      <Link href="/students?tab=flashcards" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All decks
      </Link>

      <SectionHeading title={deck.name} description={deck.description || `${deck.cards.length} cards`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Study" description={due.length > 0 ? `${due.length} card(s) due for review.` : 'Nothing due - reviewing again anyway.'} />
          <CardContent>
            {queue.length === 0 ? (
              <EmptyState title="This deck is empty" description="Add your first card on the right." />
            ) : (
              <FlashcardStudy cards={queue} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Add a card" />
          <CardContent className="space-y-4">
            <CardForm deckId={deck.id} />
            {deck.cards.length > 0 ? <CardList cards={deck.cards} /> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
