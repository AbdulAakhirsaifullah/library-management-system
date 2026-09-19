# Setup and API reference

> Detailed notes. Start with the [root README](../README.md).

## Bindery — Library Management System

A full-stack rebuild of a C++ console library system (`librarymanagementsystem.cpp`) as a web
application. Every feature of the original is here: accounts with the same validation rules, an
admin side, a searchable catalogue, borrowing and returning with the same ownership rule,
first-come-first-served waiting lists, and a newest-first activity log.

The `.txt` files the original wrote to (`users.txt`, `book_catalog.txt`, `borrowed_books.txt`,
`waiting_list.txt`, `activityLog.txt`) are replaced by SQLite tables.

**Stack:** Node.js · Express · TypeScript · Prisma · SQLite · React · Tailwind CSS · JWT · bcrypt

See [`MIGRATION.md`](./MIGRATION.md) for a line-by-line map of what came from where in the C++
source, and which original bugs were deliberately not carried over.

---

## Running it locally

You need Node 18.18 or newer.

```bash
git clone https://github.com/AbdulAakhirsaifullah/library-management-system.git
cd library-management-system

cp server/.env.example server/.env   # then edit JWT_SECRET
npm install
npm run db:push                  # creates server/data/library.db from the Prisma schema
npm run seed                     # adds the staff account, 2 members and 24 books
npm run dev                      # API on :4000, UI on :5173
```

Open <http://localhost:5173>.

| Account | Username | Password     |
| ------- | -------- | ------------ |
| Staff   | `Admin`  | `Admin@123`  |
| Member  | `ayesha` | `Reader@123` |
| Member  | `daniyal`| `Reader@123` |

The original hardcoded `Admin` / `admin123`, but that password fails the project's own password
policy, so the seeded default is `Admin@123`. Change it with `ADMIN_PASSWORD` in `server/.env`.

`npm run setup` does the install, push and seed in one go.

### Useful scripts

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run dev`       | API and UI together, both with hot reload             |
| `npm run build`     | Builds the React bundle, then compiles the server      |
| `npm start`         | Runs the production build (API serves the UI)          |
| `npm run db:push`   | Applies `schema.prisma` to the database                |
| `npm run db:studio` | Opens Prisma Studio to browse the data                 |
| `npm run seed`      | Seeds sample data (safe to re-run)                     |
| `npm run typecheck` | Type-checks both workspaces                            |

---

## How it is put together

```
library-management-system/
├─ server/                    Express + Prisma API
│  ├─ prisma/
│  │  ├─ schema.prisma        Users, books, loans, waitlist, activity, notifications
│  │  └─ seed.ts              Sample catalogue and demo state
│  └─ src/
│     ├─ index.ts             Boot: connect, seed staff account, start hold sweeper
│     ├─ app.ts               Express app; serves the React build in production
│     ├─ env.ts               Validated configuration
│     ├─ lib/
│     │  ├─ rules.ts          Password and email rules ported from the C++ source
│     │  ├─ password.ts       bcrypt hashing
│     │  ├─ jwt.ts            Token signing and verification
│     │  └─ errors.ts         Typed HTTP errors
│     ├─ middleware/          auth, requireAdmin, zod validation, error handler
│     └─ modules/
│        ├─ auth/             Sign up, sign in, staff sign in, password reset
│        ├─ books/            Catalogue, search, CRUD, genre suggestions
│        ├─ loans/            Borrow, return, and the 48-hour hold logic
│        ├─ waitlist/         Per-book queues
│        ├─ activity/         The log
│        └─ admin/            Stats and member list
└─ client/                    React + Vite + Tailwind
   └─ src/
      ├─ pages/               Landing, auth, catalogue, book, my books, queues, notices
      ├─ pages/admin/         Overview, manage books, loans, queues, log, members
      ├─ components/ui/       Button, fields, badges, toasts, dialog, loading states
      ├─ components/layout/   App shell and route guards
      ├─ hooks/queries.ts     All TanStack Query hooks and mutations
      └─ lib/                 API client, auth context, formatters, shared types
```

Search uses indexed columns rather than the original's binary search tree. Lookups by ID, title,
author and genre are all indexed, so it is at least as fast as the BST and supports the
title/author/genre search the console version could not do.

---

## API

All responses are JSON. Errors come back as
`{ "error": { "code": "...", "message": "...", "details": { "field": "..." } } }` — `details` holds
per-field messages, which is what the forms render inline.

Authenticated routes take `Authorization: Bearer <token>`.

### Auth

| Method | Route                       | Access | Notes                                     |
| ------ | --------------------------- | ------ | ----------------------------------------- |
| POST   | `/api/auth/signup`          | public | Unique username + email, password rules   |
| POST   | `/api/auth/login`           | public | Returns `{ token, user }`                 |
| POST   | `/api/auth/admin/login`     | public | Same, but rejects non-staff accounts      |
| POST   | `/api/auth/forgot-password` | public | Verifies username + email, issues a token |
| POST   | `/api/auth/reset-password`  | public | Consumes the token, signs the user in     |
| GET    | `/api/auth/me`              | member | Current account                           |

### Books

| Method | Route                        | Access | Notes                                                |
| ------ | ---------------------------- | ------ | ---------------------------------------------------- |
| GET    | `/api/books`                 | public | `?q=&genre=&availability=&sort=&page=&pageSize=`      |
| GET    | `/api/books/genres`          | public | Distinct genres, for the filter                       |
| GET    | `/api/books/:id`             | public | One book, with viewer-specific state when signed in   |
| GET    | `/api/books/:id/suggestions` | public | Other books in the same genre                         |
| POST   | `/api/books`                 | staff  | Rejects a duplicate ID                                |
| PATCH  | `/api/books/:id`             | staff  | Title, author, genre; the ID is fixed                 |
| DELETE | `/api/books/:id`             | staff  | Refused while the book is on loan                     |

### Borrowing and queues

| Method | Route                       | Access | Notes                                                       |
| ------ | --------------------------- | ------ | ----------------------------------------------------------- |
| POST   | `/api/books/:id/borrow`     | member | Available → borrow; out → join the queue. `{userId}` = staff |
| POST   | `/api/books/:id/return`     | member | Members may only return their own. `{userId}` = staff        |
| POST   | `/api/books/:id/waitlist`   | member | Join the queue explicitly                                    |
| DELETE | `/api/books/:id/waitlist`   | member | Leave the queue                                              |
| GET    | `/api/books/:id/waitlist`   | staff  | The queue for one book                                       |
| GET    | `/api/waitlist/me`          | member | Your queues and holds                                        |
| GET    | `/api/waitlist`             | staff  | Every active queue                                           |
| DELETE | `/api/waitlist/:entryId`    | staff  | Remove someone from a queue                                  |
| GET    | `/api/loans/me`             | member | Your borrow history                                          |
| GET    | `/api/loans`                | staff  | All loans; `?status=active\|returned\|all`                   |

### Log, notices, admin

| Method | Route                            | Access | Notes                                    |
| ------ | -------------------------------- | ------ | ---------------------------------------- |
| GET    | `/api/activities`                | staff  | Newest first; `?q=&action=&page=`         |
| GET    | `/api/activities/me`             | member | Your own entries                          |
| GET    | `/api/notifications`             | member | Hold notices                              |
| POST   | `/api/notifications/read-all`    | member | Mark everything read                      |
| GET    | `/api/admin/stats`               | staff  | Dashboard counts                          |
| GET    | `/api/admin/users`               | staff  | Members with loan counts                  |
| GET    | `/api/health`                    | public | Health check for the platform             |

---

## How the waiting list works

This is the one place with behaviour the original only sketched.

1. Someone tries to borrow a book that is out, so they join that book's queue.
2. The book comes back. The person at the front is put on **hold**: the book is reserved for them
   and nobody else can borrow it.
3. They get a notice, and have **48 hours** (`HOLD_HOURS`) to collect it.
4. If they collect it, the queue entry closes and the loan starts.
5. If they do not, the hold expires, they are notified, and it passes to the next person. If the
   queue is empty the book goes back on the shelf.

Expiry is handled two ways so it never gets stuck: a sweep runs every 10 minutes, and any read of
the catalogue clears lapsed holds first.

---

## Configuration

Everything lives in `server/.env`. See `server/.env.example` for the full list.

| Variable            | Default                 | What it does                                         |
| ------------------- | ----------------------- | ---------------------------------------------------- |
| `DATABASE_URL`      | `file:./data/library.db`| SQLite file. Point at the volume in production        |
| `JWT_SECRET`        | dev placeholder         | **Must** be set in production; 16+ characters         |
| `JWT_EXPIRES_DAYS`  | `7`                     | Session length                                        |
| `ADMIN_USERNAME`    | `Admin`                 | Staff account, upserted on every boot                 |
| `ADMIN_PASSWORD`    | `Admin@123`             | Staff password                                        |
| `REQUIRE_GMAIL`     | `false`                 | `true` restores the original's Gmail-only email rule  |
| `LOAN_DAYS`         | `14`                    | Loan length. The original had no due dates            |
| `HOLD_HOURS`        | `48`                    | How long a returned book is held for the next person  |
| `MAX_ACTIVE_LOANS`  | `0`                     | `0` = unlimited, as in the original                   |

---

## Deploying

**One service on Railway, with a volume for the SQLite file.** The API serves the React build from
the same origin, so there is one deploy, one URL, no CORS setup and no cross-origin cookie problems.
A split Vercel + Render setup means two deploys, two sets of environment variables and a CORS
allowlist to keep in sync — more moving parts for no benefit at this size.

1. Push the repo to GitHub and create a Railway project from it.
2. Add a **Volume** mounted at `/data`.
3. Set the variables:
   ```
   NODE_ENV=production
   DATABASE_URL=file:/data/library.db
   JWT_SECRET=<a long random string>
   ADMIN_USERNAME=Admin
   ADMIN_PASSWORD=<something other than the default>
   ```
   Railway supplies `PORT` itself.
4. Deploy. `railway.json` already sets the build and start commands and points the health check at
   `/api/health`. The start command runs `prisma db push` first, so the schema is applied on boot.
5. Seed the catalogue once from the Railway shell: `npm run seed`.

The staff account is created automatically on first boot, so you can sign in even without seeding.

There is also a `Dockerfile` if you would rather Railway build from that than from Nixpacks, and the
same image runs on Fly.io or any container host with a volume mounted at `/data`.

### Moving to Postgres later

Nothing above assumes SQLite beyond the connection string. Change the `datasource` provider in
`schema.prisma` to `postgresql`, point `DATABASE_URL` at the new database, and run `prisma db push`.
Worth doing if you ever need more than one instance, since SQLite ties you to a single container.

---

## Things worth knowing

- **Passwords are hashed with bcrypt**, so the original's "would you like to see your password?"
  feature is impossible by design. The replacement checks the same username + email pair and issues
  a 30-minute single-use reset code.
- With no mail server configured, `/api/auth/forgot-password` returns the reset token in the
  response so the flow works end to end. **Before putting this in front of real users**, send the
  token by email instead and remove it from the response body — it is the one place the demo trades
  security for being runnable out of the box.
- `bcryptjs` is used rather than `bcrypt` because it is pure JavaScript and needs no native
  compilation, which keeps deployment builds simple. The API is identical.
- Rate limiting is applied to the auth routes only (40 attempts per 15 minutes per IP).
