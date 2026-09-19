import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Select, TextInput } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState, ErrorState, PageHeader, Sheet, TableSkeleton } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useCatalog, useGenres, useLibraryMutations, type CatalogFilters } from '../hooks/queries';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Book } from '../lib/types';

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CataloguePage() {
  const toast = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>({
    availability: 'all',
    sort: 'title',
    page: 1,
    pageSize: 20,
  });

  const debouncedSearch = useDebounced(search);
  const query = { ...filters, q: debouncedSearch || undefined, page: debouncedSearch ? 1 : filters.page };

  const { data, isPending, isError, error, refetch, isFetching } = useCatalog(query);
  const { data: genreData } = useGenres();
  const { borrow, joinWaitlist, leaveWaitlist } = useLibraryMutations();

  const busy = borrow.isPending || joinWaitlist.isPending || leaveWaitlist.isPending;

  const act = async (book: Book, action: 'borrow' | 'join' | 'leave') => {
    try {
      if (action === 'borrow') {
        const result = await borrow.mutateAsync({ bookId: book.id });
        toast[result.outcome === 'BORROWED' ? 'success' : 'info'](result.message);
      } else if (action === 'join') {
        const result = await joinWaitlist.mutateAsync(book.id);
        toast.info(result.message);
      } else {
        const result = await leaveWaitlist.mutateAsync(book.id);
        toast.info(result.message);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That did not work. Try again.');
    }
  };

  const actionFor = (book: Book) => {
    if (!user) {
      return (
        <Link to="/sign-in" className="text-[13px] font-medium text-cloth underline underline-offset-4">
          Sign in to borrow
        </Link>
      );
    }
    if (book.viewer?.hasLoan) {
      return (
        <Link to="/my-books" className="text-[13px] font-medium text-cloth underline underline-offset-4">
          You have this
        </Link>
      );
    }
    if (book.viewer?.hasHold) {
      return (
        <Button size="sm" disabled={busy} onClick={() => act(book, 'borrow')}>
          Collect hold
        </Button>
      );
    }
    if (book.viewer?.onWaitlist) {
      return (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(book, 'leave')}>
          Leave queue ({book.viewer.waitlistPosition})
        </Button>
      );
    }
    if (book.status === 'AVAILABLE') {
      return (
        <Button size="sm" disabled={busy} onClick={() => act(book, 'borrow')}>
          Borrow
        </Button>
      );
    }
    return (
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(book, 'join')}>
        Join queue
      </Button>
    );
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Search by title, author, genre or shelf ID. Borrow what is in, queue for what is out."
      />

      <Sheet className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="catalogue-search" className="sr-only">
              Search the catalogue
            </label>
            <TextInput
              id="catalogue-search"
              type="search"
              placeholder="Search title, author, genre or ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="catalogue-genre" className="sr-only">
              Genre
            </label>
            <Select
              id="catalogue-genre"
              value={filters.genre ?? ''}
              onChange={(event) =>
                setFilters({ ...filters, genre: event.target.value || undefined, page: 1 })
              }
            >
              <option value="">Every genre</option>
              {genreData?.genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="catalogue-availability" className="sr-only">
                Availability
              </label>
              <Select
                id="catalogue-availability"
                value={filters.availability}
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    availability: event.target.value as CatalogFilters['availability'],
                    page: 1,
                  })
                }
              >
                <option value="all">All books</option>
                <option value="available">On the shelf</option>
                <option value="borrowed">Out on loan</option>
              </Select>
            </div>
            <div>
              <label htmlFor="catalogue-sort" className="sr-only">
                Sort by
              </label>
              <Select
                id="catalogue-sort"
                value={filters.sort}
                onChange={(event) =>
                  setFilters({ ...filters, sort: event.target.value as CatalogFilters['sort'], page: 1 })
                }
              >
                <option value="title">By title</option>
                <option value="author">By author</option>
                <option value="genre">By genre</option>
                <option value="id">By shelf ID</option>
                <option value="recent">Newest first</option>
              </Select>
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet>
        {isPending && <TableSkeleton />}

        {isError && (
          <ErrorState
            message={error instanceof ApiError ? error.message : 'The catalogue is not responding.'}
            onRetry={() => void refetch()}
          />
        )}

        {data && data.items.length === 0 && (
          <EmptyState
            title="No books match that"
            description="Try a different word, or clear the filters to see the whole catalogue."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setFilters({ availability: 'all', sort: 'title', page: 1, pageSize: 20 });
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}

        {data && data.items.length > 0 && (
          <div aria-busy={isFetching}>
            {/* Desktop: a real record table. Mobile: stacked entries. */}
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[13px] text-ink-faint">
                  <th scope="col" className="px-4 py-2.5 font-medium">Book</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Genre</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Shelf ID</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((book) => (
                  <tr key={book.id} className="border-b border-ink/6 last:border-0">
                    <td className="px-4 py-3">
                      <Link to={`/books/${book.id}`} className="font-title text-[15px] hover:text-cloth">
                        {book.title}
                      </Link>
                      <p className="text-[13px] text-ink-faint">{book.author}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{book.genre}</td>
                    <td className="px-4 py-3 font-medium text-ink-faint">{book.id}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={book.status} />
                      {book.waitlistCount > 0 && (
                        <p className="mt-1 text-[12px] text-ink-faint">
                          {book.waitlistCount} waiting
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{actionFor(book)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-ink/8 md:hidden">
              {data.items.map((book) => (
                <li key={book.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/books/${book.id}`} className="font-title text-base hover:text-cloth">
                        {book.title}
                      </Link>
                      <p className="text-[13px] text-ink-faint">
                        {book.author} · {book.genre} · {book.id}
                      </p>
                    </div>
                    <StatusBadge status={book.status} />
                  </div>
                  <div className="mt-3">{actionFor(book)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>

      {data && totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Catalogue pages">
          <Button
            variant="secondary"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => setFilters({ ...filters, page: data.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-ink-soft">
            Page {data.page} of {totalPages} · {data.total} books
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={data.page >= totalPages}
            onClick={() => setFilters({ ...filters, page: data.page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
    </>
  );
}
