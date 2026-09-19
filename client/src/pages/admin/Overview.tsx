import { Link } from 'react-router-dom';
import { ErrorState, InlineEmpty, PageHeader, Sheet, Skeleton, TableSkeleton } from '../../components/ui/States';
import { useActivityLog, useAdminStats, useAllLoans } from '../../hooks/queries';
import { ApiError } from '../../lib/api';
import { ACTION_LABELS, formatDate, relativeTime } from '../../lib/format';

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'warn' }) {
  return (
    <div className="rounded-sheet border border-ink/10 bg-white p-4 shadow-sheet">
      <p className="text-[13px] text-ink-faint">{label}</p>
      <p className={`mt-1 font-title text-3xl ${tone === 'warn' ? 'text-rust' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

export function AdminOverviewPage() {
  const { data: stats, isPending, isError, error, refetch } = useAdminStats();
  const { data: loans, isPending: loansPending, isError: loansFailed } = useAllLoans('active');
  const { data: log, isPending: logPending, isError: logFailed } = useActivityLog({ page: 1 });

  const overdue = loans?.items.filter((loan) => loan.isOverdue) ?? [];

  return (
    <>
      <PageHeader title="Library overview" description="Where the stock is, and what has been happening." />

      {isError && (
        <ErrorState
          message={error instanceof ApiError ? error.message : 'The dashboard could not be loaded.'}
          onRetry={() => void refetch()}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isPending &&
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)}
        {stats && (
          <>
            <Stat label="Books in the catalogue" value={stats.books} />
            <Stat label="On the shelf" value={Math.max(0, stats.available)} />
            <Stat label="Out on loan" value={stats.activeLoans} />
            <Stat label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? 'warn' : 'neutral'} />
            <Stat label="Members" value={stats.members} />
            <Stat label="People waiting" value={stats.waiting} />
            <Stat label="Books being held" value={stats.holds} />
            <Stat label="Actions this week" value={stats.activityLastWeek} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Sheet>
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <h2 className="text-base">Overdue books</h2>
            <Link to="/staff/loans" className="text-[13px] font-medium text-cloth underline underline-offset-4">
              All loans
            </Link>
          </div>
          {loansPending ? (
            <TableSkeleton rows={3} />
          ) : loansFailed ? (
            <InlineEmpty>Loans could not be loaded just now.</InlineEmpty>
          ) : overdue.length === 0 ? (
            <InlineEmpty>Nothing is overdue. Every book out on loan is still within its term.</InlineEmpty>
          ) : (
            <ul className="divide-y divide-ink/8">
              {overdue.slice(0, 8).map((loan) => (
                <li key={loan.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-title text-[15px]">{loan.book.title}</p>
                    <p className="text-[13px] text-ink-faint">{loan.user.username}</p>
                  </div>
                  <span className="text-[13px] text-rust">Due {formatDate(loan.dueAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Sheet>

        <Sheet>
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <h2 className="text-base">Latest activity</h2>
            <Link to="/staff/activity" className="text-[13px] font-medium text-cloth underline underline-offset-4">
              Full log
            </Link>
          </div>
          {logPending ? (
            <TableSkeleton rows={3} />
          ) : logFailed ? (
            <InlineEmpty>The activity log could not be loaded just now.</InlineEmpty>
          ) : !log || log.items.length === 0 ? (
            <InlineEmpty>
              Borrows, returns and queue changes will appear here as they happen.
            </InlineEmpty>
          ) : (
            <ul className="divide-y divide-ink/8">
              {log.items.slice(0, 8).map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <p className="text-sm">
                    <span className="font-medium">{entry.username}</span>{' '}
                    {(ACTION_LABELS[entry.action] ?? entry.action).toLowerCase()}{' '}
                    <span className="font-title">{entry.bookTitle}</span>
                  </p>
                  <p className="text-[13px] text-ink-faint">{relativeTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>
    </>
  );
}
