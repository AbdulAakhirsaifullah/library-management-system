import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppShell, NotFoundPage } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { LandingPage } from './pages/Landing';
import { SignInPage } from './pages/SignIn';
import { SignUpPage } from './pages/SignUp';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { CataloguePage } from './pages/Catalogue';
import { BookDetailPage } from './pages/BookDetail';
import { MyBooksPage } from './pages/MyBooks';
import { MyWaitlistPage } from './pages/MyWaitlist';
import { NoticesPage } from './pages/Notices';

import { AdminOverviewPage } from './pages/admin/Overview';
import { ManageBooksPage } from './pages/admin/ManageBooks';
import { AdminLoansPage } from './pages/admin/Loans';
import { QueuesPage } from './pages/admin/Queues';
import { ActivityLogPage } from './pages/admin/ActivityLog';
import { MembersPage } from './pages/admin/Members';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/sign-in" element={<SignInPage />} />
                <Route path="/staff/sign-in" element={<SignInPage staffOnly />} />
                <Route path="/sign-up" element={<SignUpPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppShell />}>
                    <Route path="/catalogue" element={<CataloguePage />} />
                    <Route path="/books/:id" element={<BookDetailPage />} />
                    <Route path="/my-books" element={<MyBooksPage />} />
                    <Route path="/waiting-list" element={<MyWaitlistPage />} />
                    <Route path="/notices" element={<NoticesPage />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute staffOnly />}>
                  <Route element={<AppShell />}>
                    <Route path="/staff" element={<AdminOverviewPage />} />
                    <Route path="/staff/books" element={<ManageBooksPage />} />
                    <Route path="/staff/loans" element={<AdminLoansPage />} />
                    <Route path="/staff/queues" element={<QueuesPage />} />
                    <Route path="/staff/activity" element={<ActivityLogPage />} />
                    <Route path="/staff/members" element={<MembersPage />} />
                  </Route>
                </Route>

                <Route path="/admin" element={<Navigate to="/staff" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
