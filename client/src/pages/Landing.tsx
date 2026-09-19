import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LoadingScreen } from '../components/layout/AppShell';
import { Reveal } from '../components/ui/Reveal';

/**
 * Real titles from the seeded catalogue, set as covers rather than spines.
 * Staggered and lightly rotated so the row reads as books on a plank.
 */
const SHELF = [
  { title: 'The Left Hand of Darkness', author: 'Le Guin', cloth: '#2C5F4F', foil: '#E8DCBC' },
  { title: 'Beloved', author: 'Morrison', cloth: '#94322E', foil: '#EBD2A8' },
  { title: 'Cosmos', author: 'Sagan', cloth: '#16222B', foil: '#C69248' },
  { title: 'The Silk Roads', author: 'Frankopan', cloth: '#7C5320', foil: '#EBD2A8' },
  { title: 'Kindred', author: 'Butler', cloth: '#1F4639', foil: '#D8C69A' },
  { title: 'Thinking, Fast and Slow', author: 'Kahneman', cloth: '#3D4C55', foil: '#E4D6B4' },
  { title: 'Things Fall Apart', author: 'Achebe', cloth: '#2C5F4F', foil: '#E8DCBC' },
  { title: 'The Mythical Man-Month', author: 'Brooks', cloth: '#16222B', foil: '#D8C69A' },
];

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: 'Borrow without asking',
    body: 'If a book is on the shelf, take it. No request form, and no waiting on staff to approve anything.',
    icon: (
      <>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 14.5Z" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5Z" />
      </>
    ),
  },
  {
    title: 'Fair queues',
    body: 'Waiting lists run first come, first served. A returned book is held for the next person for 48 hours before it moves on.',
    icon: (
      <>
        <circle cx="6" cy="12" r="2.2" />
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="18" cy="12" r="2.2" />
        <path d="M8.5 12h1M14.5 12h1" />
      </>
    ),
  },
  {
    title: 'A complete record',
    body: 'Every borrow and return is logged with the book, the genre and the time, newest entry first.',
    icon: (
      <>
        <path d="M5 4.5h14v15H5z" />
        <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
      </>
    ),
  },
];

/** Literal classes so Tailwind's scanner keeps them; index-built strings get purged. */
const TILT = ['-rotate-1', 'rotate-0', 'rotate-1'] as const;
const STAGGER = ['', 'translate-y-2.5'] as const;

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-sheet bg-cloth-light text-cloth-dark">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-[22px] w-[22px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="flex gap-[3px]">
        <span className="h-5 w-1.5 rounded-[1px] bg-cloth" />
        <span className="h-5 w-1.5 rounded-[1px] bg-brass" />
        <span className="h-5 w-1.5 rounded-[1px] bg-ink" />
      </span>
      <span className="font-title text-lg">Bindery</span>
    </span>
  );
}

export function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={user.role === 'ADMIN' ? '/staff' : '/catalogue'} replace />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background: a warm pool of light behind the shelf, over a faint linen weave. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-board to-board-deep" />
        <div className="absolute left-1/2 top-[-16rem] h-[40rem] w-[68rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(44,95,79,0.14),rgba(44,95,79,0))]" />
        <div className="absolute right-[-12rem] top-[28rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(169,117,43,0.13),rgba(169,117,43,0))]" />
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(22,34,43,0.02) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(22,34,43,0.02) 0 1px, transparent 1px 3px)',
          }}
        />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="rounded-sheet">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            to="/sign-in"
            className="rounded-sheet px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/5 hover:text-cloth-dark"
          >
            Sign in
          </Link>
          <Link
            to="/sign-up"
            className="rounded-sheet bg-cloth px-4 py-2 text-sm font-medium text-white shadow-sheet transition-colors hover:bg-cloth-dark"
          >
            Join the library
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* --- Hero --- */}
        <section className="pt-12 sm:pt-20">
          <Reveal>
            <h1 className="max-w-3xl font-title text-[2.5rem] leading-[1.06] tracking-[-0.015em] sm:text-6xl lg:text-[4.25rem]">
              A library that keeps its own records.
            </h1>
          </Reveal>

          <Reveal delay={90}>
            <p className="mt-6 max-w-2xl font-title text-xl leading-[1.45] text-ink-soft sm:text-[1.55rem]">
              Catalogue, loans, queues and the log, in one place that members and staff both work
              from.
            </p>
          </Reveal>

          <Reveal delay={160}>
            <p className="measure mt-5 text-base leading-relaxed text-ink-soft">
              Everything on the shelves, and everyone waiting for it. Members find a book and borrow
              it. Staff see who has what, and what is due back.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/sign-up"
                className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-sheet bg-cloth px-7 text-[15px] font-medium text-white shadow-sheet transition-all duration-200 hover:-translate-y-0.5 hover:bg-cloth-dark hover:shadow-card"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M7 10h4.5M7 13.5h3" />
                  <circle cx="16.5" cy="10.8" r="1.7" />
                  <path d="M14.2 15.2c.5-1 1.3-1.5 2.3-1.5s1.8.5 2.3 1.5" />
                </svg>
                Create an account
              </Link>

              <Link
                to="/staff/sign-in"
                className="group inline-flex h-12 items-center justify-center gap-2.5 rounded-sheet border border-ink/15 bg-white/80 px-7 text-[15px] font-medium text-ink backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/35 hover:shadow-sheet"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-[18px] w-[18px] text-brass transition-transform duration-200 group-hover:rotate-12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8.5" cy="12" r="3.5" />
                  <path d="M12 12h8M17.5 12v3M20 12v2.5" />
                </svg>
                Staff sign in
              </Link>
            </div>
          </Reveal>
        </section>

        {/* --- Shelf --- */}
        <Reveal as="section" delay={120} className="mt-16 sm:mt-24">
          <h2 className="sr-only">A shelf of books from the catalogue</h2>

          <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            <ul className="flex min-w-max items-end gap-3 pt-10 sm:min-w-0 sm:justify-center sm:gap-4">
              {SHELF.map((book, index) => (
                <li key={book.title} className={`shrink-0 ${STAGGER[index % 2]}`}>
                  <article
                    style={{ backgroundColor: book.cloth }}
                    className={`relative flex h-[188px] w-[124px] flex-col justify-between overflow-hidden rounded-[3px] rounded-l-[6px] p-3.5 shadow-cover transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-2 hover:rotate-0 hover:shadow-coverLift sm:h-[210px] sm:w-[140px] ${TILT[index % 3]}`}
                  >
                    {/* Spine shading, and the gutter where the spine meets the board */}
                    <span aria-hidden className="absolute inset-y-0 left-0 w-[9px] bg-black/25" />
                    <span aria-hidden className="absolute inset-y-0 left-[9px] w-px bg-white/15" />
                    <span
                      aria-hidden
                      className="absolute left-[20px] right-3.5 top-3.5 h-px"
                      style={{ backgroundColor: book.foil, opacity: 0.55 }}
                    />

                    <h3 className="mt-4 pl-2.5 font-title text-[15px] leading-[1.25] text-white">
                      {book.title}
                    </h3>

                    <p
                      className="pl-2.5 text-[11px] font-medium tracking-wide"
                      style={{ color: book.foil }}
                    >
                      {book.author}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          </div>

          {/* The plank the books stand on */}
          <div className="-mx-5 sm:mx-0">
            <div className="h-2.5 rounded-[2px] bg-gradient-to-b from-ink to-[#0C151B] shadow-card" />
            <div className="mx-auto h-3 w-[92%] bg-gradient-to-b from-ink/20 to-transparent" />
          </div>

          <p className="mt-3 text-center text-[13px] text-ink-soft">
            Twenty-four titles are seeded and ready to borrow.
          </p>
        </Reveal>

        {/* --- Features --- */}
        <section className="mt-20 sm:mt-28">
          <h2 className="sr-only">How Bindery works</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {FEATURES.map((feature, index) => (
              <Reveal
                key={feature.title}
                delay={index * 90}
                className="rounded-sheet border border-ink/10 bg-white/85 p-6 shadow-card backdrop-blur-sm"
              >
                <FeatureIcon>{feature.icon}</FeatureIcon>
                <h3 className="mt-4 text-lg leading-snug">{feature.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{feature.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* --- Closing prompt --- */}
        <Reveal as="section" className="mt-20 sm:mt-28">
          <div className="rounded-sheet border border-ink/10 bg-ink px-6 py-10 text-center shadow-card sm:px-12 sm:py-14">
            <h2 className="font-title text-3xl leading-tight text-white sm:text-4xl">
              Start borrowing in about a minute.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/75">
              An account gets you the full catalogue, your loan history and a place in any queue.
            </p>
            <Link
              to="/sign-up"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-sheet bg-white px-7 text-[15px] font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-board"
            >
              Create an account
            </Link>
          </div>
        </Reveal>
      </main>

      {/* --- Footer --- */}
      <footer className="mt-20 border-t border-ink/10 sm:mt-28">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Wordmark />
              <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
                A lending library that keeps the catalogue, the loans and the queues in one place.
                Rebuilt from a C++ console system.
              </p>
            </div>

            <nav aria-labelledby="footer-members">
              <h2 id="footer-members" className="text-sm font-medium text-ink">
                For members
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link to="/sign-up" className="text-ink-soft transition-colors hover:text-cloth-dark">
                    Create an account
                  </Link>
                </li>
                <li>
                  <Link to="/sign-in" className="text-ink-soft transition-colors hover:text-cloth-dark">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    to="/forgot-password"
                    className="text-ink-soft transition-colors hover:text-cloth-dark"
                  >
                    Reset your password
                  </Link>
                </li>
              </ul>
            </nav>

            <nav aria-labelledby="footer-staff">
              <h2 id="footer-staff" className="text-sm font-medium text-ink">
                For staff
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    to="/staff/sign-in"
                    className="text-ink-soft transition-colors hover:text-cloth-dark"
                  >
                    Staff sign in
                  </Link>
                </li>
                <li>
                  <a href="/api/health" className="text-ink-soft transition-colors hover:text-cloth-dark">
                    Service status
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-ink/10 pt-6 text-[13px] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
            <p>Bindery Library Management System</p>
            <p>Built with Node, Express, Prisma and React.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
