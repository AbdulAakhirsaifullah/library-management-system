import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Sheet, TableSkeleton } from '../components/ui/States';
import { useLibraryMutations, useNotifications } from '../hooks/queries';
import { ApiError } from '../lib/api';
import { formatDateTime } from '../lib/format';

export function NoticesPage() {
  const { data, isPending, isError, error, refetch } = useNotifications();
  const { markNotificationsRead } = useLibraryMutations();

  return (
    <>
      <PageHeader
        title="Notices"
        description="Where the library tells you a book is ready, or that a hold has run out."
        actions={
          data && data.unread > 0 ? (
            <Button
              variant="secondary"
              loading={markNotificationsRead.isPending}
              onClick={() => markNotificationsRead.mutate()}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <Sheet>
        {isPending && <TableSkeleton rows={3} />}
        {isError && (
          <ErrorState
            message={error instanceof ApiError ? error.message : 'Notices could not be loaded.'}
            onRetry={() => void refetch()}
          />
        )}

        {data && data.items.length === 0 && (
          <EmptyState
            title="Nothing to read here yet"
            description="Join a queue and this is where you will hear that your book is ready."
          />
        )}

        {data && data.items.length > 0 && (
          <ul className="divide-y divide-ink/8">
            {data.items.map((notice) => (
              <li
                key={notice.id}
                className={`p-4 ${notice.read ? '' : 'border-l-2 border-l-brass bg-brass-light/40'}`}
              >
                <h2 className="text-[15px] font-medium">{notice.title}</h2>
                <p className="measure mt-1 text-sm leading-relaxed text-ink-soft">{notice.body}</p>
                <p className="mt-2 text-[13px] text-ink-faint">
                  {formatDateTime(notice.createdAt)}
                  {notice.book && (
                    <>
                      {' · '}
                      <Link to={`/books/${notice.book.id}`} className="text-cloth underline underline-offset-4">
                        Open the book
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
