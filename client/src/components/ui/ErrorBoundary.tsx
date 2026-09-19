import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, a render error anywhere unmounts the whole tree and the user
 * is left staring at a white page with no way back.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Swap for a reporting service when one is wired up.
    if (import.meta.env.DEV) {
      console.error('Render error:', error, info.componentStack);
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-title text-3xl">Something broke on this page</h1>
        <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
          The rest of the library is fine. Reloading usually clears it, and nothing you did is
          saved incorrectly.
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-5 max-w-lg overflow-x-auto rounded-sheet border border-rust/25 bg-rust-light p-3 text-left text-[12px] text-rust">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
          <Button variant="secondary" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
}
