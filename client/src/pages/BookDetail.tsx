import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorState, PageHeader, Sheet, Skeleton } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useBook, useLibraryMutations, useSuggestions } from '../hooks/queries';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatDateTime, relativeTime } from '../lib/format';

export function BookDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch } = useBook(id);
  const { data: suggested, isPending: suggestionsPending } = useSuggestions(id);
  const { borrow, returnBook, joinWaitlist, leaveWaitlist } = useLibraryMutations();

  const busy =
    borrow.isPending || returnBook.isPending || joinWaitlist.isPending || leaveWaitlist.isPending;

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        message={error instanceof ApiError ? error.message : 'That book could not be loaded.'}
        onRetry={() => void refetch()}
      />
    );
  }

  const book = data.book;

  const run = async (fn: () => Promise<{ message: string }>, tone: 'success' | 'info' = 'success') => {
    try {
      const result = await fn();
      toast[tone](result.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    }
  };

  return (
    <>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-[13px] font-medium text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        Back
      </button>

      <PageHeader title={book.title} description={`${book.author} · ${book.genre} · Shelf ID ${book.id}`} />

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <Sheet className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={book.status} />
            {book.waitlistCount > 0 && (
              <span className="text-[13px] text-ink-soft">{book.waitlistCount} people waiting</span>
            )}
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {book.borrowedBy && (
              <div>
                <dt className="text-[13px] text-ink-faint">On loan to</dt>
                <dd className="text-sm font-medium">{book.borrowedBy.username}</dd>
              </div>
            )}
            {book.borrowedAt && (
              <div>
                <dt className="text-[13px] text-ink-faint">Borrowed</dt>
                <dd className="text-sm">{formatDateTime(book.borrowedAt)}</dd>
              </div>
            )}
            {book.dueAt && (
              <div>
                <dt className="text-[13px] text-ink-faint">Due back</dt>
                <dd className="text-sm">{formatDate(book.dueAt)}</dd>
              </div>
            )}
            {book.holdExpiresAt && (
              <div>
                <dt className="text-[13px] text-ink-faint">Hold expires</dt>
                <dd className="text-sm">{relativeTime(book.holdExpiresAt)}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {!user && <Link to="/sign-in" className="text-sm font-medium text-cloth underline underline-offset-4">Sign in to borrow this</Link>}

            {user && book.viewer?.hasLoan && (
              <Button
                disabled={busy}
                onClick={() => run(() => returnBook.mutateAsync({ bookId: book.id }))}
              >
                Return this book
              </Button>
            )}

            {user && !book.viewer?.hasLoan && (book.status === 'AVAILABLE' || book.viewer?.hasHold) && (
              <Button disabled={busy} onClick={() => run(() => borrow.mutateAsync({ bookId: book.id }))}>
                {book.viewer?.hasHold ? 'Collect your hold' : 'Borrow'}
              </Button>
            )}

            {user && !book.viewer?.hasLoan && book.status !== 'AVAILABLE' && !book.viewer?.hasHold && (
              book.viewer?.onWaitlist ? (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => run(() => leaveWaitlist.mutateAsync(book.id), 'info')}
                >
                  Leave the queue (you are number {book.viewer.waitlistPosition})
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => run(() => joinWaitlist.mutateAsync(book.id), 'info')}
                >
                  Join the waiting list
                </Button>
              )
            )}

            {user?.role === 'ADMIN' && book.borrowedBy && !book.viewer?.hasLoan && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  run(() => returnBook.mutateAsync({ bookId: book.id, userId: book.borrowedBy!.id }))
                }
              >
                Return for {book.borrowedBy.username}
              </Button>
            )}
          </div>
        </Sheet>

        <Sheet className="p-5">
          <h2 className="text-base">More {book.genre}</h2>
          {suggestionsPending ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-4/5" />
            </div>
          ) : suggested && suggested.books.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {suggested.books.map((item) => (
                <li key={item.id}>
                  <Link to={`/books/${item.id}`} className="font-title text-[15px] leading-tight hover:text-cloth">
                    {item.title}
                  </Link>
                  <p className="text-[13px] text-ink-faint">{item.author}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">Nothing else in this genre yet.</p>
          )}
        </Sheet>
      </div>
    </>
  );
}
