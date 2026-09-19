import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-8 flex items-center gap-2.5">
        <span aria-hidden className="flex gap-[3px]">
          <span className="h-5 w-1.5 rounded-[1px] bg-cloth" />
          <span className="h-5 w-1.5 rounded-[1px] bg-brass" />
          <span className="h-5 w-1.5 rounded-[1px] bg-ink" />
        </span>
        <span className="font-title text-lg">Bindery</span>
      </Link>

      <div className="w-full max-w-sm rounded-sheet border border-ink/10 bg-white p-6 shadow-sheet">
        <h1 className="font-title text-2xl">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{intro}</p>
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="mt-5 text-center text-sm text-ink-soft">{footer}</div>}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-sheet border border-rust/25 bg-rust-light px-3 py-2 text-[13px] leading-snug text-rust"
    >
      {message}
    </div>
  );
}
