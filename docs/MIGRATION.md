# From C++ console app to web application

A map of every rule in `librarymanagementsystem.cpp` (1,782 lines) and where it lives now. Line
numbers refer to the original file.

---

## Data structures

| Original                          | Purpose                | Now                                                       |
| --------------------------------- | ---------------------- | --------------------------------------------------------- |
| `DynamicArray<User>` (32–87)      | User storage           | `User` table, unique indexes on username and email          |
| `ActivityStack` (166–271)         | LIFO activity log      | `Activity` table read `ORDER BY createdAt DESC`             |
| `WaitingList` queue (565–708)     | Per-book FCFS queue    | `WaitlistEntry` table ordered by `createdAt`                |
| `BookCatalog` BST (710–1343)      | Books keyed by ID      | `Book` table, primary key on ID + indexes on title/author/genre |
| `users.txt`, `book_catalog.txt`, `borrowed_books.txt`, `waiting_list.txt`, `activityLog.txt` | Persistence | SQLite via Prisma |

The BST is gone on purpose. It gave O(log n) lookup by ID and nothing else — title, author and
genre searches were not possible. Indexed columns give the same lookup speed on ID plus indexed
search on the other three fields, which is what the brief asked for.

---

## User management

| Rule                                                    | C++       | Now                                        |
| ------------------------------------------------------- | --------- | ------------------------------------------ |
| Username must be unique                                 | 304–314   | Unique column + explicit pre-check         |
| Email must be unique                                     | 316–326   | Unique column + explicit pre-check         |
| Password: ≥8 chars, upper, lower, digit, special         | 328–350   | `server/src/lib/rules.ts`, mirrored in the sign-up form |
| Email must contain `@gmail.com`                          | 352–360   | `REQUIRE_GMAIL` flag, off by default       |
| Sign-up signs you straight in                            | 426       | Signup returns a JWT                        |
| Admin is `Admin` / `admin123`, compared as constants     | 278–279, 441 | A real user row with `role: 'ADMIN'`, seeded from env |
| Separate admin sign-in panel                             | 429–453   | `/staff/sign-in`, backed by `POST /api/auth/admin/login` |
| Forgot password prints the stored plaintext password     | 482–525   | Same username + email check, then a 30-minute single-use reset token |

**Not carried over:** passwords were stored in plaintext, space-separated, in `users.txt`. They are
bcrypt hashed now. As a side effect the original username/email/password serialisation would break
on any value containing a space; that class of bug is gone with a real database.

---

## Catalogue

| Rule                                             | C++       | Now                                             |
| ------------------------------------------------ | --------- | ----------------------------------------------- |
| Book = ID, title, author, genre, availability     | 710–728   | `Book` model                                     |
| Book ID must be unique                            | 752–767, 1110 | Primary key + a friendly 409 before insert   |
| Catalogue lists in ID order                       | 769–784   | `?sort=id` (the UI defaults to title order)     |
| Find a book by ID                                 | 881–895   | `GET /api/books/:id`, plus search on all fields  |
| Update title / author / genre in 7 combinations   | 1207–1261 | `PATCH /api/books/:id` with any subset of fields |
| Book ID is not editable                           | implied   | Same — the ID field is disabled when editing     |
| Delete a book                                     | 786–847   | `DELETE /api/books/:id`                          |
| Suggest same-genre books after borrowing          | 1321–1342 | `GET /api/books/:id/suggestions`, shown on the book page |

---

## Borrowing and returning

| Rule                                                       | C++       | Now                                      |
| ---------------------------------------------------------- | --------- | ---------------------------------------- |
| Available → borrow, record who has it                       | 849–879   | `POST /api/books/:id/borrow`             |
| Unavailable → join that book's waiting list                 | 869–871   | Same call returns `outcome: 'WAITLISTED'` |
| Unknown ID → error                                          | 874–876   | 404 with the ID in the message            |
| A member may only return their own book                     | 935–939   | Enforced; the original's wording is kept  |
| Admin may return any book                                   | 897–918   | Staff bypass the ownership check          |
| On return, notify the next person in the queue              | 950–957   | 48-hour hold + a notice in their account  |
| Log borrow and return with user, book, genre, timestamp     | 1379, 1390| `Activity` rows on success only           |

---

## Bugs in the original that were fixed rather than reproduced

1. **The activity log recorded the book ID in the title field.** `Activity(username, "Borrowed
   book", id, ...)` at line 1379 passes the ID where the constructor expects a title, so the log
   showed IDs. Both are stored now.
2. **Failed borrows were logged as successes.** `borrow_book()` logged "Borrowed book"
   unconditionally (1376–1380), so being put on a waiting list appeared in the log as a borrow.
   Activity is now written inside the transaction, only on the path that succeeded.
3. **Every book shared one waiting list file.** Each `BookNode` owned a `WaitingList`, but the
   constructor loaded the same global `waiting_list.txt` (581–636), which held usernames with no
   book ID. On restart every book inherited every queued username. Queues are per-book rows now.
4. **Borrower identity was never persisted.** `borrowed_books.txt` was written on borrow, but
   `load_borrowed_books_from_file()` (1009–1047) only set `available = false` and never restored
   `borrowed_by`. After a restart nobody owned any book, so the ownership check silently stopped
   working. The `Loan` table is the single source of truth now.
5. **Admin returns left a ghost owner.** `return_book()` (897–918) set `available = true` without
   clearing `borrowed_by`, unlike the member path. Both paths close the loan properly now.
6. **Deleting a BST node dropped its waiting list.** The two-child delete case (829–844) copied
   the successor's ID, title, author, genre and availability but not its waiting list or borrower.
   Deletion now cancels the queue explicitly, and is refused outright while the book is on loan.
7. **The comma-separated catalogue file broke on commas.** `book_catalog.txt` used commas as
   delimiters (1054), so any title containing one corrupted the record on load.

---

## Deliberate additions

These were not in the original. Each is listed so nothing looks like it drifted in by accident.

- **Due dates.** Loans get a due date (`LOAN_DAYS`, default 14) and overdue books are flagged for
  staff. The original tracked no dates at all beyond the log timestamp.
- **Username format rules.** 3–24 characters, letters/numbers/`.`/`_`/`-`. The original imposed
  none, but a login handle needs a shape.
- **Notifications.** The original printed "Notifying X…" to whichever console happened to be open,
  where the person it concerned could never see it.
- **Search by title, author and genre.** The BST only supported ID lookup.
- **Genres endpoint, pagination, and per-book queue positions.** Interface needs with no console
  equivalent.
- **Rate limiting on auth routes.** The original looped forever on a failed login.

---

## Behaviour that was kept exactly

- The password policy, character class for character class.
- The Gmail-only email rule, available behind `REQUIRE_GMAIL`.
- "You cannot return a book you did not borrow." — the message is unchanged.
- Sign-up signing you in immediately.
- Borrowing an unavailable book putting you in its queue, rather than erroring.
- Same-genre suggestions after a successful borrow.
- Newest-first activity ordering, which is what the stack gave you.
- No borrow limit by default (`MAX_ACTIVE_LOANS=0`).
