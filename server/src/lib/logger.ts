import { env } from '../env';

type Level = 'info' | 'warn' | 'error';

const stamp = () => new Date().toISOString();

/**
 * Small wrapper so the server has one place that writes to stdout.
 * Output stays plain text in development and switches to single-line JSON in
 * production, which is what Railway's log viewer parses.
 */
function emit(level: Level, message: string, meta?: unknown) {
  const stream = level === 'error' ? process.stderr : process.stdout;

  if (env.NODE_ENV === 'production') {
    stream.write(`${JSON.stringify({ time: stamp(), level, message, ...(meta ? { meta } : {}) })}\n`);
    return;
  }

  const detail = meta instanceof Error ? `\n${meta.stack ?? meta.message}` : meta ? ` ${JSON.stringify(meta)}` : '';
  stream.write(`[${level}] ${message}${detail}\n`);
}

export const logger = {
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
