import React, { useState } from 'react';
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanySubscription } from '../../context/CompanySubscriptionContext';
import { fetchCompanyBdappsRequired } from '../../services/companies';

// Company Dashboard section — lets an approved company inspect and
// manage its own BDApps subscription status. Behaviour:
//   * If the admin master toggle is OFF, this section shows a friendly
//     "BDApps is currently bypassed" notice and hides all controls.
//   * If the master toggle is ON:
//       - already-subscribed → shows status + an Unsubscribe button.
//       - not subscribed     → shows a status banner pointing the
//         company to the Subscription flow.
// The unsubscribe action routes through the existing
// `useCompanySubscription().unsubscribe()` so the BDApps operator call,
// the localStorage cleanup, and the realtime broadcast all stay in
// one place.

export const CompanyBdappsManagement: React.FC = () => {
  const { language } = useLanguage();
  const sub = useCompanySubscription();
  const [masterRequired, setMasterRequired] = useState<boolean | null>(null);
  const [confirmUnsub, setConfirmUnsub] = useState(false);
  const [working, setWorking] = useState(false);
  const [unsubError, setUnsubError] = useState<string | null>(null);
  const [unsubSuccess, setUnsubSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await fetchCompanyBdappsRequired();
        if (!cancelled) setMasterRequired(v);
      } catch {
        if (!cancelled) setMasterRequired(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onUnsubscribe = async () => {
    setWorking(true);
    setUnsubError(null);
    setUnsubSuccess(null);
    try {
      const r = await sub.unsubscribe();
      if (r.ok) {
        setUnsubSuccess(language === 'bn'
          ? 'BDApps সাবস্ক্রিপশন সফলভাবে বাতিল হয়েছে।'
          : 'Your BDApps subscription has been cancelled.');
        setConfirmUnsub(false);
      } else {
        setUnsubError((r as { ok: false; error: string }).error);
      }
    } catch (e: any) {
      setUnsubError(e?.message ?? 'Unsubscribe failed');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-brand-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-50 via-white to-amber-50/40 border-b border-slate-200 flex items-center gap-2">
        <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
            {language === 'bn' ? 'BDApps সাবস্ক্রিপশন' : 'BDApps Subscription'}
          </p>
          <p className="text-[10px] text-slate-500 leading-snug">
            {language === 'bn'
              ? 'আপনার BDApps সাবস্ক্রিপশন স্ট্যাটাস দেখুন এবং পরিচালনা করুন।'
              : 'View and manage your BDApps subscription.'}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {masterRequired === null ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
          </div>
        ) : !masterRequired ? (
          // Master toggle OFF — BDApps bypassed
          <div className="rounded-2xl border bg-slate-50 border-slate-200 p-4 flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-300 text-slate-600 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 leading-snug">
                {language === 'bn'
                  ? 'BDApps সম্পূর্ণ বাইপাস'
                  : 'BDApps is currently bypassed'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                {language === 'bn'
                  ? 'অ্যাডমিন মাস্টার টগল বন্ধ আছে — কোম্পানির জন্য BDApps সাবস্ক্রিপশন বাধ্যতামূলক নয়।'
                  : 'The admin master toggle is OFF — BDApps subscription is not required for this company.'}
              </p>
            </div>
          </div>
        ) : sub.isSubscribed ? (
          // Master ON + subscribed
          <>
            <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 p-4 flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-emerald-900 leading-snug">
                  {language === 'bn' ? 'BDApps সাবস্ক্রিপশন সক্রিয়' : 'BDApps subscription active'}
                </p>
                <p className="text-[10px] text-emerald-700 mt-1 leading-snug">
                  {language === 'bn'
                    ? 'আপনার BDApps সাবস্ক্রিপশন বর্তমানে সক্রিয় আছে।'
                    : 'Your BDApps subscription is currently active.'}
                </p>
              </div>
            </div>

            {unsubSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                {unsubSuccess}
              </div>
            )}
            {unsubError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{unsubError}</span>
              </div>
            )}

            {!confirmUnsub ? (
              <button
                type="button"
                onClick={() => setConfirmUnsub(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-white text-rose-700 text-xs font-bold hover:bg-rose-50 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {language === 'bn' ? 'সাবস্ক্রিপশন বাতিল করুন' : 'Unsubscribe'}
              </button>
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                <p className="text-xs font-bold text-rose-900 leading-snug flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {language === 'bn'
                    ? 'আপনি কি নিশ্চিত যে সাবস্ক্রিপশন বাতিল করতে চান?'
                    : 'Are you sure you want to cancel your subscription?'}
                </p>
                <p className="text-[10px] text-rose-700 leading-snug">
                  {language === 'bn'
                    ? 'অ্যাডমিন মাস্টার টগল চালু থাকলে পরবর্তী ড্যাশবোর্ড প্রবেশের সময় আবার সাবস্ক্রিপশন প্রয়োজন হবে।'
                    : 'If the admin master toggle remains ON, you will be required to subscribe again on next dashboard entry.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onUnsubscribe}
                    disabled={working}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                  >
                    {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    {language === 'bn' ? 'হ্যাঁ, বাতিল করুন' : 'Yes, cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmUnsub(false); setUnsubError(null); }}
                    disabled={working}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {language === 'bn' ? 'না, রাখুন' : 'No, keep it'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          // Master ON + not subscribed
          <>
            <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-4 flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-900 leading-snug">
                  {language === 'bn' ? 'BDApps সাবস্ক্রিপশন প্রয়োজন' : 'BDApps subscription required'}
                </p>
                <p className="text-[10px] text-amber-700 mt-1 leading-snug">
                  {language === 'bn'
                    ? 'আপনার কোম্পানি এখনও BDApps-এ সাবস্ক্রাইব করেনি। সাবস্ক্রিপশন পেজে গিয়ে মোবাইল নম্বর যাচাই ও সাবস্ক্রিপশন সম্পন্ন করুন।'
                    : 'Your company has not subscribed to BDApps yet. Go to the subscription page to verify your mobile and complete the subscription.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { window.location.href = '/company/subscription'; }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {language === 'bn' ? 'সাবস্ক্রিপশন পেজে যান' : 'Go to subscription page'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyBdappsManagement;
