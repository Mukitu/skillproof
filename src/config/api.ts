




// Primary API — single backend for both PHP legacy and the new v2 wrapper.
// All admin actions, AI center (v1 + v2 wrapper), AI intelligence, mentor,
// interview, etc. live under the same backend at /skillproof-api/api/...
export const API_BASE_URL = (() => {

  const rawEnv = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  const env = (rawEnv ?? '').trim();
  if (env && env !== '""' && !env.includes('your-project')) return env;




  if ((import.meta as any)?.env?.MODE === 'production') {
    return 'https://skillproof.top/skillproof-api';
  }




  return '';
})();




export const PUBLIC_BASE_URL =
  ((import.meta as any)?.env?.VITE_PUBLIC_URL as string | undefined)?.trim() ||
  'https://skillproof.top';


export function apiUrl(path: string): string {
  const trimmedBase = (API_BASE_URL || '').replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;

  if (!trimmedBase && typeof window !== 'undefined' && /^https?:$/.test(window.location?.protocol ?? '')) {
    const host = window.location.host;


    if (host === 'skillproof.top' || host === 'www.skillproof.top') {
      return `https://skillproof.top/skillproof-api${suffix}`;
    }
  }

  if (!trimmedBase) return suffix;




  const baseHasApi = /\/api$/.test(trimmedBase);
  const pathHasApi = /^\/api(\/|$)/.test(suffix);
  let cleanBase = trimmedBase;
  let cleanPath = suffix;
  if (baseHasApi && pathHasApi) {
    cleanPath = suffix.replace(/^\/api(\/|$)/, '$1').replace(/^\//, '/');
  }
  return `${cleanBase}${cleanPath}`;
}


export class ApiHtmlResponseError extends Error {
  status: number;
  url: string;
  contentType: string;
  preview: string;
  constructor(opts: {
    url: string;
    status: number;
    contentType: string;
    preview: string;
  }) {
    super(
      `Backend API URL misconfigured. Request to ${opts.url} returned ${opts.contentType || 'non-JSON'} (status ${opts.status}) instead of JSON. Expected ${API_BASE_URL}/...`
    );
    this.name = 'ApiHtmlResponseError';
    this.status = opts.status;
    this.url = opts.url;
    this.contentType = opts.contentType;
    this.preview = opts.preview;
  }
}


export class ApiNetworkError extends Error {
  cause?: unknown;
  url: string;
  constructor(opts: { url: string; cause?: unknown }) {
    const detail =
      opts.cause instanceof Error
        ? opts.cause.message
        : typeof opts.cause === 'string'
          ? opts.cause
          : 'unknown';
    super(`Network error reaching ${opts.url}: ${detail}`);
    this.name = 'ApiNetworkError';
    this.cause = opts.cause;
    this.url = opts.url;
  }
}


export async function safeFetchJson<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = apiUrl(path);

  const headers = new Headers(init.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (
    !headers.has('Content-Type') &&
    init.body &&
    typeof init.body === 'string' &&
    init.body.length > 0
  ) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: init.credentials ?? 'include' });
  } catch (err) {
    throw new ApiNetworkError({ url, cause: err });
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let text = '';
  try {
    text = await res.text();
  } catch {
    text = '';
  }




  const trimmed = text.trimStart();
  if (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML') ||
    (!contentType.includes('application/json') && text.length > 0 && trimmed.startsWith('<'))
  ) {
    throw new ApiHtmlResponseError({
      url,
      status: res.status,
      contentType,
      preview: text.slice(0, 160),
    });
  }




  if (!text) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} (empty body) from ${url}`);
    }
    return undefined as T;
  }




  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from ${url} (status ${res.status}, content-type ${contentType || 'unknown'}): ${(err as Error).message}. First 160 chars: ${text.slice(0, 160)}`
    );
  }
}


export function authHeaders(accessToken: string, extra?: HeadersInit): RequestInit {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(extra as Record<string, string> | undefined),
    },
  };
}
