export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
}

export type BookStatus = 'AVAILABLE' | 'BORROWED' | 'ON_HOLD' | 'HELD_FOR_YOU';

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  status: BookStatus;
  available: boolean;
  borrowedBy: { id: string; username: string } | null;
  borrowedAt: string | null;
  dueAt: string | null;
  holdExpiresAt: string | null;
  waitlistCount: number;
  viewer: {
    hasLoan: boolean;
    onWaitlist: boolean;
    waitlistPosition: number | null;
    hasHold: boolean;
  } | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Loan {
  id: string;
  book: { id: string; title: string; author: string; genre: string };
  user: { id: string; username: string };
  borrowedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  isOverdue: boolean;
  handledBy: string | null;
}

export interface ActivityEntry {
  id: string;
  action: string;
  username: string;
  bookId: string | null;
  bookTitle: string;
  genre: string;
  actorUsername: string | null;
  detail: string | null;
  createdAt: string;
}

export interface WaitlistEntryForUser {
  id: string;
  status: 'WAITING' | 'HOLD';
  position: number;
  joinedAt: string;
  holdExpiresAt: string | null;
  book: { id: string; title: string; author: string; genre: string };
}

export interface QueueEntry {
  id: string;
  position: number;
  status: string;
  user: { id: string; username: string; email?: string };
  joinedAt: string;
  holdExpiresAt: string | null;
}

export interface BookQueue {
  book: { id: string; title: string; author: string };
  entries: QueueEntry[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  book: { id: string; title: string } | null;
  read: boolean;
  createdAt: string;
}

export interface BorrowResult {
  outcome: 'BORROWED' | 'WAITLISTED' | 'ALREADY_WAITING';
  book: Book;
  waitlistPosition: number | null;
  suggestions: Book[];
  message: string;
}

export interface ReturnResult {
  book: Book;
  message: string;
  nextInLine: { username: string; expiresAt: string } | null;
}

export interface AdminStats {
  books: number;
  available: number;
  members: number;
  activeLoans: number;
  overdue: number;
  waiting: number;
  holds: number;
  activityLastWeek: number;
}

export interface Member extends User {
  totalLoans: number;
  activeLoans: number;
}
