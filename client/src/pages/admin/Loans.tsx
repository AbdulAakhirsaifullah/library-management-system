import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Tag } from '../../components/ui/StatusBadge';
import { EmptyState, ErrorState, PageHeader, Sheet, TableSkeleton } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { useAllLoans, useLibraryMutations } from '../../hooks/queries';
import { ApiError } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { Loan } from '../../lib/types';

export function AdminLoansPage() {
  const toast = useToast();
  const [status, setStatus] = useState<'active' | 'returned' | 'all'>('active');
  const { data, isPending, isError, error, refetch } = useAllLoans(status);
  const { returnBook } = useLibraryMutations();
  const [pending, setPending] = useState<Loan | null>(null);

  const confirmReturn = async () => {
    if (!pending) return;
    try {
      const result = await returnBook.mutateAsync({
        bookId: pending.book.id,
        userId: pending.user.id,
      });
      toast.success(result.message);
      setPending(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Loans"
        description="Who has what. Staff can return a book on a member's behalf."
        actions={
          <div className="w-44">
            <label htmlFor="loan-status" className="sr-only">
              Filter loans
            </label>
            <Select
              id="loan-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
            >
              <option value="active">Currently out</option>
              <option value="returned">Returned</option>
              <option value="all">Everything</option>
            </Select>
          </div>
        }
      />

      <Sheet>
        {isPending && <TableSkeleton />}
        {isError && (
          <ErrorState
            message={error instanceof ApiError ? error.message : 'Loans could not be loaded.'}
            onRetry={() => void refetch()}
          />
        )}
        {data && data.items.length === 0 && (
          <EmptyState title="Nothing here" description="No loans match that filter." />
        )}

        {data && data.items.length > 0 && (
          <ul className="divide-y divide-ink/8">
            {data.items.map((loan) => (
              <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link to={`/books/${loan.book.id}`} className="font-title text-[15px] hover:text-cloth">
                    {loan.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">
                    {loan.user.username} · borrowed {formatDate(loan.borrowedAt)}
                    {loan.handledBy ? ` · handled by ${loan.handledBy}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {loan.returnedAt ? (
                    <span className="text-[13px] text-ink-soft">Returned {formatDate(loan.returnedAt)}</span>
                  ) : loan.isOverdue ? (
                    <Tag tone="bad">Overdue since {formatDate(loan.dueAt)}</Tag>
                  ) : (
                    <span className="text-[13px] text-ink-soft">Due {formatDate(loan.dueAt)}</span>
                  )}
                  {!loan.returnedAt && (
                    <Button size="sm" variant="secondary" onClick={() => setPending(loan)}>
                      Return
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <ConfirmDialog
        open={Boolean(pending)}
        title={`Return "${pending?.book.title ?? ''}" for ${pending?.user.username ?? ''}?`}
        description="The loan is closed and the book goes back on the shelf, or to whoever is next in line."
        confirmLabel="Return it"
        loading={returnBook.isPending}
        onConfirm={confirmReturn}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
