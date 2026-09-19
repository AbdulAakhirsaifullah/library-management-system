import type { ReactNode } from 'react';
import type { BookStatus } from '../../lib/types';

const STYLES: Record<BookStatus, { label: string; className: string }> = {
  AVAILABLE: { label: 'On the shelf', className: 'bg-cloth-light text-cloth-dark' },
  BORROWED: { label: 'On loan', className: 'bg-ink/8 text-ink-soft' },
  ON_HOLD: { label: 'Held for someone', className: 'bg-brass-light text-brass' },
  HELD_FOR_YOU: { label: 'Held for you', className: 'bg-brass text-white' },
};

export function StatusBadge({ status, className = '' }: { status: BookStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${style.className} ${className}`}
    >
      {style.label}
    </span>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warn' | 'bad' }) {
  const tones = {
    neutral: 'bg-ink/8 text-ink-soft',
    warn: 'bg-brass-light text-brass',
    bad: 'bg-rust-light text-rust',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
