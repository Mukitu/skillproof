
import { useEffect, useMemo, useState } from 'react';
import { Award, Calendar, CheckCircle2, Clock, Download, ExternalLink, FileDown, Hash, Image as ImageIcon, Link as LinkIcon, ShieldCheck, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { downloadCertificatePng, downloadCertificatePdf } from '../../services/certificateDownload';
import { getPublicPassportUrl } from '../../utils/passportUrl';
import type { CourseCertificate, PublicCertificateBundle } from '../../types/database';

interface Props {
  certificate: CourseCertificate;

  /**
   * Optional override: the candidate's primary Passport number. When
   * provided, the QR code encodes
   * `https://skillproof.top/verify?id=<passport_number>` so any scan
   * lands on the candidate's full verified CV (the /verify portal
   * returns every Passport + course certificate they hold). When the
   * candidate has no Passport, the QR is hidden — the Download buttons
   * on the card still work but scanning the QR no longer routes to a
   * deleted URL.
   */
  ownerPassportNumber?: string | null;
  key?: string;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return '—'; }
}

function initials(name: string | null | undefined): string {
  return (name ?? 'SP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Revoked: 'bg-rose-100 text-rose-700',
  Superseded: 'bg-slate-200 text-slate-700',
};

export function CertificateCard({ certificate, ownerPassportNumber }: Props) {
  const [downloadBusy, setDownloadBusy] = useState<'pdf' | 'png' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // QR payload: the candidate's primary Passport ID, normalised. When
  // the candidate has no Passport, fall back to the certificate's own
  // credential_number so the QR still resolves to a real URL.
  const publicUrl = useMemo(() => {
    if (ownerPassportNumber) return getPublicPassportUrl(ownerPassportNumber);
    return getPublicPassportUrl(certificate.credential_number);
  }, [ownerPassportNumber, certificate.credential_number]);

  const hasQr = Boolean(publicUrl);

  const onDownload = async (format: 'pdf' | 'png') => {
    setDownloadBusy(format);
    try {
      
      const bundle: PublicCertificateBundle = {
        result: certificate.status === 'Active' ? 'verified' : 'revoked',
        credential_number: certificate.credential_number,
        verification_token: certificate.verification_token,
        verification_uuid: certificate.verification_uuid,
        verification_hash: certificate.verification_hash,
        certificate_hash: certificate.certificate_hash,
        status: certificate.status,
        user_full_name: certificate.user_full_name,
        user_avatar_url: certificate.user_avatar_url,
        roadmap_title: certificate.roadmap_title,
        category_name: certificate.category_name,
        sub_category_name: certificate.sub_category_name,
        roadmap_started_at: certificate.roadmap_started_at,
        completion_date: certificate.completion_date,
        issue_date: certificate.issue_date,
        completion_duration_days: certificate.completion_duration_days,
        admin_name_snapshot: certificate.admin_name_snapshot,
        admin_feedback: certificate.admin_feedback,
        revoked_reason: certificate.revoked_reason,
        revoked_at: certificate.revoked_at,
      };
      if (format === 'pdf') {
        await downloadCertificatePdf(bundle);
        setToast('Premium PDF downloaded');
      } else {
        await downloadCertificatePng(bundle);
        setToast('Premium PNG downloaded');
      }
      setTimeout(() => setToast(null), 2200);
    } catch (e) {
      console.error(e);
      setToast('Download failed');
      setTimeout(() => setToast(null), 2200);
    } finally {
      setDownloadBusy(null);
    }
  };

  useEffect(() => {
    return () => {
      
    };
  }, []);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      {}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-rose-50 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLES[certificate.status] ?? 'bg-slate-100 text-slate-700'}`}>
            {certificate.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : certificate.status === 'Revoked' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {certificate.status}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-mono font-bold text-amber-100">
            <Hash className="w-3 h-3" /> {certificate.credential_number}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
            <ShieldCheck className="w-3 h-3" /> SkillProof Verified
          </span>
        </div>
      </div>

      {}
      <div className="grid gap-6 px-5 py-6 sm:px-7 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0 space-y-4">
          {}
          <div className="flex items-start gap-4">
            {certificate.user_avatar_url ? (
              <img
                src={certificate.user_avatar_url}
                alt={certificate.user_full_name}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-amber-300/60 shadow"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 text-2xl font-black ring-2 ring-amber-300/60">
                {initials(certificate.user_full_name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Completed</p>
              <h3 className="break-words text-xl font-extrabold tracking-tight text-slate-900">
                {certificate.roadmap_title}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {certificate.category_name && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">
                    <Award className="w-3 h-3" /> {certificate.category_name}
                  </span>
                )}
                {certificate.sub_category_name && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
                    {certificate.sub_category_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Completion" value={fmtDate(certificate.completion_date)} />
            <Stat label="Issued" value={fmtDate(certificate.issue_date)} />
            <Stat label="Duration" value={`${certificate.completion_duration_days} days`} />
            <Stat label="Verifications" value={String(certificate.verification_count ?? 0)} />
          </div>

          {}
          {certificate.admin_name_snapshot && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Approved & Signed By
              </p>
              <p className="mt-1 break-words font-extrabold text-slate-900">{certificate.admin_name_snapshot}</p>
              {certificate.admin_feedback && (
                <p className="mt-2 break-words text-xs italic text-slate-600">"{certificate.admin_feedback}"</p>
              )}
            </div>
          )}

          {}
          {certificate.status === 'Revoked' && certificate.revoked_reason && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Revoked</p>
              <p className="mt-1 break-words text-rose-800">{certificate.revoked_reason}</p>
              {certificate.revoked_at && (
                <p className="mt-1 text-[11px] text-rose-600 break-words">
                  on {new Date(certificate.revoked_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <a
              href={
                ownerPassportNumber
                  ? `/verify?id=${encodeURIComponent(ownerPassportNumber)}`
                  : `/verify?id=${encodeURIComponent(certificate.credential_number)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#E31B23] to-[#F97316] px-3 py-1.5 text-xs font-bold text-white shadow hover:opacity-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Verified CV
            </a>
            <button
              onClick={() => onDownload('pdf')}
              disabled={downloadBusy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> {downloadBusy === 'pdf' ? '…' : 'PDF'}
            </button>
            <button
              onClick={() => onDownload('png')}
              disabled={downloadBusy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ImageIcon className="w-3.5 h-3.5" /> {downloadBusy === 'png' ? '…' : 'PNG'}
            </button>
            <button
              onClick={() => {
                try { void navigator.clipboard?.writeText(publicUrl); setToast('URL copied'); setTimeout(() => setToast(null), 1500); } catch {  }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <LinkIcon className="w-3.5 h-3.5" /> Copy URL
            </button>
          </div>
        </div>

        {}
        <aside className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 w-full md:w-auto md:min-w-[200px]">
          {hasQr ? (
            <>
              <div className="rounded-2xl bg-white p-3 shadow ring-1 ring-slate-200">
                <QRCodeSVG value={publicUrl} size={140} bgColor="#ffffff" fgColor="#0f172a" level="M" includeMargin={false} />
              </div>
              <p className="text-center text-[9px] text-slate-500 font-mono max-w-[180px] overflow-x-auto whitespace-nowrap">
                {publicUrl}
              </p>
            </>
          ) : (
            <p className="text-center text-[10px] text-slate-500">QR not available</p>
          )}
        </aside>
      </div>

      {toast && (
        <div className="border-t border-slate-100 bg-emerald-50 px-5 py-2 text-xs font-semibold text-emerald-700">
          {toast}
        </div>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

export default CertificateCard;