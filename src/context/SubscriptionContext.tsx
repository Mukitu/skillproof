import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  BDAPPS_CONSTANTS,
  bdappsHumanError,
  checkSubscription,
  isEntitledStatus,
  normalizeBdappsSubscriberId,
  sendOtp,
  unsubscribe as bdappsUnsubscribe,
  verifyOtp,
  type BdappsStatus,
} from '../services/bdapps';
import { supabase } from '../lib/supabase';


export interface SubscriptionSession {
  phone: string;           
  subscriberId: string;    
  status: BdappsStatus | '';
  verifiedAt: string;      
}

interface PendingOtp {
  referenceNo: string;
  phone: string;
  subscriberId: string;
  expiresAt: number;       
}

interface SubscriptionContextValue {
  session: SubscriptionSession | null;

  isSubscribed: boolean;
  isPremiumActive: boolean;
  premiumUntil: string | null;
  isLoading: boolean;
  isHydrating: boolean;
  error: string | null;


  refresh: () => Promise<void>;


  verifyStatus: (phone: string) => Promise<
    | { ok: true; subscribed: true }
    | { ok: true; subscribed: false }
    | { ok: false; error: string }
  >;


  confirmOtp: (
    otp: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;

  pendingOtp: PendingOtp | null;
  otpCooldownSeconds: number;
  resendOtp: () => Promise<{ ok: true } | { ok: false; error: string }>;
  clearOtp: () => void;
  clearSubscription: () => void;


  unsubscribe: () => Promise<{ ok: true } | { ok: false; error: string }>;
}


export function isAdminPremiumActive(
  premiumUntil: string | null | undefined,
): { active: boolean; until: Date | null; msLeft: number } {
  if (!premiumUntil) return { active: false, until: null, msLeft: 0 };
  const until = new Date(premiumUntil);
  if (!Number.isFinite(until.getTime())) return { active: false, until: null, msLeft: 0 };
  const msLeft = until.getTime() - Date.now();
  return { active: msLeft > 0, until, msLeft };
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

const OTP_VALIDITY_MS = 24 * 60 * 60 * 1000;
const OTP_RESEND_COOLDOWN_S = 0;               









const SUBSCRIPTION_REVALIDATE_MS = 8 * 1000;     



const SUBSCRIPTION_CACHE_MAX_MS = 12 * 60 * 60 * 1000; 

function storageKey(userId: string): string {
  return `skillproof:bdapps:subscription:${userId}`;
}

function safeReadSession(userId: string | null): SubscriptionSession | null {
  if (!userId) return null;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SubscriptionSession;
    if (!parsed.phone || !parsed.subscriberId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function safeWriteSession(userId: string | null, value: SubscriptionSession | null): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(storageKey(userId));
    } else {
      window.localStorage.setItem(storageKey(userId), JSON.stringify(value));
    }
  } catch {
    
  }
}

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const userId = user?.user_id ?? null;

  const [session, setSession] = useState<SubscriptionSession | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOtp, setPendingOtp] = useState<PendingOtp | null>(null);
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState<number>(0);

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

  
  const lastInvalidationRef = useRef<{
    at: string;
    reason: string;
    fromStatus: string | null;
  } | null>(null);

  const broadcastInvalidation = useCallback(
    (reason: string, fromStatus: string | null) => {
      lastInvalidationRef.current = {
        at: new Date().toISOString(),
        reason,
        fromStatus,
      };
      
      
      try {
        const ch = new BroadcastChannel('skillproof:bdapps:subscription');
        ch.postMessage({
          type: 'subscription-invalidated',
          userId,
          reason,
          fromStatus,
          at: lastInvalidationRef.current.at,
        });
        ch.close();
      } catch {
        
      }
      
      
      
      try {
        if (typeof window !== 'undefined' && userId) {
          window.localStorage.setItem(
            `skillproof:bdapps:invalidate:${userId}`,
            JSON.stringify({ reason, fromStatus, at: lastInvalidationRef.current.at }),
          );
        }
      } catch {
        
      }
    },
    [userId],
  );

  
  
  
  useEffect(() => {
    if (!userId) return;
    let bc: BroadcastChannel | null = null;
    const onBc = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        userId?: string | null;
        reason?: string;
      } | null;
      if (!data || data.type !== 'subscription-invalidated') return;
      if (data.userId && data.userId !== userId) return;
      
      setSession(null);
      setError(
        data.reason
          ? `Your subscription has ended (${data.reason}). Please sign in again.`
          : 'Your subscription has ended. Please sign in again.',
      );
    };
    try {
      bc = new BroadcastChannel('skillproof:bdapps:subscription');
      bc.addEventListener('message', onBc);
    } catch {
      
    }
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      if (e.key !== `skillproof:bdapps:invalidate:${userId}`) return;
      try {
        const parsed = JSON.parse(e.newValue) as { reason?: string };
        setSession(null);
        setError(
          parsed.reason
            ? `Your subscription has ended (${parsed.reason}). Please sign in again.`
            : 'Your subscription has ended. Please sign in again.',
        );
      } catch {
        
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      if (bc) {
        bc.removeEventListener('message', onBc);
        bc.close();
      }
      window.removeEventListener('storage', onStorage);
    };
  }, [userId]);

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`skillproof:user-subscription:${userId}`, {
          config: {
            
            
            
            broadcast: { self: false, ack: false },
          },
        })
        .on('broadcast', { event: 'subscription-invalidated' }, (msg: any) => {
          const payload = (msg?.payload ?? {}) as {
            reason?: string;
            fromStatus?: string | null;
            byUserId?: string | null;
          };
          
          
          if (payload.byUserId && payload.byUserId !== userId) return;
          setSession(null);
          setPendingOtp(null);
          setError(
            payload.reason
              ? `Your subscription has ended (${payload.reason}). Please sign in again.`
              : 'Your subscription has ended. Please sign in again.',
          );
        })
        .subscribe();
    } catch {
      
    }
    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch {  }
      }
    };
  }, [userId]);

  
  
  
  
  
  
  useEffect(() => {
    if (!userId) return;
    if (!session) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        
        
        
        
        
        
        
        
        
        
        
        try {
          const { data: latestRows, error: latestErr } = await supabase
            .rpc('fn_get_bdapps_subscription', {
              p_subscriber_id: session.subscriberId,
            });
          if (
            !cancelled &&
            !latestErr &&
            Array.isArray(latestRows) &&
            latestRows.length > 0
          ) {
            const latestStatus = (latestRows[0] as { status?: string }).status;
            if (latestStatus && !isEntitledStatus(latestStatus)) {
              const fromStatus = session.status;
              setSession(null);
              setPendingOtp(null);
              setError(
                `Your subscription is no longer active (status: ${latestStatus}). Please sign in again.`,
              );
              broadcastInvalidation(latestStatus, fromStatus);
              
              
              try {
                await supabase
                  .channel(`skillproof:user-subscription:${userId}`)
                  .send({
                    type: 'broadcast',
                    event: 'subscription-invalidated',
                    payload: {
                      reason: latestStatus,
                      fromStatus,
                      byUserId: userId,
                      at: new Date().toISOString(),
                    },
                  });
              } catch {
                
              }
              return;
            }
          }
        } catch {
          
        }

        const resp = await checkSubscription(session.phone);
        if (cancelled) return;
        const stillEntitled = isEntitledStatus(resp.subscriptionStatus);
        if (!stillEntitled) {
          
          
          
          const fromStatus = session.status;
          setSession(null);
          setPendingOtp(null);
          setError(
            `Your subscription is no longer active (status: ${resp.subscriptionStatus || 'unknown'}). Please sign in again.`,
          );
          broadcastInvalidation(
            resp.subscriptionStatus || 'unknown',
            fromStatus,
          );
          
          try {
            await supabase
              .channel(`skillproof:user-subscription:${userId}`)
              .send({
                type: 'broadcast',
                event: 'subscription-invalidated',
                payload: {
                  reason: resp.subscriptionStatus || 'unknown',
                  fromStatus,
                  byUserId: userId,
                  at: new Date().toISOString(),
                },
              });
          } catch {
            
          }
          return;
        }
        
        if (
          resp.subscriptionStatus &&
          resp.subscriptionStatus !== session.status
        ) {
          setSession({
            phone: session.phone,
            subscriberId: resp.subscriberId || session.subscriberId,
            status: resp.subscriptionStatus,
            verifiedAt: new Date().toISOString(),
          });
        }
      } catch {
        
        
        
        
        
        
        
        
        
        
        const verifiedAt = Date.parse(session.verifiedAt);
        if (Number.isFinite(verifiedAt)) {
          const ageMs = Date.now() - verifiedAt;
          if (ageMs >= SUBSCRIPTION_CACHE_MAX_MS) {
            const fromStatus = session.status;
            setSession(null);
            setPendingOtp(null);
            setError(
              'Your cached subscription is too old to trust. Please sign in again to refresh.',
            );
            broadcastInvalidation('cache-expired', fromStatus);
          }
        }
      }
    };

    const id = window.setInterval(tick, SUBSCRIPTION_REVALIDATE_MS);
    
    
    
    
    
    
    
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void tick();
      }
    };
    const onFocus = () => {
      void tick();
    };
    const onOnline = () => {
      void tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [userId, session, broadcastInvalidation]);

  
  
  
  
  
  useEffect(() => {
    if (!userId || !session?.subscriberId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`bdapps-subs:${userId}:${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'bdapps_subscriptions',
            filter: `subscriber_id=eq.${session.subscriberId}`,
          },
          (payload: any) => {
            const status = payload?.new?.status || payload?.old?.status;
            if (!status) return;
            if (isEntitledStatus(status)) {
              setSession({
                phone: session.phone,
                subscriberId: session.subscriberId,
                status,
                verifiedAt: new Date().toISOString(),
              });
            } else {
              const fromStatus = session.status;
              setSession(null);
              setPendingOtp(null);
              setError(
                `Your subscription is no longer active (status: ${status}). Please sign in again.`,
              );
              broadcastInvalidation(status, fromStatus);
            }
          },
        )
        .subscribe();
    } catch {
      
    }
    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch {  }
      }
    };
  }, [userId, session?.subscriberId, session?.phone, broadcastInvalidation]);

  const requestOtpForPhone = useCallback(async (
    phone: string,
    subscriberId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const otpResp = await sendOtp(phone);
      if (!otpResp.success || !otpResp.referenceNo) {
        return {
          ok: false,
          error: bdappsHumanError(
            otpResp.statusDetail,
            otpResp.statusCode,
            'Could not send the OTP. Please retry in a moment.',
          ),
        };
      }
      setPendingOtp({
        referenceNo: otpResp.referenceNo,
        phone,
        subscriberId,
        expiresAt: Date.now() + OTP_VALIDITY_MS,
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'Could not send the OTP.' };
    }
  }, []);

  
  useEffect(() => {
    setIsHydrating(true);
    setSession(safeReadSession(userId));
    setPendingOtp(null);
    setError(null);
    setOtpCooldownSeconds(0);
    setIsHydrating(false);
  }, [userId]);

  
  useEffect(() => {
    if (otpCooldownSeconds <= 0) return;
    const id = window.setInterval(() => {
      setOtpCooldownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [otpCooldownSeconds]);

  
  useEffect(() => {
    if (!pendingOtp) return;
    const remaining = Math.max(0, pendingOtp.expiresAt - Date.now());
    if (remaining === 0) {
      setPendingOtp(null);
    } else {
      const id = window.setTimeout(() => setPendingOtp(null), remaining);
      return () => window.clearTimeout(id);
    }
    return;
  }, [pendingOtp]);

  const persist = useCallback(
    (next: SubscriptionSession | null) => {
      setSession(next);
      safeWriteSession(userId, next);
    },
    [userId],
  );

  const clearSubscription = useCallback(() => {
    persist(null);
    setPendingOtp(null);
    setError(null);
  }, [persist]);

  const unsubscribe = useCallback(async (): Promise<
    { ok: true } | { ok: false; error: string }
  > => {
    if (!session) {
      return { ok: false, error: 'No active subscription to cancel.' };
    }
    setIsLoading(true);
    setError(null);
    try {
      const resp = await bdappsUnsubscribe(session.phone);
      const code = (resp.statusCode || '').toUpperCase();
      const ok = resp.success || code === 'S1000';
      if (!ok) {
        setIsLoading(false);
        return {
          ok: false,
          error: bdappsHumanError(
            resp.statusDetail,
            resp.statusCode,
            'Could not cancel your subscription. Please try again.',
          ),
        };
      }
      const fromStatus = session.status;
      persist(null);
      setPendingOtp(null);
      
      broadcastInvalidation(
        resp.subscriptionStatus || 'UNREGISTERED',
        fromStatus,
      );
      
      
      
      
      
      try {
        await supabase.channel(`skillproof:user-subscription:${userId}`).send({
          type: 'broadcast',
          event: 'subscription-invalidated',
          payload: {
            reason: resp.subscriptionStatus || 'UNREGISTERED',
            fromStatus,
            byUserId: userId,
            at: new Date().toISOString(),
          },
        });
      } catch {
        
      }
      setIsLoading(false);
      return { ok: true };
    } catch (e: any) {
      setIsLoading(false);
      return {
        ok: false,
        error: e?.message ?? 'Could not cancel your subscription.',
      };
    }
  }, [persist, session, broadcastInvalidation]);

  const refresh = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await checkSubscription(session.phone);
      const next: SubscriptionSession = {
        phone: session.phone,
        subscriberId: resp.subscriberId || session.subscriberId,
        status: resp.subscriptionStatus || session.status,
        verifiedAt: new Date().toISOString(),
      };
      persist(next);
    } catch (e: any) {
      setError(e?.message ?? 'Could not verify subscription.');
    } finally {
      setIsLoading(false);
    }
  }, [persist, session]);

  const verifyStatus = useCallback<SubscriptionContextValue['verifyStatus']>(
    async (phone) => {
      setIsLoading(true);
      setError(null);
      try {
        const subscriberId = normalizeBdappsSubscriberId(phone);
        if (!subscriberId) {
          setIsLoading(false);
          return { ok: false, error: 'Please enter a valid Bangladeshi mobile number.' };
        }

        
        const check = await checkSubscription(phone);
        if (isEntitledStatus(check.subscriptionStatus)) {
          persist({
            phone,
            subscriberId: check.subscriberId || subscriberId,
            status: check.subscriptionStatus,
            verifiedAt: new Date().toISOString(),
          });
          setPendingOtp(null);
          setIsLoading(false);
          return { ok: true, subscribed: true };
        }

        
        const otp = await requestOtpForPhone(phone, subscriberId);
        if (otp.ok === false) {
          setIsLoading(false);
          return { ok: false, error: otp.error };
        }
        setOtpCooldownSeconds(OTP_RESEND_COOLDOWN_S);
        setIsLoading(false);
        return { ok: true, subscribed: false };
      } catch (e: any) {
        setIsLoading(false);
        setError(e?.message ?? 'Subscription check failed.');
        return { ok: false, error: e?.message ?? 'Subscription check failed.' };
      }
    },
    [persist, requestOtpForPhone],
  );

  const confirmOtp = useCallback<SubscriptionContextValue['confirmOtp']>(
    async (otp) => {
      if (!pendingOtp) {
        return { ok: false, error: 'No OTP was requested. Please go back and try again.' };
      }
      setIsLoading(true);
      setError(null);
      try {
        const verify = await verifyOtp(pendingOtp.referenceNo, otp);
        if ((verify.statusCode || '').toUpperCase() !== 'S1000') {
          setIsLoading(false);
          return {
            ok: false,
            error: bdappsHumanError(
              verify.statusDetail,
              verify.statusCode,
              'Invalid OTP. Please try again.',
            ),
          };
        }

        
        
        
        const check = await checkSubscription(pendingOtp.phone);
        if (!isEntitledStatus(check.subscriptionStatus)) {
          setIsLoading(false);
          return {
            ok: false,
            error:
              'OTP verified, but your subscription is not yet active. ' +
              'Please confirm the subscription pop-up on your phone and try again.',
          };
        }
        persist({
          phone: pendingOtp.phone,
          subscriberId: check.subscriberId || pendingOtp.subscriberId,
          status: check.subscriptionStatus,
          verifiedAt: new Date().toISOString(),
        });
        setPendingOtp(null);
        setIsLoading(false);
        return { ok: true };
      } catch (e: any) {
        setIsLoading(false);
        setError(e?.message ?? 'OTP verification failed.');
        return { ok: false, error: e?.message ?? 'OTP verification failed.' };
      }
    },
    [pendingOtp, persist],
  );

  const resendOtp = useCallback<SubscriptionContextValue['resendOtp']>(async () => {
    if (!pendingOtp) {
      return { ok: false, error: 'No OTP request in progress.' };
    }
    if (otpCooldownSeconds > 0) {
      return {
        ok: false,
        error: `Please wait ${otpCooldownSeconds}s before requesting a new OTP.`,
      };
    }
    setIsLoading(true);
    setError(null);
    const result = await requestOtpForPhone(pendingOtp.phone, pendingOtp.subscriberId);
    setIsLoading(false);
    if (result.ok) {
      setOtpCooldownSeconds(OTP_RESEND_COOLDOWN_S);
    }
    return result;
  }, [otpCooldownSeconds, pendingOtp, requestOtpForPhone]);

  const clearOtp = useCallback(() => {
    setPendingOtp(null);
    setError(null);
  }, []);

  const premiumState = isAdminPremiumActive(user?.premium_until);
  const isPremiumActive = premiumState.active;
  const premiumUntil = premiumState.until ? premiumState.until.toISOString() : null;

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      session,
      isSubscribed: session ? isEntitledStatus(session.status) : false,
      isPremiumActive,
      premiumUntil,
      isLoading,
      isHydrating,
      error,
      refresh,
      verifyStatus,
      confirmOtp,
      pendingOtp,
      otpCooldownSeconds,
      resendOtp,
      clearOtp,
      clearSubscription,
      unsubscribe,
    }),
    [
      session,
      isPremiumActive,
      premiumUntil,
      isLoading,
      isHydrating,
      error,
      refresh,
      verifyStatus,
      confirmOtp,
      pendingOtp,
      otpCooldownSeconds,
      resendOtp,
      clearOtp,
      clearSubscription,
      unsubscribe,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
};

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
}

export const SUBSCRIPTION_PUBLIC_CONSTANTS = BDAPPS_CONSTANTS;