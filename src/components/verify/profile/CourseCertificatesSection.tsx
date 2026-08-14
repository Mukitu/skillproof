/**
 * CourseCertificatesSection
 * -------------------------
 * Renders the candidate's Course Completion Certificates inside the
 * public /verify profile view. Pulls from
 * `payload.course_certificates[]` (added to the unified RPC payload by
 * migration 20260814000021).
 *
 * Silently renders nothing when no certificates exist (empty array,
 * missing field, all revoked). Each card surfaces the credential
 * number, roadmap title, category / sub-category, issue date, status
 * badge, and a public-facing share / verification URL.
 *
 * Verification URL shape: /verify?id=<credential_number>  — works
 * with the existing EmployerVerificationPortal lookup logic.
 */
import { Award, Calendar, ExternalLink, ShieldCheck } from 'lucide-react';
import { safeStr } from './profileHelpers';

interface Props { payload: any; }

interface CertRow {
  id?: string;
  credential_number?: string;
  verification_token?: string;
  status?: string;
  roadmap_title?: string;
  category_name?: string;
  sub_category_name?: string;
  roadmap_started_at?: string | null;
  completion_date?: string | null;
  issue_date?: string | null;
  completion_duration_days?: number | null;
  admin_name_snapshot?: string | null;
  revoked_reason?: string | null;
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
        <ShieldCheck className="h-3 w-3" /> Verified
      </span>
    );
  }
  if (s === 'revoked') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
        Revoked
      </span>
    );
  }
  if (s === 'superseded') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
        Superseded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
      {status || 'Pending'}
    </span>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return d;
  }
}

export function CourseCertificatesSection({ payload }: Props) {
  const rows: CertRow[] = Array.isArray((payload as any)?.course_certificates)
    ? ((payload as any).course_certificates as CertRow[])
    : [];

  if (rows.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg,#E31B23 0%,#F97316 55%,#FF8A00 100%)' }}
      />
      <div className="space-y-4 p-5 sm:p-6">
        <header className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E31B23] to-[#F97316] text-white shadow">
            <Award className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              Course Completion Certificates
            </h2>
            <p className="text-xs text-slate-500">
              Roadmap completions issued by SkillProof ({rows.length})
            </p>
          </div>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((cert, idx) => {
            const credNum = safeStr(cert.credential_number);
            const verifyHref = credNum
              ? `/verify?id=${encodeURIComponent(credNum)}`
              : null;
            return (
              <li
                key={cert.id || credNum || `cert-${idx}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#F97316]/40 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-bold text-slate-900 break-words">
                    {safeStr(cert.roadmap_title) || 'Course Certificate'}
                  </h3>
                  {statusBadge(safeStr(cert.status))}
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  {(cert.category_name || cert.sub_category_name) ? (
                    <p className="break-words">
                      <span className="font-semibold text-slate-700">Category:</span>{' '}
                      {[safeStr(cert.category_name), safeStr(cert.sub_category_name)]
                        .filter(Boolean)
                        .join(' / ') || '—'}
                    </p>
                  ) : null}
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                    Issued: {formatDate(cert.issue_date)}
                  </p>
                  {cert.completion_duration_days != null ? (
                    <p>Completed in {cert.completion_duration_days} day(s)</p>
                  ) : null}
                  {credNum ? (
                    <p className="font-mono text-[11px] text-slate-500 break-all">
                      {credNum}
                    </p>
                  ) : null}
                </div>
                {verifyHref ? (
                  <a
                    href={verifyHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#E31B23] ring-1 ring-[#E31B23]/20 hover:bg-[#E31B23] hover:text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Verify Certificate
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default CourseCertificatesSection;
