import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Tag } from '../components/ui/StatusBadge';
import { EmptyState, ErrorState, PageHeader, Sheet, TableSkeleton } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useLibraryMutations, useMyWaitlist } from '../hooks/queries';
import { ApiError } from '../lib/api';
import { formatDate, relativeTime } from '../lib/format';

export function MyWaitlistPage() {
  const toast = useToast();
  const { data, isPending, isError, error, refetch } = useMyWaitlist();
  const { leaveWaitlist, borrow } = useLibraryMutations();
  const busy = leaveWaitlist.isPending || borrow.isPending;

  const leave = async (bookId: string) => {
    try {
      const result = await leaveWaitlist.mutateAsync(bookId);
      toast.info(result.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    }
  };

  const collect = async (bookId: string) => {
    try {
      const result = await borrow.mutateAsync({ bookId });
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Waiting list"
        description="Queues run first come, first served. When your turn comes the book is held for you for 48 hours."
      />

      <Sheet>
        {isPending && <TableSkeleton rows={3} />}
        {isError && (
          <ErrorState
            message={error instanceof ApiError ? error.message : 'Your queues could not be loaded.'}
            onRetry={() => void refetch()}
          />
        )}

        {data && data.entries.length === 0 && (
          <EmptyState
            title="You are not waiting for anything"
            description="When a book you want is out on loan, join its queue and you will be told the moment it comes back."
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

        {data && data.entries.length > 0 && (
          <ul className="divide-y divide-ink/8">
            {data.entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link to={`/books/${entry.book.id}`} className="font-title text-[15px] hover:text-cloth">
                    {entry.book.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">
                    {entry.book.author} · joined {formatDate(entry.joinedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {entry.status === 'HOLD' ? (
                    <Tag tone="warn">
                      Ready for you — expires {entry.holdExpiresAt ? relativeTime(entry.holdExpiresAt) : 'soon'}
                    </Tag>
                  ) : (
                    <span className="text-[13px] text-ink-soft">Number {entry.position} in line</span>
                  )}

                  {entry.status === 'HOLD' && (
                    <Button size="sm" disabled={busy} onClick={() => collect(entry.book.id)}>
                      Collect it
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => leave(entry.book.id)}>
                    Leave queue
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
