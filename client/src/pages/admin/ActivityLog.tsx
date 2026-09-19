import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Select, TextInput } from '../../components/ui/Field';
import { EmptyState, ErrorState, PageHeader, Sheet, TableSkeleton } from '../../components/ui/States';
import { useActivityLog } from '../../hooks/queries';
import { ApiError } from '../../lib/api';
import { ACTION_LABELS, formatDateTime } from '../../lib/format';

const ACTIONS = Object.keys(ACTION_LABELS);

export function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [q, setQ] = useState('');

  const { data, isPending, isError, error, refetch } = useActivityLog({
    page,
    action: action || undefined,
    q: q || undefined,
  });

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Every borrow, return and queue change, newest first."
      />

      <Sheet className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <div>
            <label htmlFor="log-search" className="sr-only">
              Search the log
            </label>
            <TextInput
              id="log-search"
              type="search"
              placeholder="Search by member, book or genre"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="log-action" className="sr-only">
              Filter by action
            </label>
            <Select
              id="log-action"
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Every action</option>
              {ACTIONS.map((key) => (
                <option key={key} value={key}>
                  {ACTION_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Sheet>

      <Sheet>
        {isPending && <TableSkeleton />}
        {isError && (
          <ErrorState
            message={error instanceof ApiError ? error.message : 'The log could not be loaded.'}
            onRetry={() => void refetch()}
          />
        )}
        {data && data.items.length === 0 && (
          <EmptyState title="Nothing logged yet" description="Borrows and returns will appear here as they happen." />
        )}

        {data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[13px] text-ink-faint">
                <th scope="col" className="px-4 py-2.5 font-medium">When</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Member</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Book</th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Genre</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id} className="border-b border-ink/6 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {entry.username}
                    {entry.actorUsername && (
                      <span className="block text-[12px] font-normal text-ink-faint">
                        via {entry.actorUsername}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                  <td className="px-4 py-3">
                    <span className="font-title">{entry.bookTitle}</span>
                    {entry.bookId && <span className="block text-[12px] text-ink-faint">{entry.bookId}</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">{entry.genre || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sheet>

      {data && data.totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Log pages">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-ink-soft">
            Page {data.page} of {data.totalPages} · {data.total} entries
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </>
  );
}
