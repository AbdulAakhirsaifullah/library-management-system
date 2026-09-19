const dateTime = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateOnly = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export const formatDateTime = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : '—');
export const formatDate = (iso: string | null) => (iso ? dateOnly.format(new Date(iso)) : '—');

export function relativeTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < hour) return rtf.format(Math.round(diff / minute), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), 'day');
  return formatDate(iso);
}

export const ACTION_LABELS: Record<string, string> = {
  BORROW: 'Borrowed',
  RETURN: 'Returned',
  WAITLIST_JOIN: 'Joined the waiting list',
  WAITLIST_LEAVE: 'Left the waiting list',
  HOLD_ASSIGNED: 'Book held for them',
  HOLD_EXPIRED: 'Hold expired',
  BOOK_ADDED: 'Added a book',
  BOOK_UPDATED: 'Updated a book',
  BOOK_DELETED: 'Removed a book',
};
