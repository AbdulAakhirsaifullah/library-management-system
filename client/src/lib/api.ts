const TOKEN_KEY = 'bindery.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  code: string;
  status: number;
  /** Field-level messages, keyed by form field name. */
  fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown };

/** Same-origin in production; the Vite dev server proxies /api in development. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = tokenStore.get();

  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    const details = error?.details;
    const fields =
      details && typeof details === 'object' && !Array.isArray(details)
        ? (details as Record<string, string>)
        : {};

    if (response.status === 401) tokenStore.clear();

    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong. Try again.',
      fields,
    );
  }

  return payload as T;
}

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
};
