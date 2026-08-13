

export type BdappsStatus =
  | 'REGISTERED'
  | 'INITIAL CHARGING PENDING'
  | (string & {});

export interface CheckSubscriptionResponse {
  subscriptionStatus: BdappsStatus | '';
  isSubscribed: boolean;
  statusCode?: string;
  statusDetail?: string;
  subscriberId?: string;
  version?: string;
}

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

const BDAPPS_BASE_URL = 'https://verify.skillproof.top';

const SUBSCRIBED_STATUSES: ReadonlySet<string> = new Set([
  'REGISTERED',
  'INITIAL CHARGING PENDING',
]);


export function isEntitledStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return SUBSCRIBED_STATUSES.has(status.toUpperCase());
}


export function normalizeBdappsSubscriberId(raw: string): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (s.toLowerCase().startsWith('tel:')) s = s.slice(4);
  if (s.startsWith('+')) s = s.slice(1);
  const digits = s.replace(/\D+/g, '');
  if (!digits) return null;

  if (digits.startsWith('880') && digits.length === 13) {
    return 'tel:880' + digits.slice(3);
  }
  if (digits.startsWith('88') && digits.length === 12) {
    return 'tel:880' + digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return 'tel:880' + digits.slice(1);
  }
  return null;
}


function toLocalDigits(subscriberId: string): string {
  if (subscriberId.startsWith('tel:')) {
    return '0' + subscriberId.slice(7);
  }
  const digits = subscriberId.replace(/\D+/g, '');
  if (digits.startsWith('880') && digits.length === 13) return '0' + digits.slice(3);
  if (digits.startsWith('88') && digits.length === 12) return '0' + digits.slice(2);
  return digits;
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BDAPPS_BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e: any) {

    throw new Error(
      'Subscription verification service is temporarily unavailable. Please try again.',
    );
  }
  let data: unknown = null;
  let rawText = '';
  try {
    rawText = await res.text();
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {

        data = null;
      }
    }
  } catch {

  }


  if (res.status >= 500) {
    throw new Error(
      'Subscription verification service is temporarily unavailable. Please try again.',
    );
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

export async function checkSubscription(userMobile: string): Promise<CheckSubscriptionResponse> {
  return postJson<CheckSubscriptionResponse>('/check_subscription.php', {
    user_mobile: userMobile,
  });
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

export interface UnsubscribeResponse {
  success: boolean;
  subscriberId?: string;
  action?: number;
  version?: string;
  statusCode?: string;
  statusDetail?: string;
  subscriptionStatus?: string;
}

export async function unsubscribe(userMobile: string): Promise<UnsubscribeResponse> {
  return postJson<UnsubscribeResponse>('/unsubscribe.php', {
    user_mobile: userMobile,
  });
}


export function isSupportedOperatorSubscriber(subscriberId: string): boolean {
  const local = toLocalDigits(subscriberId);
  return SUPPORTED_OPERATOR_PREFIXES.some((p) => local.startsWith(p));
}

export const SUPPORTED_OPERATOR_PREFIXES = ['018', '016'] as const;

export const BDAPPS_CONSTANTS = {
  SUBSCRIPTION_CHARGE_BDT: 2.78,
  CHARGE_LABEL: '2.78 BDT/day (including VAT + SD + SC)',
  SUPPORTED_OPERATORS: ['Robi', 'Airtel'],
  SUPPORTED_OPERATORS_LABEL: 'Robi & Airtel Only',
  MOBILE_PLACEHOLDER: 'Enter your Robi or Airtel number',
} as const;


export function bdappsHumanError(
  statusDetail: string | undefined,
  statusCode: string | undefined,
  fallback: string,
): string {
  if (statusDetail && statusDetail.trim() !== '') return statusDetail;
  if (statusCode && statusCode.trim() !== '') {
    return `${fallback} (BDApps ${statusCode}).`;
  }
  return fallback;
}