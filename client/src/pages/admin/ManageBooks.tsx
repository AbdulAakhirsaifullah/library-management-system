import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, TextInput } from '../../components/ui/Field';
import { ConfirmDialog } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState, ErrorState, PageHeader, Sheet, TableSkeleton } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { useCatalog, useLibraryMutations } from '../../hooks/queries';
import { ApiError } from '../../lib/api';
import type { Book } from '../../lib/types';

const EMPTY = { id: '', title: '', author: '', genre: '' };

export function ManageBooksPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const { data, isPending, isError, error, refetch } = useCatalog({
    q: search || undefined,
    sort: 'id',
    pageSize: 100,
    page: 1,
  });
  const { createBook, updateBook, deleteBook } = useLibraryMutations();

  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Book | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null);

  const reset = () => {
    setForm(EMPTY);
    setEditing(null);
    setFields({});
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFields({});
    try {
      if (editing) {
        await updateBook.mutateAsync({
          id: editing.id,
          title: form.title,
          author: form.author,
          genre: form.genre,
        });
        toast.success(`"${form.title}" updated.`);
      } else {
        await createBook.mutateAsync(form);
        toast.success(`"${form.title}" added to the catalogue.`);
      }
      reset();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        toast.error(err.message);
      } else {
        toast.error('That did not save. Try again.');
      }
    }
  };

  const startEdit = (book: Book) => {
    setEditing(book);
    setFields({});
    setForm({ id: book.id, title: book.title, author: book.author, genre: book.genre });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      const result = await deleteBook.mutateAsync(pendingDelete.id);
      toast.success(`"${result.removed.title}" removed from the catalogue.`);
      setPendingDelete(null);
      if (editing?.id === pendingDelete.id) reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'That book could not be removed.');
    }
  };

  return (
    <>
      <PageHeader title="Manage books" description="Add new stock, correct a record, or take a book off the shelves." />

      <Sheet className="mb-6 p-5">
        <h2 className="text-base">{editing ? `Editing ${editing.id}` : 'Add a book'}</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
          <Field
            label="Shelf ID"
            error={fields.id}
            hint={editing ? 'The ID cannot be changed.' : 'Must be unique, e.g. B025'}
          >
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                disabled={Boolean(editing)}
                value={form.id}
                onChange={(event) => setForm({ ...form, id: event.target.value })}
              />
            )}
          </Field>

          <Field label="Title" error={fields.title}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            )}
          </Field>

          <Field label="Author" error={fields.author}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.author}
                onChange={(event) => setForm({ ...form, author: event.target.value })}
              />
            )}
          </Field>

          <Field label="Genre" error={fields.genre}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.genre}
                onChange={(event) => setForm({ ...form, genre: event.target.value })}
              />
            )}
          </Field>

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={createBook.isPending || updateBook.isPending}>
              {editing ? 'Save changes' : 'Add to catalogue'}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" onClick={reset}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Sheet>

      <Sheet>
        <div className="border-b border-ink/10 p-4">
          <label htmlFor="manage-search" className="sr-only">
            Search the catalogue
          </label>
          <TextInput
            id="manage-search"
            type="search"
            placeholder="Search by title, author, genre or ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {isPending && <TableSkeleton />}
        {isError && (
          <ErrorState
            message={error instanceof ApiError ? error.message : 'The catalogue could not be loaded.'}
            onRetry={() => void refetch()}
          />
        )}
        {data && data.items.length === 0 && (
          <EmptyState title="No books match that" description="Try a different search term." />
        )}

        {data && data.items.length > 0 && (
          <ul className="divide-y divide-ink/8">
            {data.items.map((book) => (
              <li key={book.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-title text-[15px]">{book.title}</p>
                  <p className="text-[13px] text-ink-faint">
                    {book.author} · {book.genre} · {book.id}
                    {book.borrowedBy ? ` · with ${book.borrowedBy.username}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={book.status} />
                  <Button size="sm" variant="secondary" onClick={() => startEdit(book)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPendingDelete(book)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Remove "${pendingDelete?.title ?? ''}"?`}
        description="The book leaves the catalogue and anyone queued for it is taken off the list. Past loan records are kept."
        confirmLabel="Remove it"
        tone="danger"
        loading={deleteBook.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
