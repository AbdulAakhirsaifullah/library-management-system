import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useNotifications } from '../../hooks/queries';
import { Button } from '../ui/Button';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const memberLinks: NavItem[] = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/my-books', label: 'My books' },
  { to: '/waiting-list', label: 'Waiting list' },
  { to: '/notices', label: 'Notices' },
];

const staffLinks: NavItem[] = [
  { to: '/staff', label: 'Overview', end: true },
  { to: '/staff/books', label: 'Manage books' },
  { to: '/staff/loans', label: 'Loans' },
  { to: '/staff/queues', label: 'Waiting lists' },
  { to: '/staff/activity', label: 'Activity log' },
  { to: '/staff/members', label: 'Members' },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: notices } = useNotifications();
  const unread = notices?.unread ?? 0;

  const isStaff = user?.role === 'ADMIN';
  const links = isStaff ? [...memberLinks.slice(0, 1), ...staffLinks] : memberLinks;

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* The rail reads as a book spine: narrow, dark, standing on end. */}
      <aside className="bg-ink text-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <NavLink to={isStaff ? '/staff' : '/catalogue'} className="flex items-center gap-2.5">
            <span aria-hidden className="flex gap-[3px]">
              <span className="h-5 w-1.5 rounded-[1px] bg-cloth" />
              <span className="h-5 w-1.5 rounded-[1px] bg-brass" />
              <span className="h-5 w-1.5 rounded-[1px] bg-board" />
            </span>
            <span className="font-title text-lg">Bindery</span>
          </NavLink>
          <button
            className="rounded-sheet px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="main-nav"
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>

        <nav
          id="main-nav"
          className={`${open ? 'block' : 'hidden'} border-t border-white/10 px-3 pb-4 lg:block lg:border-t-0`}
        >
          <ul className="space-y-0.5 pt-2">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-sheet px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                  {link.to === '/notices' && unread > 0 && (
                    <span className="ml-2 rounded-full bg-brass px-1.5 text-[11px] font-semibold text-white">
                      {unread}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-white/10 px-3 pt-4">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-[13px] text-white/55">{isStaff ? 'Library staff' : 'Member'}</p>
            <button
              onClick={handleSignOut}
              className="mt-3 text-[13px] font-medium text-white/70 underline underline-offset-4 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4"
    >
      <span aria-hidden className="flex animate-pulse gap-[3px]">
        <span className="h-7 w-2 rounded-[1px] bg-cloth" />
        <span className="h-7 w-2 rounded-[1px] bg-brass" />
        <span className="h-7 w-2 rounded-[1px] bg-ink" />
      </span>
      <p className="text-sm text-ink-soft">Opening the catalogue…</p>
    </div>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-title text-4xl">Nothing on this shelf</h1>
      <p className="measure mt-3 text-ink-soft">
        The page you asked for is not here. It may have been moved or removed.
      </p>
      <Button className="mt-6" onClick={() => navigate('/')}>
        Back to the entrance
      </Button>
    </div>
  );
}
