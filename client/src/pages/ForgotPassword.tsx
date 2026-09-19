import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, FormError } from './AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Field';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { User } from '../lib/types';

const CHECKS: { label: string; test: (value: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'A number', test: (v) => /[0-9]/.test(v) },
  { label: 'A special character', test: (v) => /[!-/:-@[-`{-~]/.test(v) },
];

/**
 * Step 1 verifies username + email, the same pair the C++ version checked
 * before printing the stored password. Instead of revealing anything, it
 * issues a one-time reset code.
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { applySession } = useAuth();

  const [step, setStep] = useState<'identify' | 'reset'>('identify');
  const [form, setForm] = useState({ username: '', email: '' });
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleError = (err: unknown) => {
    if (err instanceof ApiError) {
      setError(err.message);
      setFields(err.fields);
    } else {
      setError('Could not reach the library. Check your connection and try again.');
    }
  };

  const identify = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});
    setSubmitting(true);
    try {
      const result = await api<{ token: string }>('/auth/forgot-password', {
        method: 'POST',
        body: form,
      });
      setToken(result.token);
      setStep('reset');
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});
    setSubmitting(true);
    try {
      const session = await api<{ token: string; user: User }>('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
      });
      applySession(session);
      navigate(session.user.role === 'ADMIN' ? '/staff' : '/catalogue', { replace: true });
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'reset') {
    return (
      <AuthLayout
        title="Choose a new password"
        intro="Your identity checked out. Set a new password and you will be signed straight in."
      >
        <form onSubmit={reset} className="space-y-4" noValidate>
          <FormError message={error} />

          <Field label="New password" error={fields.password}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="password"
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            )}
          </Field>

          <ul className="space-y-1">
            {CHECKS.map((check) => {
              const passed = check.test(password);
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
            Save password
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      intro="Confirm the username and email on your account, and we will let you set a new password."
      footer={
        <Link to="/sign-in" className="font-medium text-cloth underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={identify} className="space-y-4" noValidate>
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

        <Button type="submit" loading={submitting} className="w-full">
          Continue
        </Button>
      </form>
    </AuthLayout>
  );
}
