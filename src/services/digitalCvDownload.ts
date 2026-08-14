/* eslint-disable react/no-unescaped-entities */

/**
 * digitalCvDownload.ts
 * --------------------
 * Generates a "Digital CV" PDF from a public verification payload
 * (`PublicCandidateVerification`). The CV is recruiter-friendly and
 * contains ONLY data already exposed via the public endpoint —
 * nothing private is added.
 *
 * PDF content (mirrors the on-screen Premium CV):
 *   1. Cover / header strip (avatar, name, headline, passport number)
 *   2. Career Summary
 *   3. Skills (verified + other)
 *   4. Verified Skills (name, level, score)
 *   5. Assessment Performance (KPIs + per-assessment cards)
 *   6. Experience timeline
 *   7. Education
 *   8. Certifications
 *   9. Projects
 *  10. Portfolio
 *  11. Career Readiness (if available)
 *  12. Verified Credentials (one card per category passport)
 *  13. SkillProof Verification footer
 *
 * Explicitly NEVER included:
 *   - Question text / answer options / correct answers
 *   - Admin review notes / moderator notes
 *   - Passwords / auth tokens / service keys
 *   - Payout / private phone / private email
 *   - Internal database IDs (we render only Passport Number)
 *   - Assessment generation data
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { safeNum, safeStr, fmtDate } from '../components/verify/profile/profileHelpers';

const COLORS = {
  red: '#E31B23',
  orange: '#F97316',
  amber: '#FFB000',
  emerald: '#10b981',
  navy: '#0f172a',
  slate900: '#0f172a',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  white: '#ffffff',
  emeraldBg: '#ecfdf5',
};

const PAGE_MARGIN_MM = 12;
const PAGE_WIDTH = 210; // A4 portrait mm
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_MM * 2;

interface RenderArgs {
  payload: any;
  verificationUrl: string | null;
}

export async function downloadDigitalCv({ payload, verificationUrl }: RenderArgs): Promise<void> {
  const host = buildCvNode({ payload, verificationUrl });
  document.body.appendChild(host);
  try {
    const node = host.firstElementChild as HTMLElement;
    const canvas = await html2canvas(node, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');

    const ratio = canvas.width / canvas.height;
    const pageHeightAvailable = PAGE_HEIGHT - PAGE_MARGIN_MM * 2;
    let imgW = CONTENT_WIDTH;
    let imgH = imgW / ratio;

    // If the canvas is taller than one page, split into multiple pages
    // by re-rendering chunk-by-chunk. We keep it simple here: render
    // the entire canvas at once and let jsPDF split across pages using
    // the built-in support.
    if (imgH <= pageHeightAvailable) {
      pdf.addImage(imgData, 'PNG', PAGE_MARGIN_MM, PAGE_MARGIN_MM, imgW, imgH);
    } else {
      // Multi-page render: draw the image scaled to full page width,
      // allowing the PDF library to clip overflow across pages. The
      // canvas is exported at native pixel ratio so text stays crisp.
      const pxPerMm = canvas.width / CONTENT_WIDTH;
      const totalPxHeight = canvas.height;
      const pxPerPage = Math.floor(pageHeightAvailable * pxPerMm);
      let rendered = 0;
      let pageIndex = 0;
      while (rendered < totalPxHeight) {
        const sliceHeight = Math.min(pxPerPage, totalPxHeight - rendered);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) break;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0, rendered, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight,
        );
        const sliceImg = sliceCanvas.toDataURL('image/png');
        const sliceRatio = sliceCanvas.width / sliceCanvas.height;
        const sliceImgH = CONTENT_WIDTH / sliceRatio;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          sliceImg,
          'PNG',
          PAGE_MARGIN_MM,
          PAGE_MARGIN_MM,
          CONTENT_WIDTH,
          sliceImgH,
        );
        rendered += sliceHeight;
        pageIndex += 1;
      }
    }

    const name = safeStr(payload?.candidate?.full_name ?? null) || 'SkillProof Member';
    const passport = safeStr(payload?.passport_number ?? null);
    const fileName = passport
      ? `SkillProof-Digital-CV-${passport}.pdf`
      : `SkillProof-Digital-CV-${slugify(name)}.pdf`;
    pdf.save(fileName);
  } finally {
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

/* ============================================================ */
/* Node construction                                              */
/* ============================================================ */

function buildCvNode({ payload, verificationUrl }: RenderArgs): HTMLDivElement {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';

  const root = document.createElement('div');
  root.id = 'skillproof-digital-cv';
  root.style.width = '900px';
  root.style.background = '#ffffff';
  root.style.color = COLORS.slate900;
  root.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  root.style.padding = '28px';
  root.style.boxSizing = 'border-box';

  root.appendChild(renderHeader(payload));
  root.appendChild(divider());
  root.appendChild(renderCareerSummary(payload));
  root.appendChild(renderSkills(payload));
  root.appendChild(renderVerifiedSkills(payload));
  root.appendChild(renderAssessmentPerformance(payload));
  root.appendChild(renderExperience(payload));
  root.appendChild(renderEducation(payload));
  root.appendChild(renderCertifications(payload));
  root.appendChild(renderProjects(payload));
  root.appendChild(renderPortfolio(payload));
  root.appendChild(renderCareerReadiness(payload));
  root.appendChild(renderCredentials(payload));
  root.appendChild(renderVerification(payload, verificationUrl));
  root.appendChild(renderFooter(payload, verificationUrl));

  host.appendChild(root);
  return host;
}

/* ---------- shared element helpers ---------- */

function el(tag: string, opts: {
  style?: string;
  text?: string | null;
  className?: string;
  html?: string;
} = {}): HTMLElement {
  const e = document.createElement(tag);
  if (opts.style) e.style.cssText = opts.style;
  if (opts.text != null) e.textContent = opts.text;
  if (opts.html != null) e.innerHTML = opts.html;
  if (opts.className) e.className = opts.className;
  return e;
}

function divider(): HTMLElement {
  return el('div', {
    style: 'height:1px;background:' + COLORS.slate200 + ';margin:14px 0;',
  });
}

function sectionHeader(title: string, eyebrow?: string): HTMLElement {
  const wrap = el('div', {
    style: 'display:flex;flex-direction:column;gap:2px;margin-top:18px;margin-bottom:8px;',
  });
  if (eyebrow) {
    wrap.appendChild(
      el('div', {
        style:
          'font-size:9px;font-weight:800;letter-spacing:0.2em;color:' +
          COLORS.red +
          ';text-transform:uppercase;',
        text: eyebrow,
      }),
    );
  }
  wrap.appendChild(
    el('div', {
      style:
        'font-size:14px;font-weight:900;color:' + COLORS.slate900 + ';letter-spacing:-0.01em;',
      text: title,
    }),
  );
  return wrap;
}

function pill(text: string, color = COLORS.slate100, textColor = COLORS.slate700): HTMLElement {
  return el('span', {
    style:
      'display:inline-flex;align-items:center;gap:4px;border-radius:9999px;padding:2px 8px;' +
      'font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;' +
      'background:' +
      color +
      ';color:' +
      textColor +
      ';',
    text,
  });
}

function row(label: string, value: string): HTMLElement {
  const wrap = el('div', {
    style:
      'display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:4px 0;' +
      'border-bottom:1px dashed ' +
      COLORS.slate200 +
      ';',
  });
  wrap.appendChild(
    el('span', {
      style: 'color:' + COLORS.slate500 + ';font-weight:600;',
      text: label,
    }),
  );
  wrap.appendChild(
    el('span', {
      style:
        'color:' +
        COLORS.slate900 +
        ';font-weight:700;text-align:right;max-width:60%;word-break:break-word;',
      text: value,
    }),
  );
  return wrap;
}

function empty(text: string): HTMLElement {
  return el('div', {
    style:
      'font-size:10px;color:' +
      COLORS.slate500 +
      ';font-style:italic;border:1px dashed ' +
      COLORS.slate200 +
      ';background:' +
      COLORS.slate100 +
      ';border-radius:6px;padding:6px 10px;',
    text,
  });
}

function skillChip(text: string): HTMLElement {
  return el('span', {
    style:
      'display:inline-flex;align-items:center;border-radius:9999px;border:1px solid ' +
      COLORS.slate200 +
      ';background:' +
      COLORS.slate100 +
      ';color:' +
      COLORS.slate700 +
      ';padding:2px 8px;font-size:10px;font-weight:700;margin:2px;',
    text,
  });
}

/* ---------- sections ---------- */

function renderHeader(payload: any): HTMLElement {
  const candidate = payload?.candidate ?? null;
  const career = payload?.career_information ?? null;

  const fullName = safeStr(candidate?.full_name ?? null) || 'SkillProof Member';
  const headline = safeStr(
    career?.headline ?? candidate?.current_position ?? candidate?.profession ?? null,
  );
  const summary = safeStr(career?.experience_summary ?? candidate?.experience_summary ?? null);
  const bio = safeStr(career?.bio ?? candidate?.bio ?? null);
  const shortIntro = summary || bio || '';
  const passportNumber = safeStr(payload?.passport_number ?? null);
  const level = safeStr(payload?.level ?? null);
  const issuedAt = safeStr(payload?.issue_date ?? null);
  const district = safeStr(candidate?.district ?? null);
  const country = safeStr(candidate?.country ?? null);
  const mainCategory = safeStr(candidate?.main_category ?? null);

  const wrap = el('div', {
    style:
      'display:flex;gap:14px;align-items:flex-start;padding:14px;border-radius:14px;' +
      'background:linear-gradient(135deg,#FFF8F6 0%,#fff 60%);border:1px solid ' +
      COLORS.slate200 +
      ';',
  });

  // Avatar block.
  const avatarWrap = el('div', {
    style:
      'width:78px;height:78px;border-radius:18px;background:linear-gradient(135deg,#fbbf24,#e11d48);' +
      'display:flex;align-items:center;justify-content:center;color:white;font-weight:900;' +
      'font-size:30px;flex-shrink:0;overflow:hidden;',
  });
  const avatar = safeStr(candidate?.avatar_url ?? null);
  if (avatar) {
    avatarWrap.style.background = 'url(' + avatar + ') center/cover no-repeat';
  } else {
    avatarWrap.textContent = initials(fullName);
  }
  wrap.appendChild(avatarWrap);

  const body = el('div', { style: 'flex:1;min-width:0;' });
  body.appendChild(
    el('div', {
      style:
        'display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:9px;' +
        'color:' +
        COLORS.slate500 +
        ';font-weight:800;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:4px;',
      text: 'SkillProof Digital CV',
    }),
  );
  body.appendChild(
    el('div', {
      style: 'font-size:24px;font-weight:900;color:' + COLORS.slate900 + ';letter-spacing:-0.01em;',
      text: fullName,
    }),
  );
  if (headline) {
    body.appendChild(
      el('div', {
        style:
          'font-size:12px;font-weight:600;color:' +
          COLORS.slate700 +
          ';margin-top:2px;',
        text: headline,
      }),
    );
  }
  const metaParts: string[] = [];
  if (district || country) metaParts.push([district, country].filter(Boolean).join(', '));
  if (mainCategory) metaParts.push(mainCategory);
  if (passportNumber) metaParts.push('Passport ' + passportNumber);
  if (level) metaParts.push('Level: ' + level);
  if (issuedAt) metaParts.push('Issued ' + fmtDate(issuedAt));
  if (metaParts.length > 0) {
    body.appendChild(
      el('div', {
        style:
          'font-size:10px;color:' +
          COLORS.slate500 +
          ';font-weight:600;margin-top:6px;',
        text: metaParts.join(' · '),
      }),
    );
  }
  if (shortIntro) {
    body.appendChild(
      el('div', {
        style:
          'font-size:11px;line-height:1.55;color:' +
          COLORS.slate700 +
          ';margin-top:8px;',
        text: shortIntro,
      }),
    );
  }

  wrap.appendChild(body);
  return wrap;
}

function renderCareerSummary(payload: any): HTMLElement {
  const ci = payload?.career_information ?? null;
  const candidate = payload?.candidate ?? null;
  const hideAi = Boolean(
    payload?.hide_ai_on_verified_profile ?? candidate?.hide_ai_on_verified_profile ?? false,
  );
  const aiSummary = !hideAi ? safeStr(payload?.ai_career_profile?.career_summary ?? null) : null;
  const summary =
    aiSummary ??
    safeStr(ci?.experience_summary ?? null) ??
    safeStr(candidate?.experience_summary ?? null) ??
    safeStr(ci?.bio ?? null) ??
    safeStr(candidate?.bio ?? null);
  if (!summary) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Professional Summary'));
  wrap.appendChild(
    el('div', {
      style:
        'font-size:11px;line-height:1.6;color:' +
        COLORS.slate700 +
        ';padding:8px 12px;border:1px solid ' +
        COLORS.slate200 +
      ';border-radius:8px;background:' +
      COLORS.slate100 +
      ';',
      text: summary,
    }),
  );
  return wrap;
}

function renderSkills(payload: any): HTMLElement {
  const verifiedSet = new Set(
    (Array.isArray(payload?.verified_skills) ? payload.verified_skills : [])
      .map((v: any) => safeStr(v?.skill_name ?? null)?.toLowerCase())
      .filter(Boolean),
  );
  const others: string[] = [];
  const seen = new Set<string>();
  const candidate = payload?.candidate ?? null;
  const skillTags: string[] = Array.isArray(candidate?.skill_tags) ? candidate.skill_tags : [];
  for (const t of skillTags) {
    const nm = safeStr(t);
    if (!nm) continue;
    const key = nm.toLowerCase();
    if (verifiedSet.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    others.push(nm);
  }
  const technologies: any[] = Array.isArray(payload?.technologies) ? payload.technologies : [];
  for (const t of technologies) {
    const nm = safeStr(t?.name ?? null);
    if (!nm) continue;
    const key = nm.toLowerCase();
    if (verifiedSet.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    others.push(nm);
  }
  if (others.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Skills', 'Public Skills'));
  const chipWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:2px;' });
  for (const s of others) chipWrap.appendChild(skillChip(s));
  wrap.appendChild(chipWrap);
  return wrap;
}

function renderVerifiedSkills(payload: any): HTMLElement {
  const list = Array.isArray(payload?.verified_skills) ? payload.verified_skills : [];
  if (list.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Verified Skills', 'SkillProof Verified'));
  for (const v of list) {
    const name = safeStr(v?.skill_name ?? null) || 'Verified Skill';
    const level = safeStr(v?.skill_level ?? null);
    const score = safeNum(v?.score ?? v?.marks ?? null);
    const verifiedAt = safeStr(v?.verified_at ?? null);
    const task = safeStr(v?.task_title ?? null);

    const card = el('div', {
      style:
        'border:1px solid ' +
        COLORS.emeraldBg +
        ';background:#f0fdf4;border-radius:10px;padding:8px 12px;margin-bottom:6px;',
    });
    const top = el('div', {
      style: 'display:flex;justify-content:space-between;gap:8px;align-items:center;',
    });
    top.appendChild(
      el('div', {
        style:
          'font-size:12px;font-weight:900;color:' +
          COLORS.slate900 +
          ';',
        text: name,
      }),
    );
    top.appendChild(pill('Verified', COLORS.emeraldBg, '#065f46'));
    card.appendChild(top);

    const meta: string[] = [];
    if (score !== null) meta.push('Score ' + Number(score).toFixed(1) + ' / 10');
    if (level) meta.push('Level ' + level);
    if (verifiedAt) meta.push('Verified ' + fmtDate(verifiedAt));
    if (task) meta.push('Assessment: ' + task);
    if (meta.length > 0) {
      card.appendChild(
        el('div', {
          style:
            'font-size:10px;color:' +
            COLORS.slate600 +
            ';margin-top:4px;',
          text: meta.join(' · '),
        }),
      );
    }
    wrap.appendChild(card);
  }
  return wrap;
}

function renderAssessmentPerformance(payload: any): HTMLElement {
  const summary = payload?.assessment_summary ?? null;
  const history = Array.isArray(payload?.assessment_history) ? payload.assessment_history : [];

  const total = Number(summary?.total_assessments ?? summary?.total_attempts ?? 0);
  const passed = Number(summary?.passed ?? 0);
  const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const avg = safeNum(summary?.average_score ?? null);

  if (total === 0 && history.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Assessment Performance', 'SkillProof Results'));

  // KPI strip
  const kpis = el('div', {
    style:
      'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px;',
  });
  for (const tile of [
    { label: 'Total', value: String(total || history.length) },
    { label: 'Passed', value: String(passed) },
    { label: 'Pass Rate', value: rate + '%' },
    { label: 'Avg / 10', value: avg !== null ? Number(avg).toFixed(1) : '—' },
  ]) {
    const t = el('div', {
      style:
        'border:1px solid ' +
        COLORS.slate200 +
        ';background:' +
        COLORS.slate100 +
        ';border-radius:8px;padding:6px;text-align:center;',
    });
    t.appendChild(
      el('div', {
        style:
          'font-size:8px;font-weight:800;letter-spacing:0.1em;color:' +
          COLORS.slate500 +
          ';text-transform:uppercase;',
        text: tile.label,
      }),
    );
    t.appendChild(
      el('div', {
        style:
          'font-size:14px;font-weight:900;color:' +
          COLORS.slate900 +
          ';',
        text: tile.value,
      }),
    );
    kpis.appendChild(t);
  }
  wrap.appendChild(kpis);

  // Per-assessment cards — only safe summary data.
  for (const s of history) {
    const title = safeStr(s?.task_title ?? s?.skill_name ?? null);
    if (!title) continue;
    const status = safeStr(s?.status ?? null) || 'Pending';
    const score = safeNum(s?.score);
    const max = safeNum(s?.task_max_marks ?? s?.max_marks ?? null);
    const scoreText =
      score !== null && max !== null
        ? Number(score).toFixed(1) + ' / ' + max
        : score !== null
        ? Number(score).toFixed(1) + ' / 10'
        : '—';
    const date = safeStr(s?.event_at ?? s?.reviewed_at ?? s?.updated_at ?? null);
    const category = safeStr(s?.category_name ?? null);
    const subCategory = safeStr(s?.sub_category_name ?? null);

    const row = el('div', {
      style:
        'border:1px solid ' +
        COLORS.slate200 +
        ';background:white;border-radius:8px;padding:6px 10px;margin-bottom:4px;' +
        'display:flex;justify-content:space-between;gap:8px;align-items:center;',
    });
    const left = el('div', { style: 'min-width:0;flex:1;' });
    left.appendChild(
      el('div', {
        style:
          'font-size:11px;font-weight:800;color:' +
          COLORS.slate900 +
          ';',
        text: title,
      }),
    );
    const sub: string[] = [];
    if (status) sub.push(status);
    if (category) sub.push(category);
    if (subCategory) sub.push(subCategory);
    if (sub.length > 0) {
      left.appendChild(
        el('div', {
          style:
            'font-size:9px;color:' +
            COLORS.slate500 +
            ';',
          text: sub.join(' · '),
        }),
      );
    }
    const right = el('div', {
      style:
        'display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;',
    });
    right.appendChild(
      el('div', {
        style:
          'font-family:monospace;background:' +
          COLORS.slate900 +
          ';color:white;font-weight:900;font-size:11px;padding:3px 6px;border-radius:4px;',
        text: scoreText,
      }),
    );
    if (date) {
      right.appendChild(
        el('div', {
          style:
            'font-size:9px;font-weight:700;color:' +
            COLORS.slate500 +
            ';text-transform:uppercase;',
          text: fmtDate(date),
        }),
      );
    }
    row.appendChild(left);
    row.appendChild(right);
    wrap.appendChild(row);
  }
  return wrap;
}

function renderExperience(payload: any): HTMLElement {
  const list: any[] = Array.isArray(payload?.experience) ? payload.experience : [];
  if (list.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Experience'));
  for (const x of list) {
    const role = safeStr(x?.role ?? null) || 'Position';
    const company = safeStr(x?.company ?? null);
    const duration = safeStr(x?.duration ?? null);
    const summary = safeStr(x?.summary ?? null);
    const card = el('div', {
      style:
        'border:1px solid ' +
        COLORS.slate200 +
        ';background:white;border-radius:10px;padding:8px 12px;margin-bottom:6px;',
    });
    const top = el('div', {
      style: 'display:flex;justify-content:space-between;gap:8px;align-items:flex-start;',
    });
    const left = el('div');
    left.appendChild(
      el('div', {
        style: 'font-size:12px;font-weight:900;color:' + COLORS.slate900 + ';',
        text: role,
      }),
    );
    if (company) {
      left.appendChild(
        el('div', {
          style: 'font-size:11px;font-weight:600;color:' + COLORS.slate700 + ';margin-top:2px;',
          text: company,
        }),
      );
    }
    top.appendChild(left);
    if (duration) {
      top.appendChild(
        el('div', {
          style:
            'font-size:10px;font-weight:600;color:' +
            COLORS.slate600 +
            ';white-space:nowrap;',
          text: duration,
        }),
      );
    }
    card.appendChild(top);
    if (summary) {
      card.appendChild(
        el('div', {
          style:
            'font-size:10px;line-height:1.55;color:' +
            COLORS.slate700 +
            ';margin-top:4px;',
          text: summary,
        }),
      );
    }
    wrap.appendChild(card);
  }
  return wrap;
}

function renderEducation(payload: any): HTMLElement {
  const list: any[] = Array.isArray(payload?.education) ? payload.education : [];
  if (list.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Education'));
  for (const e of list) {
    const degree = safeStr(e?.degree ?? null) || 'Education';
    const inst = safeStr(e?.institution ?? null);
    const year = safeStr(e?.year ?? null);
    const cgpa = safeStr(e?.cgpa ?? null);
    const card = el('div', {
      style:
        'border:1px solid ' +
        COLORS.slate200 +
        ';background:white;border-radius:10px;padding:8px 12px;margin-bottom:6px;' +
        'display:flex;justify-content:space-between;gap:8px;align-items:flex-start;',
    });
    const left = el('div');
    left.appendChild(
      el('div', {
        style: 'font-size:12px;font-weight:900;color:' + COLORS.slate900 + ';',
        text: degree,
      }),
    );
    if (inst) {
      left.appendChild(
        el('div', {
          style: 'font-size:11px;font-weight:600;color:' + COLORS.slate700 + ';margin-top:2px;',
          text: inst,
        }),
      );
    }
    if (year) {
      left.appendChild(
        el('div', {
          style: 'font-size:10px;font-weight:600;color:' + COLORS.slate500 + ';margin-top:2px;',
          text: year,
        }),
      );
    }
    card.appendChild(left);
    if (cgpa) {
      card.appendChild(
        el('div', {
          style:
            'font-family:monospace;font-size:10px;font-weight:700;color:' +
            COLORS.slate700 +
            ';background:' +
            COLORS.slate100 +
            ';border:1px solid ' +
            COLORS.slate200 +
            ';padding:2px 6px;border-radius:4px;',
          text: 'CGPA ' + cgpa,
        }),
      );
    }
    wrap.appendChild(card);
  }
  return wrap;
}

function renderCertifications(payload: any): HTMLElement {
  const list: any[] = Array.isArray(payload?.certificates) ? payload.certificates : [];
  if (list.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Certifications'));
  for (const c of list) {
    const title = safeStr(c?.roadmap_title ?? null) || 'Certification';
    const status = safeStr(c?.status ?? null) || 'Active';
    const number = safeStr(c?.credential_number ?? null);
    const issue = safeStr(c?.issue_date ?? null);
    const card = el('div', {
      style:
        'border:1px solid ' +
        COLORS.slate200 +
        ';background:white;border-radius:10px;padding:8px 12px;margin-bottom:6px;',
    });
    const top = el('div', {
      style: 'display:flex;justify-content:space-between;gap:8px;align-items:center;',
    });
    top.appendChild(
      el('div', {
        style: 'font-size:12px;font-weight:900;color:' + COLORS.slate900 + ';',
        text: title,
      }),
    );
    top.appendChild(pill(status, COLORS.emeraldBg, '#065f46'));
    card.appendChild(top);
    const meta: string[] = [];
    if (number) meta.push('ID: ' + number);
    if (issue) meta.push('Issued ' + fmtDate(issue));
    if (meta.length > 0) {
      card.appendChild(
        el('div', {
          style:
            'font-size:10px;color:' +
            COLORS.slate600 +
            ';margin-top:4px;',
          text: meta.join(' · '),
        }),
      );
    }
    wrap.appendChild(card);
  }
  return wrap;
}

function renderProjects(payload: any): HTMLElement {
  const raw: any[] = Array.isArray(payload?.projects) ? payload.projects : [];
  if (raw.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Projects'));
  for (const p of raw) {
    const name = safeStr(p?.name ?? p?.title ?? null);
    if (!name) continue;
    const desc = safeStr(p?.description ?? null);
    const role = safeStr(p?.role ?? null);
    const url = safeStr(p?.url ?? p?.live_url ?? null);
    let tech: string[] = [];
    if (Array.isArray(p?.technologies)) tech = p.technologies.map((t: any) => safeStr(t)).filter(Boolean) as string[];
    else if (typeof p?.tech_stack === 'string') tech = p.tech_stack.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
    const card = el('div', {
      style:
        'border:1px solid ' +
        COLORS.slate200 +
        ';background:white;border-radius:10px;padding:8px 12px;margin-bottom:6px;',
    });
    card.appendChild(
      el('div', {
        style: 'font-size:12px;font-weight:900;color:' + COLORS.slate900 + ';',
        text: name,
      }),
    );
    if (role) {
      card.appendChild(
        el('div', {
          style: 'font-size:10px;color:' + COLORS.slate500 + ';margin-top:2px;',
          text: 'Role: ' + role,
        }),
      );
    }
    if (desc) {
      card.appendChild(
        el('div', {
          style:
            'font-size:11px;line-height:1.5;color:' +
            COLORS.slate700 +
            ';margin-top:4px;',
          text: desc,
        }),
      );
    }
    if (tech.length > 0) {
      const chipWrap = el('div', { style: 'margin-top:6px;display:flex;flex-wrap:wrap;gap:2px;' });
      for (const t of tech) chipWrap.appendChild(skillChip(t));
      card.appendChild(chipWrap);
    }
    if (url) {
      card.appendChild(
        el('div', {
          style:
            'font-size:10px;color:' +
            COLORS.red +
            ';margin-top:6px;font-weight:700;',
          text: url,
        }),
      );
    }
    wrap.appendChild(card);
  }
  return wrap;
}

function renderPortfolio(payload: any): HTMLElement {
  const candidate = payload?.candidate ?? null;
  const evidence: any[] = Array.isArray(payload?.public_evidence) ? payload.public_evidence : [];

  const links: Array<{ label: string; url: string }> = [];
  const linkedin = safeStr(candidate?.linkedin_url ?? null);
  const github = safeStr(candidate?.github_url ?? null);
  const portfolio = safeStr(candidate?.portfolio_url ?? null);
  const website = safeStr(candidate?.website_url ?? null);
  if (linkedin) links.push({ label: 'LinkedIn', url: linkedin });
  if (github) links.push({ label: 'GitHub', url: github });
  if (portfolio) links.push({ label: 'Portfolio', url: portfolio });
  if (website) links.push({ label: 'Website', url: website });
  for (const e of evidence) {
    const url = safeStr(e?.url ?? null);
    if (!url) continue;
    links.push({ label: safeStr(e?.title ?? null) || 'Project Link', url });
  }
  if (links.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Portfolio & Professional Links'));
  const chipWrap = el('div', { style: 'display:flex;flex-direction:column;gap:4px;' });
  for (const l of links) {
    const card = el('div', {
      style:
        'border:1px solid ' +
        COLORS.slate200 +
        ';background:white;border-radius:8px;padding:6px 10px;' +
        'display:flex;justify-content:space-between;gap:8px;',
    });
    card.appendChild(
      el('div', {
        style: 'font-size:11px;font-weight:800;color:' + COLORS.slate900 + ';',
        text: l.label,
      }),
    );
    card.appendChild(
      el('div', {
        style: 'font-size:10px;font-family:monospace;color:' + COLORS.slate500 + ';',
        text: l.url,
      }),
    );
    chipWrap.appendChild(card);
  }
  wrap.appendChild(chipWrap);
  return wrap;
}

function renderCareerReadiness(payload: any): HTMLElement {
  const hideAi = Boolean(
    payload?.hide_ai_on_verified_profile ?? payload?.candidate?.hide_ai_on_verified_profile ?? false,
  );
  if (hideAi) return el('div');
  const ci = payload?.career_intelligence ?? null;
  if (!ci) return el('div');

  const overall = safeNum(ci?.overall_score ?? null);
  const employability = safeNum(ci?.employability_score ?? null);
  const hiring = safeNum(ci?.hiring_readiness ?? null);
  const summary = safeStr(ci?.career_summary ?? null);

  if (overall === null && employability === null && hiring === null && !summary) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Career Readiness', 'SkillProof Career Intelligence'));

  const kpis = el('div', {
    style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;',
  });
  for (const tile of [
    { label: 'Overall / 100', value: overall ?? '—' },
    { label: 'Employability / 100', value: employability ?? '—' },
    { label: 'Hiring / 100', value: hiring ?? '—' },
  ]) {
    const t = el('div', {
      style:
        'border:1px solid ' +
        COLORS.slate200 +
        ';background:' +
        COLORS.slate100 +
        ';border-radius:8px;padding:6px;text-align:center;',
    });
    t.appendChild(
      el('div', {
        style:
          'font-size:8px;font-weight:800;letter-spacing:0.1em;color:' +
          COLORS.slate500 +
          ';text-transform:uppercase;',
        text: tile.label,
      }),
    );
    t.appendChild(
      el('div', {
        style: 'font-size:14px;font-weight:900;color:' + COLORS.slate900 + ';',
        text: String(tile.value),
      }),
    );
    kpis.appendChild(t);
  }
  wrap.appendChild(kpis);

  if (summary) {
    wrap.appendChild(
      el('div', {
        style:
          'font-size:11px;line-height:1.55;color:' +
          COLORS.slate700 +
          ';padding:6px 10px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;',
        text: summary,
      }),
    );
  }
  return wrap;
}

function renderCredentials(payload: any): HTMLElement {
  const list: any[] = Array.isArray(payload?.passports) ? payload.passports : [];
  const visible = list.filter((p) => String(p?.status ?? '').toLowerCase() !== 'rejected');
  if (visible.length === 0) return el('div');

  const wrap = el('div');
  wrap.appendChild(sectionHeader('Verified SkillProof Credentials'));
  for (const p of visible) {
    const categoryName =
      safeStr(p?.category_name ?? null) ||
      safeStr(p?.main_category_name ?? null) ||
      safeStr(p?.title ?? null) ||
      'SkillProof Credential';
    const status = safeStr(p?.status ?? null) || 'Active';
    const level = safeStr(p?.level ?? null);
    const overall = safeNum(p?.overall_score ?? null);
    const passed = safeNum(p?.passed_count ?? null);
    const avg = safeNum(p?.average_marks ?? null);
    const number = safeStr(p?.passport_number ?? null);
    const issue = safeStr(p?.issue_date ?? null);
    const exp = safeStr(p?.expiry_date ?? null);

    const card = el('div', {
      style:
        'border:1px solid ' +
        COLORS.emeraldBg +
        ';background:#f0fdf4;border-radius:10px;padding:8px 12px;margin-bottom:6px;',
    });
    const top = el('div', {
      style: 'display:flex;justify-content:space-between;gap:8px;align-items:center;',
    });
    top.appendChild(
      el('div', {
        style: 'font-size:12px;font-weight:900;color:' + COLORS.slate900 + ';',
        text: categoryName,
      }),
    );
    top.appendChild(pill(status, COLORS.emeraldBg, '#065f46'));
    card.appendChild(top);

    const kpis = el('div', {
      style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px;',
    });
    for (const tile of [
      { label: 'Score', value: overall !== null ? overall + ' / 100' : '—' },
      { label: 'Passed', value: passed ?? 0 },
      { label: 'Avg / 10', value: avg !== null ? Number(avg).toFixed(1) : '—' },
    ]) {
      const t = el('div', {
        style:
          'background:white;border-radius:6px;padding:4px;text-align:center;' +
          'border:1px solid ' +
          COLORS.slate200 +
          ';',
      });
      t.appendChild(
        el('div', {
          style:
            'font-size:8px;font-weight:800;letter-spacing:0.1em;color:' +
            COLORS.slate500 +
            ';text-transform:uppercase;',
          text: tile.label,
        }),
      );
      t.appendChild(
        el('div', {
          style: 'font-size:12px;font-weight:900;color:' + COLORS.slate900 + ';',
          text: String(tile.value),
        }),
      );
      kpis.appendChild(t);
    }
    card.appendChild(kpis);

    const meta: string[] = [];
    if (number) meta.push('Passport ' + number);
    if (level) meta.push('Level ' + level);
    if (issue) meta.push('Issued ' + fmtDate(issue));
    if (exp) meta.push('Expires ' + fmtDate(exp));
    if (meta.length > 0) {
      card.appendChild(
        el('div', {
          style: 'font-size:10px;color:' + COLORS.slate600 + ';margin-top:6px;',
          text: meta.join(' · '),
        }),
      );
    }
    wrap.appendChild(card);
  }
  return wrap;
}

function renderVerification(payload: any, verificationUrl: string | null): HTMLElement {
  const wrap = el('div');
  wrap.appendChild(sectionHeader('Verification'));

  const card = el('div', {
    style:
      'border:1px solid ' +
      COLORS.slate200 +
      ';background:' +
      COLORS.slate100 +
      ';border-radius:10px;padding:10px;',
  });
  const items: string[] = [];
  if (payload?.verified_by_skillproof === true) items.push('Verified against SkillProof database');
  if (!payload?.revoked_at) items.push('No revocation detected');
  if (payload?.candidate?.full_name) items.push('Candidate identity matched');
  if (verificationUrl) items.push('Independent verification available');
  for (const i of items) {
    card.appendChild(
      el('div', {
        style:
          'font-size:11px;font-weight:700;color:' +
          COLORS.slate700 +
          ';margin-bottom:2px;',
        text: '✓ ' + i,
      }),
    );
  }
  if (verificationUrl) {
    card.appendChild(
      el('div', {
        style:
          'font-size:10px;font-family:monospace;color:' +
          COLORS.slate700 +
          ';margin-top:6px;background:white;padding:4px 6px;border-radius:4px;' +
          'border:1px solid ' +
          COLORS.slate200 +
          ';',
        text: verificationUrl,
      }),
    );
  }
  wrap.appendChild(card);
  return wrap;
}

function renderFooter(payload: any, verificationUrl: string | null): HTMLElement {
  const name = safeStr(payload?.candidate?.full_name ?? null) || 'SkillProof Member';
  const passport = safeStr(payload?.passport_number ?? null);

  const wrap = el('div', {
    style:
      'margin-top:18px;padding:10px;border-radius:10px;background:' +
      COLORS.slate100 +
      ';border:1px solid ' +
      COLORS.slate200 +
      ';text-align:center;',
  });
  wrap.appendChild(
    el('div', {
      style: 'font-size:11px;font-weight:800;color:' + COLORS.slate700 + ';',
      text: 'Verified by SkillProof',
    }),
  );
  wrap.appendChild(
    el('div', {
      style: 'font-size:10px;color:' + COLORS.slate500 + ';margin-top:2px;',
      text:
        'Generated for ' +
        name +
        (passport ? ' · ' + passport : '') +
        ' · ' +
        new Date().toLocaleString() +
        (verificationUrl ? ' · ' + verificationUrl : ''),
    }),
  );
  return wrap;
}

/* ---------- helpers ---------- */

function initials(name: string): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}