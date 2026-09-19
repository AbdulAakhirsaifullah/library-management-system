import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout, FormError } from './AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Field';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';

export function SignInPage({ staffOnly = false }: { staffOnly?: boolean }) {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [form, setForm] = useState({ username: '', password: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={user.role === 'ADMIN' ? '/staff' : '/catalogue'} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});
    setSubmitting(true);
    try {
      const signedIn = await signIn(form, staffOnly);
      const fallback = signedIn.role === 'ADMIN' ? '/staff' : '/catalogue';
      navigate(location.state?.from ?? fallback, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields);
      } else {
        setError('Could not reach the library. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={staffOnly ? 'Staff sign in' : 'Welcome back'}
      intro={
        staffOnly
          ? 'Signing in here opens the management side of the library.'
          : 'Sign in to borrow, return and keep track of your books.'
      }
      footer={
        staffOnly ? (
          <Link to="/sign-in" className="font-medium text-cloth underline underline-offset-4">
            Member sign in
          </Link>
        ) : (
          <>
            New here?{' '}
            <Link to="/sign-up" className="font-medium text-cloth underline underline-offset-4">
              Create an account
            </Link>
          </>
        )
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />

        <Field label="Username" error={fields.username}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="username"
              autoFocus
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          )}
        </Field>

        <Field label="Password" error={fields.password}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="password"
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          )}
        </Field>

        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>

        {!staffOnly && (
          <p className="text-center text-[13px]">
            <Link to="/forgot-password" className="text-ink-soft underline underline-offset-4 hover:text-ink">
              Forgotten your password?
            </Link>
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
