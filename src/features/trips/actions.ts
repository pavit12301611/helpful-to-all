'use server';

import { revalidatePath } from 'next/cache';
import { runAction, type ActionResult } from '@/server/core/action';
import { ForbiddenError } from '@/lib/errors';
import { itineraryItemSchema, packingItemSchema, tripExpenseSchema, tripInviteSchema, tripPollSchema, tripSchema, tripVoteSchema } from './schemas';
import {
  addItineraryItem,
  addPackingItem,
  addTripExpense,
  addTripMember,
  createTrip,
  createTripPoll,
  deleteItineraryItem,
  deletePackingItem,
  deleteTrip,
  leaveTrip,
  settleTripSplit,
  togglePacked,
  updateTrip,
  voteTripPoll,
} from './service';

function read(formData: FormData, keys: string[]) {
  const input: Record<string, unknown> = {};
  for (const key of keys) input[key] = formData.get(key) ?? '';
  return input;
}

function refresh(tripId: string) {
  revalidatePath('/trips');
  if (tripId) revalidatePath(`/trips/${tripId}`);
}

const TRIP_FIELDS = [
  'title',
  'description',
  'destination',
  'startsAt',
  'endsAt',
  'budgetCents',
  'currency',
  'visibility',
  'accommodationNotes',
  'transportNotes',
  'importantContacts',
];

export async function createTripAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction({
    schema: tripSchema,
    input: read(formData, TRIP_FIELDS),
    successMessage: 'Trip created.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      const trip = await createTrip(user.id, data);
      refresh(trip.id);
      return { id: trip.id };
    },
  });
}

export async function updateTripAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const tripId = String(formData.get('tripId') ?? '');
  return runAction({
    schema: tripSchema,
    input: read(formData, TRIP_FIELDS),
    successMessage: 'Trip updated.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await updateTrip(user.id, tripId, data);
      refresh(tripId);
      return { id: tripId };
    },
  });
}

export async function deleteTripAction(formData: FormData): Promise<ActionResult> {
  const tripId = String(formData.get('tripId') ?? '');
  return runAction({
    input: { tripId },
    successMessage: 'Trip deleted.',
    handler: async (_input, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await deleteTrip(user.id, tripId);
      revalidatePath('/trips');
    },
  });
}

export async function addTripMemberAction(formData: FormData): Promise<ActionResult> {
  return runAction({
    schema: tripInviteSchema,
    input: read(formData, ['tripId', 'username']),
    successMessage: 'Traveller added.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await addTripMember(user.id, data.tripId, data.username);
      refresh(data.tripId);
    },
  });
}

export async function leaveTripAction(formData: FormData): Promise<ActionResult> {
  const tripId = String(formData.get('tripId') ?? '');
  return runAction({
    input: { tripId },
    successMessage: 'You left the trip.',
    handler: async (_input, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await leaveTrip(user.id, tripId);
      revalidatePath('/trips');
    },
  });
}

export async function addItineraryItemAction(formData: FormData): Promise<ActionResult> {
  return runAction({
    schema: itineraryItemSchema,
    input: read(formData, ['tripId', 'title', 'description', 'location', 'startsAt', 'endsAt', 'costCents']),
    successMessage: 'Added to the itinerary.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await addItineraryItem(user.id, data);
      refresh(data.tripId);
    },
  });
}

export async function deleteItineraryItemAction(formData: FormData): Promise<ActionResult> {
  const tripId = String(formData.get('tripId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  return runAction({
    input: { tripId, itemId },
    successMessage: 'Item removed.',
    handler: async (_input, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await deleteItineraryItem(user.id, itemId);
      refresh(tripId);
    },
  });
}

export async function addPackingItemAction(formData: FormData): Promise<ActionResult> {
  return runAction({
    schema: packingItemSchema,
    input: read(formData, ['tripId', 'label', 'category']),
    successMessage: 'Added to the packing list.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await addPackingItem(user.id, data);
      refresh(data.tripId);
    },
  });
}

export async function togglePackedAction(formData: FormData): Promise<ActionResult> {
  const tripId = String(formData.get('tripId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const packed = formData.get('packed') === 'true';
  return runAction({
    input: { tripId, itemId, packed },
    handler: async (_input, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await togglePacked(user.id, itemId, packed);
      refresh(tripId);
    },
  });
}

export async function deletePackingItemAction(formData: FormData): Promise<ActionResult> {
  const tripId = String(formData.get('tripId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  return runAction({
    input: { tripId, itemId },
    successMessage: 'Item removed.',
    handler: async (_input, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await deletePackingItem(user.id, itemId);
      refresh(tripId);
    },
  });
}

export async function addTripExpenseAction(formData: FormData): Promise<ActionResult> {
  return runAction({
    schema: tripExpenseSchema,
    input: read(formData, ['tripId', 'description', 'amountCents', 'category', 'occurredOn']),
    successMessage: 'Expense added and split.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await addTripExpense(user.id, data);
      refresh(data.tripId);
    },
  });
}

export async function settleTripSplitAction(formData: FormData): Promise<ActionResult> {
  const tripId = String(formData.get('tripId') ?? '');
  const splitId = String(formData.get('splitId') ?? '');
  const settled = formData.get('settled') === 'true';
  return runAction({
    input: { tripId, splitId, settled },
    successMessage: settled ? 'Marked as settled.' : 'Marked as unsettled.',
    handler: async (_input, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await settleTripSplit(user.id, splitId, settled);
      refresh(tripId);
    },
  });
}

export async function createTripPollAction(formData: FormData): Promise<ActionResult> {
  const options = Object.entries(Object.fromEntries(formData))
    .filter(([key, value]) => key.startsWith('option-') && String(value).trim().length > 0)
    .map(([, value]) => String(value));
  return runAction({
    schema: tripPollSchema,
    input: {
      tripId: String(formData.get('tripId') ?? ''),
      question: String(formData.get('question') ?? ''),
      options,
      closesAt: String(formData.get('closesAt') ?? ''),
    },
    successMessage: 'Poll created.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await createTripPoll(user.id, data.tripId, data.question, data.options, data.closesAt);
      refresh(data.tripId);
    },
  });
}

export async function voteTripPollAction(formData: FormData): Promise<ActionResult> {
  return runAction({
    schema: tripVoteSchema,
    input: {
      tripId: String(formData.get('tripId') ?? ''),
      pollId: String(formData.get('pollId') ?? ''),
      optionIds: [String(formData.get('optionIds') ?? '')].filter(Boolean),
    },
    successMessage: 'Vote recorded.',
    handler: async (data, { user }) => {
      if (!user) throw new ForbiddenError('You need to sign in.');
      await voteTripPoll(user.id, data.tripId, data.pollId, data.optionIds);
      refresh(data.tripId);
    },
  });
}
