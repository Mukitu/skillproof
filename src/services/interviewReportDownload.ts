
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReportDownloadQuestion {
  id: string;
  question_index: number;
  difficulty: string;
  question_text: string;
  answer?: {
    answer_text: string | null;
    voice_transcript?: string | null;
    score: number | null;
  } | null;
}

export interface ReportDownloadEvaluation {
  overall: number;
  communication: number;
  technical: number;
  problem_solving: number;
  confidence: number;
  grammar: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  career_advice: string;
  recommended_skills: string[];
  recommended_roadmap: { title: string; reason: string };
  recommended_verification: { title: string; reason: string };
}

export interface ReportDownloadSession {
  id: string;
  category_name: string;
  sub_category_name: string | null;
  interview_duration: number;
  started_at: string;
  ended_at: string | null;
  score: number | null;
}

export interface ReportDownloadProfile {
  full_name?: string | null;
  email?: string | null;
}

export interface ReportDownloadOptions {
  session: ReportDownloadSession;
  evaluation: ReportDownloadEvaluation;
  questions: ReportDownloadQuestion[];
  profile: ReportDownloadProfile | null;
  language: 'bn' | 'en';
}

const HOST_ID = 'skillproof-interview-report-host';

function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTier(score: number): { color: string; bg: string; label: string } {
  if (score >= 70) return { color: '#10b981', bg: '#ecfdf5', label: 'Strong' };
  if (score >= 40) return { color: '#f59e0b', bg: '#fffbeb', label: 'Developing' };
  return { color: '#f43f5e', bg: '#fff1f2', label: 'Needs work' };
}

function renderReportHtml(opts: ReportDownloadOptions): string {
  const { session, evaluation, questions, profile, language } = opts;
  const isBn = language === 'bn';
  const overall = Math.max(0, Math.min(100, Math.round(evaluation.overall)));
  const tier = getTier(overall);

  const axesHtml = [
    { label: isBn ? 'যোগাযোগ' : 'Communication', v: evaluation.communication },
    { label: isBn ? 'প্রযুক্তিগত' : 'Technical', v: evaluation.technical },
    { label: isBn ? 'সমস্যা সমাধান' : 'Problem Solving', v: evaluation.problem_solving },
    { label: isBn ? 'আত্মবিশ্বাস' : 'Confidence', v: evaluation.confidence },
    {
      label: isBn ? 'ব্যাকরণ ও স্পষ্টতা' : 'Grammar & Clarity',
      v: evaluation.grammar,
    },
  ]
    .map(
      (a) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
          <div style="flex:1;font-size:11px;font-weight:600;color:#334155;">${escapeForHtml(a.label)}</div>
          <div style="font-family:monospace;font-weight:700;color:#0f766e;font-size:14px;">${Math.round(a.v)}<span style="color:#94a3b8;font-size:11px;">/100</span></div>
        </div>`,
    )
    .join('');

  const bullets = (arr: string[]) =>
    (arr.length
      ? `<ul style="margin:0;padding-left:18px;font-size:12px;color:#334155;line-height:1.55;">${arr
          .map((b) => `<li>${escapeForHtml(b)}</li>`)
          .join('')}</ul>`
      : `<p style="font-size:11px;color:#94a3b8;font-style:italic;margin:0;">${isBn ? 'কোনো আইটেম নেই' : 'No items'}</p>`);

  const skillChips = (evaluation.recommended_skills || [])
    .slice(0, 5)
    .map(
      (s) =>
        `<span style="display:inline-block;padding:3px 10px;border-radius:9999px;background:#eef2ff;color:#4338ca;font-size:11px;font-weight:600;margin:2px;">${escapeForHtml(s)}</span>`,
    )
    .join('');

  const transcriptHtml = questions
    .map((q, i) => {
      const a = q.answer;
      const score = a?.score != null ? Math.round(a.score) : null;
      return `
        <div style="margin-bottom:10px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">
            ${isBn ? 'প্রশ্ন' : 'Question'} ${q.question_index} · ${escapeForHtml(q.difficulty)}
            ${score != null ? ` · <span style="color:#0f766e;">${score}/100</span>` : ''}
          </div>
          <div style="margin-top:4px;font-size:12px;font-weight:600;color:#0f172a;">${escapeForHtml(q.question_text)}</div>
          ${
            a?.answer_text
              ? `<div style="margin-top:6px;font-size:12px;color:#334155;background:#fff;padding:8px;border-radius:6px;border:1px solid #e2e8f0;white-space:pre-wrap;">${escapeForHtml(a.answer_text)}</div>`
              : `<div style="margin-top:6px;font-size:11px;color:#94a3b8;font-style:italic;">${isBn ? '(উত্তর দেওয়া হয়নি)' : '(no answer)'}</div>`
          }
        </div>`;
    })
    .join('');

  const dateLabel = session.ended_at
    ? new Date(session.ended_at).toLocaleString()
    : new Date(session.started_at).toLocaleString();
  const fullName = profile?.full_name || (isBn ? 'প্রার্থী' : 'Candidate');

  return `
    <div style="width:794px;padding:36px;background:#ffffff;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #ED1C24;padding-bottom:14px;margin-bottom:18px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.2em;text-transform:uppercase;">SkillProof</div>
          <div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:2px;">${isBn ? 'ইন্টারভিউ মূল্যায়ন রিপোর্ট' : 'Interview Evaluation Report'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;font-weight:600;color:#64748b;">${escapeForHtml(fullName)}</div>
          <div style="font-size:11px;color:#94a3b8;">${escapeForHtml(session.category_name)}${session.sub_category_name ? ' · ' + escapeForHtml(session.sub_category_name) : ''}</div>
          <div style="font-size:11px;color:#94a3b8;">${dateLabel}</div>
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:24px;background:${tier.bg};border:1px solid ${tier.color};padding:20px;border-radius:14px;margin-bottom:20px;">
        <div style="font-family:monospace;font-size:64px;font-weight:800;color:${tier.color};line-height:1;">${overall}<span style="font-size:20px;color:#94a3b8;">/100</span></div>
        <div>
          <div style="font-size:11px;font-weight:700;color:${tier.color};text-transform:uppercase;letter-spacing:0.1em;">${tier.label}</div>
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:4px;">${isBn ? 'সামগ্রিক স্কোর' : 'Overall Score'}</div>
          <div style="font-size:12px;color:#334155;margin-top:6px;line-height:1.4;max-width:480px;">${escapeForHtml(evaluation.summary || '')}</div>
        </div>
      </div>

      <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:8px;">${isBn ? 'মূল্যায়ন অক্ষ' : 'Evaluation Axes'}</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px;">${axesHtml}</div>

      <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;">${isBn ? 'ক্যারিয়ার পরামর্শ' : 'AI Career Advice'}</div>
      <div style="font-size:12px;color:#334155;background:#f1f5f9;border-left:4px solid #6366f1;padding:12px;border-radius:8px;margin-bottom:18px;line-height:1.5;">
        ${escapeForHtml(evaluation.career_advice || '')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">
        <div style="padding:10px;border:1px solid #d1fae5;background:#ecfdf5;border-radius:10px;">
          <div style="font-size:11px;font-weight:800;color:#065f46;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${isBn ? 'শক্তি' : 'Strengths'}</div>
          ${bullets(evaluation.strengths || [])}
        </div>
        <div style="padding:10px;border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;">
          <div style="font-size:11px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${isBn ? 'দুর্বলতা' : 'Weaknesses'}</div>
          ${bullets(evaluation.weaknesses || [])}
        </div>
        <div style="padding:10px;border:1px solid #c7d2fe;background:#eef2ff;border-radius:10px;">
          <div style="font-size:11px;font-weight:800;color:#3730a3;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${isBn ? 'উন্নতির পরামর্শ' : 'Recommendations'}</div>
          ${bullets(evaluation.recommendations || [])}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">
        <div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
          <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${isBn ? 'প্রস্তাবিত স্কিল' : 'Recommended Skills'}</div>
          <div>${skillChips || `<span style="font-size:11px;color:#94a3b8;font-style:italic;">${isBn ? 'কোনো পরামর্শ নেই' : 'No suggestions'}</span>`}</div>
        </div>
        <div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
          <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${isBn ? 'প্রস্তাবিত রোডম্যাপ' : 'Recommended Roadmap'}</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;">${escapeForHtml(evaluation.recommended_roadmap?.title || (isBn ? '—' : '—'))}</div>
          <div style="font-size:11px;color:#475569;margin-top:4px;line-height:1.4;">${escapeForHtml(evaluation.recommended_roadmap?.reason || '')}</div>
        </div>
        <div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
          <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">${isBn ? 'প্রস্তাবিত ভেরিফিকেশন' : 'Recommended Verification'}</div>
          <div style="font-size:13px;font-weight:700;color:#0f172a;">${escapeForHtml(evaluation.recommended_verification?.title || '—')}</div>
          <div style="font-size:11px;color:#475569;margin-top:4px;line-height:1.4;">${escapeForHtml(evaluation.recommended_verification?.reason || '')}</div>
        </div>
      </div>

      <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:8px;">${isBn ? 'প্রশ্ন ও উত্তর' : 'Questions & Answers'}</div>
      <div>${transcriptHtml || `<div style="font-size:11px;color:#94a3b8;font-style:italic;">${isBn ? 'কোনো প্রশ্ন নেই' : 'No questions recorded'}</div>`}</div>

      <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#94a3b8;">
        <div>${isBn ? 'SkillProof AI দ্বারা তৈরি' : 'Generated by SkillProof AI'}</div>
        <div>${isBn ? 'গোপনীয় · শুধুমাত্র প্রার্থীর জন্য' : 'Confidential · For candidate only'}</div>
      </div>
    </div>
  `;
}

function mountHost(html: string): HTMLElement {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '794px';
  host.style.zIndex = '-1';
  host.style.background = '#ffffff';
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

function cleanup(host: HTMLElement): void {
  if (host && host.parentNode) {
    try {
      host.parentNode.removeChild(host);
    } catch {
      /* noop */
    }
  }
}

/**
 * Render the on-screen report into a PDF and trigger the browser
 * download dialog. Filename: skillproof-interview-report-<sessionId>.pdf
 */
export async function downloadInterviewReportPdf(opts: ReportDownloadOptions): Promise<void> {
  const html = renderReportHtml(opts);
  const host = mountHost(html);
  try {
    const canvas = await html2canvas(host, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;

    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;
    const ratio = canvas.width / canvas.height;
    let imgW = usableW;
    let imgH = imgW / ratio;

    if (imgH <= usableH) {
      // Single page.
      const imgX = margin;
      const imgY = (pageH - imgH) / 2;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imgX, imgY, imgW, imgH);
    } else {
      // Multi-page — slice the canvas vertically into A4-height pages.
      const pageHeightPx = Math.floor(canvas.width / ratio); // canvas px per page when fitting to width
      let yOffset = 0;
      while (yOffset < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffset);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = sliceHeight;
        const ctx = slice.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, slice.width, slice.height);
        }
        const sliceData = slice.toDataURL('image/png');
        const sliceImgH = (sliceHeight * usableW) / canvas.width;
        if (yOffset > 0) pdf.addPage();
        pdf.addImage(sliceData, 'PNG', margin, margin, usableW, sliceImgH);
        yOffset += sliceHeight;
      }
    }

    pdf.save(`skillproof-interview-report-${opts.session.id.slice(0, 8)}.pdf`);
  } finally {
    cleanup(host);
  }
}

export default {
  downloadInterviewReportPdf,
};
