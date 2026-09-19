import type { ReactNode } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink/10 ${className}`} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <h3 className="font-title text-xl">{title}</h3>
      <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** For secondary panels: says what will appear here, rather than just "nothing yet". */
export function InlineEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="mx-auto max-w-[36ch] text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <h3 className="font-title text-xl">That did not load</h3>
      <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 text-sm font-medium text-cloth underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-sheet border border-ink/10 bg-white shadow-sheet ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-title text-3xl leading-tight">{title}</h1>
        {description && <p className="measure mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
