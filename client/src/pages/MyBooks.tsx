import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Modal';
import { Tag } from '../components/ui/StatusBadge';
import {
  EmptyState,
  ErrorState,
  InlineEmpty,
  PageHeader,
  Sheet,
  TableSkeleton,
} from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useLibraryMutations, useMyActivity, useMyLoans } from '../hooks/queries';
import { ApiError } from '../lib/api';
import { ACTION_LABELS, formatDate, formatDateTime } from '../lib/format';
import type { Loan } from '../lib/types';

export function MyBooksPage() {
  const toast = useToast();
  const { data, isPending, isError, error, refetch } = useMyLoans('all');
  const { data: history, isPending: historyPending, isError: historyFailed } = useMyActivity();
  const { returnBook } = useLibraryMutations();
  const [pending, setPending] = useState<Loan | null>(null);

  const confirmReturn = async () => {
    if (!pending) return;
    try {
      const result = await returnBook.mutateAsync({ bookId: pending.book.id });
      toast.success(result.message);
      setPending(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    }
  };

  const active = data?.items.filter((loan) => !loan.returnedAt) ?? [];
  const past = data?.items.filter((loan) => loan.returnedAt) ?? [];

  return (
    <>
      <PageHeader title="My books" description="What you have out, and everything you have read here before." />

      <Sheet className="mb-6">
        <h2 className="border-b border-ink/10 px-4 py-3 text-base">Out on loan</h2>

        {isPending && <TableSkeleton rows={3} />}
        {isError && (
          <ErrorState
            message={error instanceof ApiError ? error.message : 'Your loans could not be loaded.'}
            onRetry={() => void refetch()}
          />
        )}

        {data && active.length === 0 && (
          <EmptyState
            title="Nothing out at the moment"
            description="Find something in the catalogue and it will show up here."
            action={
              <Link
                to="/catalogue"
                className="rounded-sheet bg-cloth px-4 py-2 text-sm font-medium text-white hover:bg-cloth-dark"
              >
                Browse the catalogue
              </Link>
            }
          />
        )}

        {active.length > 0 && (
          <ul className="divide-y divide-ink/8">
            {active.map((loan) => (
              <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link to={`/books/${loan.book.id}`} className="font-title text-[15px] hover:text-cloth">
                    {loan.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">
                    {loan.book.author} · borrowed {formatDate(loan.borrowedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {loan.isOverdue ? (
                    <Tag tone="bad">Overdue since {formatDate(loan.dueAt)}</Tag>
                  ) : (
                    <span className="text-[13px] text-ink-soft">Due {formatDate(loan.dueAt)}</span>
                  )}
                  <Button size="sm" onClick={() => setPending(loan)}>
                    Return
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <div className="grid gap-6 lg:grid-cols-2">
        <Sheet>
          <h2 className="border-b border-ink/10 px-4 py-3 text-base">Returned</h2>
          {isPending ? (
            <TableSkeleton rows={3} />
          ) : past.length === 0 ? (
            <InlineEmpty>
              Books you have returned will be listed here, most recent first.
            </InlineEmpty>
          ) : (
            <ul className="divide-y divide-ink/8">
              {past.slice(0, 10).map((loan) => (
                <li key={loan.id} className="px-4 py-3">
                  <Link to={`/books/${loan.book.id}`} className="font-title text-[15px] hover:text-cloth">
                    {loan.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">
                    Returned {formatDate(loan.returnedAt)}
                    {loan.handledBy ? ` by ${loan.handledBy}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Sheet>

        <Sheet>
          <h2 className="border-b border-ink/10 px-4 py-3 text-base">Your activity</h2>
          {historyPending ? (
            <TableSkeleton rows={3} />
          ) : historyFailed ? (
            <InlineEmpty>Your activity could not be loaded just now.</InlineEmpty>
          ) : !history || history.items.length === 0 ? (
            <InlineEmpty>
              Every borrow and return you make is recorded here with the date.
            </InlineEmpty>
          ) : (
            <ul className="divide-y divide-ink/8">
              {history.items.slice(0, 10).map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <p className="text-sm">
                    {ACTION_LABELS[entry.action] ?? entry.action}{' '}
                    <span className="font-title">{entry.bookTitle}</span>
                  </p>
                  <p className="text-[13px] text-ink-faint">{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={`Return "${pending?.book.title ?? ''}"?`}
        description="It goes back on the shelf, or straight to the next person waiting for it."
        confirmLabel="Return it"
        loading={returnBook.isPending}
        onConfirm={confirmReturn}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
