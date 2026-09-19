import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from '../lib/api';
import type {
  ActivityEntry,
  AdminStats,
  Book,
  BookQueue,
  BorrowResult,
  Loan,
  Member,
  Notification,
  Paginated,
  ReturnResult,
  WaitlistEntryForUser,
} from '../lib/types';

export interface CatalogFilters {
  q?: string;
  genre?: string;
  availability?: 'all' | 'available' | 'borrowed';
  sort?: 'title' | 'author' | 'genre' | 'id' | 'recent';
  page?: number;
  pageSize?: number;
}

export const useCatalog = (filters: CatalogFilters) =>
  useQuery({
    queryKey: ['books', filters],
    queryFn: () => api<Paginated<Book>>(`/books${qs({ ...filters })}`),
    placeholderData: (previous) => previous,
  });

export const useBook = (id: string) =>
  useQuery({ queryKey: ['book', id], queryFn: () => api<{ book: Book }>(`/books/${id}`) });

export const useSuggestions = (id: string) =>
  useQuery({
    queryKey: ['book', id, 'suggestions'],
    queryFn: () => api<{ books: Book[] }>(`/books/${id}/suggestions`),
  });

export const useGenres = () =>
  useQuery({
    queryKey: ['genres'],
    queryFn: () => api<{ genres: string[] }>('/books/genres'),
    staleTime: 5 * 60 * 1000,
  });

export const useMyLoans = (status: 'all' | 'active' | 'returned' = 'all') =>
  useQuery({
    queryKey: ['loans', 'me', status],
    queryFn: () => api<Paginated<Loan>>(`/loans/me${qs({ status, pageSize: 100 })}`),
  });

export const useAllLoans = (status: 'all' | 'active' | 'returned' = 'active') =>
  useQuery({
    queryKey: ['loans', 'all', status],
    queryFn: () => api<Paginated<Loan>>(`/loans${qs({ status, pageSize: 100 })}`),
  });

export const useMyWaitlist = () =>
  useQuery({
    queryKey: ['waitlist', 'me'],
    queryFn: () => api<{ entries: WaitlistEntryForUser[] }>('/waitlist/me'),
  });

export const useAllQueues = () =>
  useQuery({ queryKey: ['waitlist', 'all'], queryFn: () => api<{ queues: BookQueue[] }>('/waitlist') });

export const useActivityLog = (params: { page: number; q?: string; action?: string }) =>
  useQuery({
    queryKey: ['activities', params],
    queryFn: () => api<Paginated<ActivityEntry>>(`/activities${qs({ ...params, pageSize: 25 })}`),
    placeholderData: (previous) => previous,
  });

export const useMyActivity = () =>
  useQuery({
    queryKey: ['activities', 'me'],
    queryFn: () => api<Paginated<ActivityEntry>>(`/activities/me${qs({ pageSize: 25 })}`),
  });

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ unread: number; items: Notification[] }>('/notifications'),
    refetchInterval: 60_000,
  });

export const useAdminStats = () =>
  useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api<AdminStats>('/admin/stats') });

export const useMembers = (q?: string) =>
  useQuery({
    queryKey: ['admin', 'members', q],
    queryFn: () => api<{ users: Member[] }>(`/admin/users${qs({ q })}`),
  });

/** Anything that changes availability touches several lists at once. */
export function useLibraryMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['books'] });
    void queryClient.invalidateQueries({ queryKey: ['book'] });
    void queryClient.invalidateQueries({ queryKey: ['loans'] });
    void queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    void queryClient.invalidateQueries({ queryKey: ['activities'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
    void queryClient.invalidateQueries({ queryKey: ['genres'] });
  };

  const borrow = useMutation({
    mutationFn: ({ bookId, userId }: { bookId: string; userId?: string }) =>
      api<BorrowResult>(`/books/${bookId}/borrow`, { method: 'POST', body: userId ? { userId } : {} }),
    onSuccess: invalidate,
  });

  const returnBook = useMutation({
    mutationFn: ({ bookId, userId }: { bookId: string; userId?: string }) =>
      api<ReturnResult>(`/books/${bookId}/return`, { method: 'POST', body: userId ? { userId } : {} }),
    onSuccess: invalidate,
  });

  const joinWaitlist = useMutation({
    mutationFn: (bookId: string) =>
      api<{ position: number; message: string }>(`/books/${bookId}/waitlist`, { method: 'POST' }),
    onSuccess: invalidate,
  });

  const leaveWaitlist = useMutation({
    mutationFn: (bookId: string) =>
      api<{ message: string }>(`/books/${bookId}/waitlist`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const createBook = useMutation({
    mutationFn: (input: { id: string; title: string; author: string; genre: string }) =>
      api<{ book: Book }>('/books', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });

  const updateBook = useMutation({
    mutationFn: ({ id, ...input }: { id: string; title?: string; author?: string; genre?: string }) =>
      api<{ book: Book }>(`/books/${id}`, { method: 'PATCH', body: input }),
    onSuccess: invalidate,
  });

  const deleteBook = useMutation({
    mutationFn: (id: string) => api<{ removed: { title: string } }>(`/books/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const removeQueueEntry = useMutation({
    mutationFn: (entryId: string) =>
      api<{ message: string }>(`/waitlist/${entryId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const markNotificationsRead = useMutation({
    mutationFn: () => api<{ ok: true }>('/notifications/read-all', { method: 'POST' }),
    onSuccess: invalidate,
  });

  return {
    borrow,
    returnBook,
    joinWaitlist,
    leaveWaitlist,
    createBook,
    updateBook,
    deleteBook,
    removeQueueEntry,
    markNotificationsRead,
  };
}
