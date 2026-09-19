import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Tag } from '../../components/ui/StatusBadge';
import { EmptyState, ErrorState, PageHeader, Sheet, TableSkeleton } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { useAllQueues, useLibraryMutations } from '../../hooks/queries';
import { ApiError } from '../../lib/api';
import { formatDate, relativeTime } from '../../lib/format';
import type { QueueEntry } from '../../lib/types';

export function QueuesPage() {
  const toast = useToast();
  const { data, isPending, isError, error, refetch } = useAllQueues();
  const { removeQueueEntry } = useLibraryMutations();
  const [pending, setPending] = useState<{ entry: QueueEntry; bookTitle: string } | null>(null);

  const confirmRemove = async () => {
    if (!pending) return;
    try {
      const result = await removeQueueEntry.mutateAsync(pending.entry.id);
      toast.success(result.message);
      setPending(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That entry could not be removed.');
    }
  };

  return (
    <>
      <PageHeader
        title="Waiting lists"
        description="Who is queued for what. Removing the person currently holding a book passes it to the next in line."
      />

      {isPending && (
        <Sheet>
          <TableSkeleton />
        </Sheet>
      )}

      {isError && (
        <Sheet>
          <ErrorState
            message={error instanceof ApiError ? error.message : 'The queues could not be loaded.'}
            onRetry={() => void refetch()}
          />
        </Sheet>
      )}

      {data && data.queues.length === 0 && (
        <Sheet>
          <EmptyState
            title="No one is waiting"
            description="Queues appear here as soon as someone asks for a book that is out on loan."
          />
        </Sheet>
      )}

      <div className="space-y-5">
        {data?.queues.map((queue) => (
          <Sheet key={queue.book.id}>
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
              <div>
                <Link to={`/books/${queue.book.id}`} className="font-title text-base hover:text-cloth">
                  {queue.book.title}
                </Link>
                <p className="text-[13px] text-ink-faint">
                  {queue.book.author} · {queue.entries.length} waiting
                </p>
              </div>
            </div>
            <ol className="divide-y divide-ink/8">
              {queue.entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-[13px] font-medium text-ink-faint">
                      {entry.status === 'HOLD' ? '—' : entry.position}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{entry.user.username}</p>
                      <p className="text-[13px] text-ink-faint">Joined {formatDate(entry.joinedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.status === 'HOLD' && (
                      <Tag tone="warn">
                        Holding — expires {entry.holdExpiresAt ? relativeTime(entry.holdExpiresAt) : 'soon'}
                      </Tag>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPending({ entry, bookTitle: queue.book.title })}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </Sheet>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={`Remove ${pending?.entry.user.username ?? ''} from the queue?`}
        description={
          pending?.entry.status === 'HOLD'
            ? `They are currently holding "${pending.bookTitle}". Removing them passes it straight to the next person.`
            : `They will lose their place in the queue for "${pending?.bookTitle ?? ''}".`
        }
        confirmLabel="Remove them"
        tone="danger"
        loading={removeQueueEntry.isPending}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
