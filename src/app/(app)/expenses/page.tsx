import type { Metadata } from 'next';
import { Wallet } from 'lucide-react';
import { requireUserPage } from '@/server/core/page-guard';
import { getDb } from '@/server/db/client';
import { expenseBalances, listExpenses } from '@/features/expenses/service';
import { expenseFilters, EXPENSE_PAGE_SIZE } from '@/features/expenses/schemas';
import { ExpenseForm, ExpenseRow, ExportButton } from '@/features/expenses/components';
import { Card, CardContent, CardHeader, Progress, SectionHeading } from '@/components/ui/card';
import { EmptyState, Alert } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/list';
import { EXPENSE_CATEGORIES } from '@/lib/enums';
import { formatMoney, labelize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Expenses' };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const filters = expenseFilters.parse({ month: params.month, category: params.category, page: params.page });

  const db = await getDb();
  const [{ month, expenses, total, totalCents, byCategory }, balances, memberships, trips] = await Promise.all([
    listExpenses(user.id, filters),
    expenseBalances(user.id),
    db.groupMember.findMany({ where: { userId: user.id, group: { deletedAt: null } }, include: { group: { select: { id: true, name: true } } } }),
    db.tripMember.findMany({ where: { userId: user.id, trip: { deletedAt: null } }, include: { trip: { select: { id: true, title: true } } } }),
  ]);

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const currency = expenses[0]?.currency ?? 'USD';

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Expenses"
        description={`${monthLabel} · ${formatMoney(totalCents, currency)} across ${total} entries`}
        action={<ExportButton month={month} />}
      />

      <Alert tone="info">
        OpenHub is not an accounting or tax tool. Use the CSV export to hand your numbers to a professional.
      </Alert>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Where the money went" description={`Top categories in ${monthLabel}`} />
          <CardContent className="space-y-3">
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No spending recorded this month.</p>
            ) : (
              byCategory.map((row) => (
                <div key={row.category}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{labelize(row.category)}</span>
                    <span className="text-muted-foreground">
                      {formatMoney(row.amountCents, currency)} · {row.count}
                    </span>
                  </div>
                  <Progress value={row.amountCents} max={totalCents || 1} tone="primary" />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Balances" description="Who owes whom from shared expenses" />
          <CardContent>
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing outstanding. You are all settled up.</p>
            ) : (
              <ul className="space-y-2">
                {balances.map((balance) => (
                  <li key={balance.userId} className="flex items-center justify-between text-sm">
                    <span className="truncate">{balance.name}</span>
                    <span className={balance.cents > 0 ? 'font-medium text-success' : 'font-medium text-danger'}>
                      {balance.cents > 0 ? 'owes you ' : 'you owe '}
                      {formatMoney(Math.abs(balance.cents), currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Add an expense" icon={<Wallet className="h-5 w-5" aria-hidden="true" />} />
        <CardContent>
          <ExpenseForm
            groups={memberships.map((membership) => membership.group)}
            trips={trips.map((membership) => membership.trip)}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <form className="flex flex-wrap gap-2" action="/expenses">
          <label htmlFor="expense-month" className="sr-only">
            Month
          </label>
          <input id="expense-month" name="month" type="month" defaultValue={month} className="input-base max-w-[10rem]" />
          <label htmlFor="expense-category" className="sr-only">
            Category
          </label>
          <select id="expense-category" name="category" defaultValue={filters.category ?? ''} className="input-base max-w-[12rem]">
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {labelize(category)}
              </option>
            ))}
          </select>
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Apply
          </button>
          <a href={`/expenses/export?month=${month}`} className="h-10 rounded-lg border border-border px-4 text-sm leading-10 hover:bg-muted">
            Export CSV
          </a>
        </form>

        {expenses.length === 0 ? (
          <EmptyState title="No expenses this month" description="Add your first entry above to start tracking." />
        ) : (
          <ul className="space-y-2">
            {expenses.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} />
            ))}
          </ul>
        )}

        <Pagination
          page={filters.page}
          pageSize={EXPENSE_PAGE_SIZE}
          total={total}
          basePath="/expenses"
          searchParams={{ month, category: filters.category }}
        />
      </div>
    </div>
  );
}
