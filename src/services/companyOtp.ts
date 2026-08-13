
const BDAPPS_BASE_URL = 'https://verify.skillproof.top';

export interface SendOtpResponse {
  success: boolean;
  referenceNo: string | null;
  statusCode?: string;
  statusDetail?: string;
}

export interface VerifyOtpResponse {
  statusCode: string;
  statusDetail?: string;
  subscriptionStatus?: string;
  subscriberId?: string;
  version?: string;
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BDAPPS_BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {

    throw new Error('OTP service is temporarily unavailable. Please try again.');
  }
  let data: unknown = null;
  try {
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }
  } catch {

  }
  if (res.status >= 500) {
    throw new Error('OTP service is temporarily unavailable. Please try again.');
  }
  if (!res.ok) {
    const errMsg =
      data && typeof data === 'object' && 'error' in (data as any)
        ? String((data as any).error)
        : (data &&
            typeof data === 'object' &&
            'statusDetail' in (data as any) &&
            typeof (data as any).statusDetail === 'string' &&
            (data as any).statusDetail) ||
          (data &&
            typeof data === 'object' &&
            'message' in (data as any) &&
            typeof (data as any).message === 'string' &&
            (data as any).message) ||
          `Request failed (${res.status}).`;
    throw new Error(errMsg as string);
  }
  return data as T;
}

export function normalizeBdappsSubscriber(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (s.startsWith('+')) s = s.slice(1);
  const digits = s.replace(/\D+/g, '');
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith('01')) return digits;
  if (digits.length === 13 && digits.startsWith('880')) return '0' + digits.slice(3);
  if (digits.length === 10 && digits.startsWith('1')) return '0' + digits;
  return null;
}

export async function sendOtp(userMobile: string): Promise<SendOtpResponse> {
  return postJson<SendOtpResponse>('/send_otp.php', { user_mobile: userMobile });
}

export async function verifyOtp(
  referenceNo: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  return postJson<VerifyOtpResponse>('/verify_otp.php', {
    Otp: otp,
    referenceNo,
  });
}