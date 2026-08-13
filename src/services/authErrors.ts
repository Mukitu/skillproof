

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'over_email_send_rate_limit'
  | 'user_already_exists'
  | 'weak_password'
  | 'session_expired'
  | 'session_missing'
  | 'network_error'
  | 'timeout'
  | 'cors'
  | 'csp'
  | 'offline'
  | 'invalid_request'
  | 'configuration_missing'
  | 'configuration_invalid'
  | 'unsupported_url'
  | 'rate_limited'
  | 'too_many_requests'
  | 'account_locked'
  | 'account_suspended'
  | 'captcha_required'
  | 'account_type_mismatch'
  | 'unknown';

export interface NormalizedAuthError {
  code: AuthErrorCode;
  message: string;
  cause?: unknown;
  status?: number;
}

const NETWORK_MESSAGES = ['failed to fetch', 'networkerror', 'network error', 'load failed', 'fetch failed'];

function isNetworkMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return NETWORK_MESSAGES.some((m) => lower.includes(m));
}

function extractMessage(err: unknown): string {
  if (!err) return '';
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const maybe = err as { message?: unknown; msg?: unknown; error_description?: unknown };
    if (typeof maybe.message === 'string') return maybe.message;
    if (typeof maybe.msg === 'string') return maybe.msg;
    if (typeof maybe.error_description === 'string') return maybe.error_description;
  }
  return '';
}

function extractCode(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const obj = err as { code?: unknown; error_code?: unknown; status?: unknown; name?: unknown };
  if (typeof obj.code === 'string') return obj.code;
  if (typeof obj.error_code === 'string') return obj.error_code;
  if (typeof obj.name === 'string') return obj.name;
  return '';
}

function extractStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const obj = err as { status?: unknown };
  return typeof obj.status === 'number' ? obj.status : undefined;
}

function friendly(code: AuthErrorCode, fallback: string): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Incorrect email or password. Please try again.';
    case 'email_not_confirmed':
      return 'Please verify your email address before signing in. Check your inbox for the verification link.';
    case 'over_email_send_rate_limit':
      return 'Too many emails sent. Please wait a few minutes before requesting another.';
    case 'user_already_exists':
      return 'An account with this email already exists. Try signing in instead.';
    case 'weak_password':
      return 'Your password does not meet the security requirements.';
    case 'session_expired':
      return 'Your session has expired. Please sign in again to continue.';
    case 'session_missing':
      return 'You are signed out. Please sign in to continue.';
    case 'network_error':
      return 'Network error. Please check your internet connection and try again.';
    case 'timeout':
      return 'The request timed out. Please try again.';
    case 'cors':
      return 'The authentication service is unavailable from this origin.';
    case 'csp':
      return 'The browser refused the request because of a Content Security Policy. The Supabase origin must be allowed in the server CSP headers.';
    case 'offline':
      return 'You appear to be offline. Reconnect to the internet and try again.';
    case 'invalid_request':
      return 'The request was invalid. Please review your input and try again.';
    case 'configuration_missing':
      return 'Authentication is not configured. Contact the site administrator.';
    case 'configuration_invalid':
      return 'Authentication configuration is invalid. Contact the site administrator.';
    case 'unsupported_url':
      return 'Authentication is not available at this URL.';
    case 'rate_limited':
      return 'Too many requests. Please wait a moment and try again.';
    case 'too_many_requests':
      return 'অনেক বেশি চেষ্টা হয়েছে — কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন। (Too many sign-in attempts. Please wait a few minutes.)';
    case 'account_locked':
      return 'নিরাপত্তার কারণে আপনার account সাময়িকভাবে lock হয়েছে। কয়েক মিনিট অপেক্ষা করে আবার চেষ্টা করুন, অথবা "Forgot password" ব্যবহার করে password reset করুন।';
    case 'account_suspended':
      return 'আপনার account admin কর্তৃক suspend করা হয়েছে। সহায়তার জন্য support@skillproof.top-এ যোগাযোগ করুন।';
    case 'captcha_required':
      return 'Bot সন্দেহ হওয়ায় captcha verification দরকার। পেজ reload করে আবার চেষ্টা করুন।';
    case 'unknown':
    default:
      return fallback;
  }
}

export function normalizeAuthError(err: unknown, fallback = 'Something went wrong. Please try again.'): NormalizedAuthError {
  const message = extractMessage(err);
  const code = extractCode(err);
  const status = extractStatus(err);
  const lower = (message + ' ' + code).toLowerCase();

  
  if (lower.includes('authentication is not configured')
    || lower.includes('environment variable')) {
    return { code: 'configuration_missing', message: friendly('configuration_missing', fallback), cause: err };
  }
  if (lower.includes('configuration is invalid')) {
    return { code: 'configuration_invalid', message: friendly('configuration_invalid', fallback), cause: err };
  }

  
  if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
    return { code: 'offline', message: friendly('offline', fallback), cause: err };
  }

  
  
  
  
  if (isNetworkMessage(lower)) {
    return { code: 'network_error', message: friendly('network_error', fallback), cause: err, status };
  }

  if (lower.includes('timeout') || lower.includes('aborted')) {
    return { code: 'timeout', message: friendly('timeout', fallback), cause: err, status };
  }

  
  if (lower.includes('cors') || lower.includes('access-control-allow-origin')) {
    return { code: 'cors', message: friendly('cors', fallback), cause: err, status };
  }

  
  
  
  
  if (
    lower.includes('content security policy') ||
    lower.includes('refused to connect') ||
    lower.includes('violates the document')
  ) {
    return { code: 'csp', message: friendly('csp', fallback), cause: err, status };
  }

  
  if (code === 'invalid_credentials' || status === 400 && lower.includes('credentials')) {
    return { code: 'invalid_credentials', message: friendly('invalid_credentials', fallback), cause: err, status };
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return { code: 'email_not_confirmed', message: friendly('email_not_confirmed', fallback), cause: err, status };
  }
  if (code === 'over_email_send_rate_limit' || lower.includes('email rate limit') || lower.includes('rate limit')) {
    return { code: 'over_email_send_rate_limit', message: friendly('over_email_send_rate_limit', fallback), cause: err, status };
  }
  if (code === 'user_already_exists' || lower.includes('already registered') || lower.includes('already exists')) {
    return { code: 'user_already_exists', message: friendly('user_already_exists', fallback), cause: err, status };
  }
  if (code === 'weak_password' || lower.includes('weak password') || lower.includes('password should be')) {
    return { code: 'weak_password', message: friendly('weak_password', fallback), cause: err, status };
  }
  if (code === 'session_expired' || status === 401) {
    return { code: 'session_expired', message: friendly('session_expired', fallback), cause: err, status };
  }
  if (lower.includes('session missing') || code === 'authsessionmissinger') {
    return { code: 'session_missing', message: friendly('session_missing', fallback), cause: err, status };
  }
  // Handle rate-limit / locked-account / captcha BEFORE the generic 429 fallback,
  // so the user sees the actual reason instead of "incorrect credentials".
  if (status === 429 || lower.includes('too many requests') || lower.includes('too many')) {
    return { code: 'too_many_requests', message: friendly('too_many_requests', fallback), cause: err, status };
  }
  if (
    status === 423 ||
    lower.includes('locked') ||
    lower.includes('temporarily disabled') ||
    code === 'user_banned' ||
    code === 'authaccountlocked'
  ) {
    return { code: 'account_locked', message: friendly('account_locked', fallback), cause: err, status };
  }
  if (lower.includes('captcha') || code === 'captcha_required') {
    return { code: 'captcha_required', message: friendly('captcha_required', fallback), cause: err, status };
  }
  if (
    lower.includes('suspended') ||
    lower.includes('has been suspended') ||
    code === 'account_suspended'
  ) {
    return { code: 'account_suspended', message: message || friendly('account_suspended', fallback), cause: err, status };
  }
  if (status === 429) {
    return { code: 'rate_limited', message: friendly('rate_limited', fallback), cause: err, status };
  }
  if (status && status >= 500) {
    return { code: 'network_error', message: friendly('network_error', fallback), cause: err, status };
  }
  if (lower.includes('invalid') && (lower.includes('request') || lower.includes('input'))) {
    return { code: 'invalid_request', message: friendly('invalid_request', fallback), cause: err, status };
  }

  return { code: 'unknown', message: message || fallback, cause: err, status };
}

export function authErrorToString(err: unknown, fallback?: string): string {
  return normalizeAuthError(err, fallback).message;
}