import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout, FormError } from './AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Field';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';

/** Mirrors the server rules in lib/rules.ts, for live feedback while typing. */
const CHECKS: { label: string; test: (value: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'A number', test: (v) => /[0-9]/.test(v) },
  { label: 'A special character', test: (v) => /[!-/:-@[-`{-~]/.test(v) },
];

export function SignUpPage() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/catalogue" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});
    setSubmitting(true);
    try {
      await signUp(form);
      navigate('/catalogue', { replace: true });
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
      title="Join the library"
      intro="One account lets you borrow books and hold your place in any queue."
      footer={
        <>
          Already a member?{' '}
          <Link to="/sign-in" className="font-medium text-cloth underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />

        <Field label="Username" error={fields.username} hint="3–24 characters. Letters, numbers, . _ -">
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

        <Field label="Email" error={fields.email}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="email"
              aria-describedby={describedBy}
              invalid={invalid}
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
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
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          )}
        </Field>

        <ul className="space-y-1">
          {CHECKS.map((check) => {
            const passed = check.test(form.password);
            return (
              <li key={check.label} className="flex items-center gap-2 text-[13px]">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-cloth' : 'bg-ink/25'}`}
                />
                <span className={passed ? 'text-cloth-dark' : 'text-ink-faint'}>{check.label}</span>
              </li>
            );
          })}
        </ul>

        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
