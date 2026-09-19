'use client';

import { Download, Trash2, Check } from 'lucide-react';
import { ServerForm, SubmitButton } from '@/components/forms/server-form';
import { ConfirmIconAction } from '@/components/forms/confirm-action';
import { Field, Input, Select, Checkbox } from '@/components/ui/field';
import { Badge } from '@/components/ui/card';
import { EXPENSE_CATEGORIES } from '@/lib/enums';
import { formatMoney, formatDate, labelize } from '@/lib/utils';
import { createExpenseAction, deleteExpenseAction, settleSplitAction } from './actions';

export function ExpenseForm({
  groups,
  trips,
}: {
  groups: { id: string; name: string }[];
  trips: { id: string; title: string }[];
}) {
  return (
    <ServerForm action={createExpenseAction} successMessage="Expense added." resetOnSuccess ariaLabel="Add an expense" className="space-y-3">
      {({ errors, pending }) => (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Amount" name="amount" error={errors.amount} required>
              {(props) => <Input {...props} name="amount" type="number" step="0.01" min="0" required placeholder="0.00" />}
            </Field>
            <Field label="Category" name="category" error={errors.category}>
              {(props) => (
                <Select {...props} name="category" defaultValue="food">
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {labelize(category)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Date" name="occurredOn" error={errors.occurredOn}>
              {(props) => <Input {...props} name="occurredOn" type="date" />}
            </Field>
          </div>

          <Field label="What was it for?" name="description" error={errors.description}>
            {(props) => <Input {...props} name="description" placeholder="Groceries at the market" />}
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Currency" name="currency" error={errors.currency}>
              {(props) => (
                <Select {...props} name="currency" defaultValue="USD">
                  {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'ZAR', 'NGN'].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {groups.length + trips.length > 0 ? (
              <Field label="Share with" name="groupId" hint="Splits the amount evenly between members.">
                {(props) => (
                  <Select {...props} name="groupId" defaultValue="">
                    <option value="">Just me</option>
                    {groups.map((group) => (
                      <option key={group.id} value={`group:${group.id}`}>
                        Group: {group.name}
                      </option>
                    ))}
                    {trips.map((trip) => (
                      <option key={trip.id} value={`trip:${trip.id}`}>
                        Trip: {trip.title}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
          </div>

          <Checkbox name="isShared" label="Split this expense with the people above" />

          <SubmitButton pending={pending}>Add expense</SubmitButton>
        </>
      )}
    </ServerForm>
  );
}

export function ExpenseRow({
  expense,
}: {
  expense: {
    id: string;
    description: string | null;
    category: string;
    amountCents: number;
    currency: string;
    occurredOn: Date;
    isShared: boolean;
    splits: { id: string; shareCents: number; settledAt: Date | null; user: { profile: { displayName: string | null } | null; username: string } }[];
  };
}) {
  return (
    <li className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {expense.description || labelize(expense.category)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(expense.occurredOn)} · {labelize(expense.category)}
          </p>
          {expense.isShared && expense.splits.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expense.splits.map((split) => (
                <button
                  key={split.id}
                  type="button"
                  onClick={() => settleSplitAction(split.id, !split.settledAt)}
                  aria-pressed={Boolean(split.settledAt)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    split.settledAt ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {split.settledAt ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                  {split.user.profile?.displayName ?? split.user.username} · {formatMoney(split.shareCents, expense.currency)}
                </button>
              ))}
            </div>
          ) : expense.isShared ? (
            <Badge tone="neutral" className="mt-2">
              Shared
            </Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{formatMoney(expense.amountCents, expense.currency)}</span>
          <ConfirmIconAction
            action={() => deleteExpenseAction(expense.id)}
            title="Delete this expense?"
            description="It will be removed from your totals and exports."
            confirmLabel="Delete expense"
            label="Delete expense"
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </div>
    </li>
  );
}

export function ExportButton({ month }: { month: string }) {
  return (
    <a
      href={`/expenses/export?month=${month}`}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Export CSV
    </a>
  );
}
