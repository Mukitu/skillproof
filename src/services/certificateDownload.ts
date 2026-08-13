
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getPublicCertificateUrl } from '../utils/certificateUrl';
import { logActivity } from './activity';
import type { PublicCertificateBundle } from './courseCertificates';

const TARGET_ID = 'skillproof-certificate-card';

const COLORS = {
  navy: '#0f172a',
  red: '#ED1C24',
  orange: '#F58220',
  gold: '#FFB000',
  amber: '#fbbf24',
  emerald: '#10b981',
  slate: '#475569',
  white: '#ffffff',
};

function ensureCard(bundle: PublicCertificateBundle): HTMLDivElement {
  const host = document.createElement('div');
  host.id = 'skillproof-cert-export-host';
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  host.appendChild(buildCardNode(bundle));
  document.body.appendChild(host);
  return host;
}

function cleanup(host: HTMLElement | null) {
  if (host?.parentNode) host.parentNode.removeChild(host);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return '—'; }
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
}

function escapeHtml(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build the premium enterprise certificate DOM node. Layout mirrors the
 * on-screen design: hero identity block, snapshot grid, signature strip,
 * QR code + verification URL, footer.
 */
function buildCardNode(bundle: PublicCertificateBundle): HTMLElement {
  const root = document.createElement('div');
  root.id = TARGET_ID;
  root.style.width = '1100px';
  root.style.fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  root.style.background = 'linear-gradient(135deg, #0f172a 0%, #7f1d1d 50%, #9a3412 100%)';
  root.style.color = COLORS.white;
  root.style.borderRadius = '24px';
  root.style.overflow = 'hidden';
  root.style.padding = '36px';
  root.style.position = 'relative';

  const isActive = bundle.status === 'Active';
  const isRevoked = bundle.status === 'Revoked';
  const publicUrl = getPublicCertificateUrl(bundle.credential_number);

  // === Header ===
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.paddingBottom = '20px';
  header.style.borderBottom = '1px solid rgba(255,255,255,0.15)';

  const headerLeft = document.createElement('div');
  headerLeft.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#ED1C24,#F58220,#FFB000);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:22px;">S</div>
      <div>
        <div style="font-size:14px;font-weight:800;letter-spacing:0.3em;color:#FDE68A;">SKILLPROOF</div>
        <div style="font-size:10px;color:#FCD34D;letter-spacing:0.2em;">OFFICIAL COURSE COMPLETION CERTIFICATE</div>
      </div>
    </div>
  `;
  const headerRight = document.createElement('div');
  headerRight.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="display:inline-flex;align-items:center;gap:6px;background:${
        isActive ? 'rgba(16,185,129,0.2)' : isRevoked ? 'rgba(244,63,94,0.25)' : 'rgba(251,191,36,0.2)'
      };padding:5px 12px;border-radius:999px;font-size:11px;font-weight:700;color:${
        isActive ? '#A7F3D0' : isRevoked ? '#FECDD3' : '#FEF3C7'
      };">
        ${isActive ? '✓ VERIFIED' : isRevoked ? '✕ REVOKED' : '⚠ UNKNOWN'}
      </span>
      <span style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.1);padding:5px 12px;border-radius:999px;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.2em;">
        #${escapeHtml(bundle.credential_number)}
      </span>
    </div>
  `;
  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  root.appendChild(header);

  // === Body: identity + QR ===
  const body = document.createElement('div');
  body.style.display = 'grid';
  body.style.gridTemplateColumns = '1fr 240px';
  body.style.gap = '28px';
  body.style.marginTop = '28px';

  // LEFT column
  const left = document.createElement('div');

  // Identity block
  const identity = document.createElement('div');
  identity.style.display = 'flex';
  identity.style.gap = '18px';
  identity.style.alignItems = 'flex-start';

  const avatar = document.createElement('div');
  avatar.style.width = '104px';
  avatar.style.height = '104px';
  avatar.style.borderRadius = '22px';
  avatar.style.flexShrink = '0';
  avatar.style.boxShadow = '0 4px 14px rgba(0,0,0,0.35)';
  if (bundle.user_avatar_url) {
    avatar.style.backgroundImage = `url(${bundle.user_avatar_url})`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
  } else {
    avatar.style.background = 'linear-gradient(135deg,#fbbf24,#dc2626)';
    avatar.style.display = 'flex';
    avatar.style.alignItems = 'center';
    avatar.style.justifyContent = 'center';
    avatar.style.fontSize = '40px';
    avatar.style.fontWeight = '900';
    avatar.style.color = '#fff8e1';
    avatar.textContent = initials(bundle.user_full_name ?? 'SP');
  }
  identity.appendChild(avatar);

  const nameBlock = document.createElement('div');
  nameBlock.style.flex = '1';
  nameBlock.innerHTML = `
    <div style="font-size:11px;font-weight:700;letter-spacing:0.3em;color:#FCD34D;text-transform:uppercase;margin-bottom:6px;">This is to certify that</div>
    <div style="font-size:32px;font-weight:900;line-height:1.05;letter-spacing:-0.01em;color:#fff;">${escapeHtml(bundle.user_full_name ?? 'SkillProof Member')}</div>
    <div style="margin-top:8px;font-size:14px;color:#FDE68A;">has successfully completed the career roadmap</div>
    <div style="margin-top:6px;font-size:20px;font-weight:800;color:#fff;">${escapeHtml(bundle.roadmap_title ?? 'Untitled Roadmap')}</div>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
      ${bundle.category_name ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(251,191,36,0.2);padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;color:#FEF3C7;">${escapeHtml(bundle.category_name)}</span>` : ''}
      ${bundle.sub_category_name ? `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(99,102,241,0.2);padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;color:#C7D2FE;">${escapeHtml(bundle.sub_category_name)}</span>` : ''}
    </div>
  `;
  identity.appendChild(nameBlock);
  left.appendChild(identity);

  // Snapshot grid (4 cells)
  const stats = document.createElement('div');
  stats.style.marginTop = '20px';
  stats.style.display = 'grid';
  stats.style.gridTemplateColumns = 'repeat(4,1fr)';
  stats.style.gap = '10px';
  const statDefs = [
    { label: 'COMPLETION', value: fmtDate(bundle.completion_date) },
    { label: 'ISSUE DATE', value: fmtDate(bundle.issue_date) },
    { label: 'DURATION', value: `${bundle.completion_duration_days ?? 0} days` },
    { label: 'VERIFIED', value: `${bundle.verification_hash ? bundle.verification_hash.slice(0, 8) : '—'}…` },
  ];
  for (const s of statDefs) {
    const cell = document.createElement('div');
    cell.style.background = 'rgba(255,255,255,0.06)';
    cell.style.border = '1px solid rgba(255,255,255,0.12)';
    cell.style.padding = '12px';
    cell.style.borderRadius = '10px';
    cell.style.textAlign = 'center';
    cell.innerHTML = `
      <div style="font-size:9px;font-weight:700;letter-spacing:0.2em;color:#FCD34D;text-transform:uppercase;">${s.label}</div>
      <div style="font-size:15px;font-weight:900;color:#fff;margin-top:4px;">${escapeHtml(s.value)}</div>
    `;
    stats.appendChild(cell);
  }
  left.appendChild(stats);

  // Admin signature block
  if (bundle.admin_name_snapshot || bundle.admin_feedback) {
    const sig = document.createElement('div');
    sig.style.marginTop = '20px';
    sig.style.padding = '14px';
    sig.style.background = 'rgba(0,0,0,0.25)';
    sig.style.border = '1px solid rgba(255,255,255,0.1)';
    sig.style.borderRadius = '10px';
    sig.innerHTML = `
      <div style="font-size:10px;font-weight:700;letter-spacing:0.25em;color:#FCD34D;text-transform:uppercase;">Approved & Signed By</div>
      <div style="margin-top:4px;font-size:15px;font-weight:800;color:#fff;">${escapeHtml(bundle.admin_name_snapshot ?? 'SkillProof Admin')}</div>
      ${bundle.admin_feedback ? `<div style="margin-top:6px;font-size:12px;color:#FDE68A;font-style:italic;">"${escapeHtml(bundle.admin_feedback)}"</div>` : ''}
    `;
    left.appendChild(sig);
  }

  // Revoked banner
  if (isRevoked && bundle.revoked_reason) {
    const revoked = document.createElement('div');
    revoked.style.marginTop = '16px';
    revoked.style.padding = '12px 16px';
    revoked.style.background = 'rgba(244,63,94,0.18)';
    revoked.style.border = '1px solid rgba(244,63,94,0.35)';
    revoked.style.borderRadius = '10px';
    revoked.style.fontSize = '12px';
    revoked.style.color = '#FECDD3';
    revoked.innerHTML = `
      <strong>Revoked:</strong> ${escapeHtml(bundle.revoked_reason)}
      ${bundle.revoked_at ? `<div style="margin-top:4px;font-size:10px;opacity:0.8;">on ${new Date(bundle.revoked_at).toLocaleString()}</div>` : ''}
    `;
    left.appendChild(revoked);
  }

  body.appendChild(left);

  // RIGHT column (seal + QR + URL)
  const right = document.createElement('div');
  right.style.display = 'flex';
  right.style.flexDirection = 'column';
  right.style.alignItems = 'center';
  right.style.gap = '14px';
  right.style.background = 'rgba(255,255,255,0.05)';
  right.style.padding = '20px';
  right.style.borderRadius = '16px';
  right.style.border = '1px solid rgba(255,255,255,0.1)';

  // SkillProof seal (SVG inline)
  right.innerHTML = `
    <svg viewBox="0 0 200 200" width="110" height="110" xmlns="http:
      <defs>
        <radialGradient id="sealbg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="55%" stop-color="#dc2626"/>
          <stop offset="100%" stop-color="#7f1d1d"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="62" fill="url(#sealbg)" stroke="#fef3c7" stroke-width="3"/>
      <text x="100" y="105" text-anchor="middle" font-size="38" font-weight="800" fill="#fff8e1" font-family="Georgia,serif">SP</text>
      <text x="100" y="130" text-anchor="middle" font-size="9" font-weight="600" fill="#fef3c7" letter-spacing="2">SKILLPROOF</text>
    </svg>
  `;

  // QR code (drawn as <img> from public service so html2canvas can capture it)
  const qrHolder = document.createElement('div');
  qrHolder.style.background = '#fff';
  qrHolder.style.padding = '10px';
  qrHolder.style.borderRadius = '12px';
  qrHolder.style.boxShadow = '0 4px 14px rgba(0,0,0,0.3)';
  const qrImg = document.createElement('img');
  qrImg.crossOrigin = 'anonymous';
  qrImg.src = qrUrl(publicUrl);
  qrImg.style.width = '170px';
  qrImg.style.height = '170px';
  qrImg.style.display = 'block';
  qrHolder.appendChild(qrImg);
  right.appendChild(qrHolder);

  const urlText = document.createElement('div');
  urlText.style.fontSize = '9px';
  urlText.style.fontFamily = 'monospace';
  urlText.style.color = '#FDE68A';
  urlText.style.textAlign = 'center';
  urlText.style.whiteSpace = 'nowrap';
  urlText.style.maxWidth = '880px';
  urlText.style.overflow = 'hidden';
  urlText.style.textOverflow = 'ellipsis';
  urlText.textContent = publicUrl;
  right.appendChild(urlText);

  body.appendChild(right);
  root.appendChild(body);

  // === Footer ===
  const footer = document.createElement('div');
  footer.style.marginTop = '24px';
  footer.style.paddingTop = '16px';
  footer.style.borderTop = '1px solid rgba(255,255,255,0.15)';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'center';
  footer.style.fontSize = '10px';
  footer.style.color = '#FDE68A';
  footer.innerHTML = `
    <div>
      <div style="font-weight:800;letter-spacing:0.2em;">SKILLPROOF</div>
      <div style="color:#FCD34D;margin-top:2px;">Official Course Completion Certificate</div>
    </div>
    <div style="text-align:right;">
      <div>Credential ID: <strong>${escapeHtml(bundle.credential_number)}</strong></div>
      <div style="margin-top:2px;">Verification UUID: <span style="font-family:monospace;">${escapeHtml(bundle.verification_uuid ?? '—')}</span></div>
      <div style="margin-top:2px;">Generated ${new Date().toLocaleString()}</div>
    </div>
  `;
  root.appendChild(footer);

  return root;
}

function qrUrl(data: string): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encoded}&color=0f172a&bgcolor=ffffff`;
}


export async function downloadCertificatePng(bundle: PublicCertificateBundle): Promise<void> {
  const host = ensureCard(bundle);
  const node = host.firstElementChild as HTMLElement;
  try {
    const canvas = await html2canvas(node, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });
    const link = document.createElement('a');
    link.download = `SkillProof-Certificate-${bundle.credential_number}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    void logActivity('passport.downloaded', `Downloaded certificate ${bundle.credential_number} (PNG)`, {
      entityType: 'course_certificate',
      entityId: bundle.credential_number ?? '',
      metadata: { format: 'png', credential_number: bundle.credential_number },
    });
  } finally {
    cleanup(host);
  }
}


export async function downloadCertificatePdf(bundle: PublicCertificateBundle): Promise<void> {
  const host = ensureCard(bundle);
  const node = host.firstElementChild as HTMLElement;
  try {
    const canvas = await html2canvas(node, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const margin = 8;
    const ratio = canvas.width / canvas.height;
    let imgW = pageW - margin * 2;
    let imgH = imgW / ratio;
    if (imgH > pageH - margin * 2) {
      imgH = pageH - margin * 2;
      imgW = imgH * ratio;
    }
    const imgX = (pageW - imgW) / 2;
    const imgY = (pageH - imgH) / 2;
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);

    
    pdf.addPage();
    const publicUrl = getPublicCertificateUrl(bundle.credential_number);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(15, 23, 42);
    pdf.text('SkillProof Course Completion Certificate — Verification Record', margin, 18);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Credential ID: ${bundle.credential_number ?? '—'}`, margin, 30);
    pdf.text(`Holder: ${bundle.user_full_name ?? '—'}`, margin, 36);
    pdf.text(`Roadmap: ${bundle.roadmap_title ?? '—'}`, margin, 42);
    pdf.text(`Main Category: ${bundle.category_name ?? '—'}`, margin, 48);
    pdf.text(`Sub Category: ${bundle.sub_category_name ?? '—'}`, margin, 54);
    pdf.text(`Completion Date: ${fmtDate(bundle.completion_date)}`, margin, 60);
    pdf.text(`Issue Date: ${fmtDate(bundle.issue_date)}`, margin, 66);
    pdf.text(`Duration: ${bundle.completion_duration_days ?? 0} days`, margin, 72);
    pdf.text(`Status: ${bundle.status ?? '—'}`, margin, 78);
    pdf.text(`Approved By: ${bundle.admin_name_snapshot ?? '—'}`, margin, 84);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(237, 28, 36);
    pdf.text('Verification URL', margin, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(publicUrl, margin, 106, { maxWidth: pageW - margin * 2 });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(237, 28, 36);
    pdf.text('Verification Hash', margin, 120);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`UUID: ${bundle.verification_uuid ?? '—'}`, margin, 126, { maxWidth: pageW - margin * 2 });
    pdf.text(`Hash: ${bundle.verification_hash ?? '—'}`, margin, 132, { maxWidth: pageW - margin * 2 });
    pdf.text(`Certificate: ${bundle.certificate_hash ?? '—'}`, margin, 138, { maxWidth: pageW - margin * 2 });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(237, 28, 36);
    pdf.text('Admin Feedback', margin, 152);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(bundle.admin_feedback ?? '—', margin, 158, { maxWidth: pageW - margin * 2 });

    pdf.save(`SkillProof-Certificate-${bundle.credential_number}.pdf`);
    void logActivity('passport.downloaded', `Downloaded certificate ${bundle.credential_number} (PDF)`, {
      entityType: 'course_certificate',
      entityId: bundle.credential_number ?? '',
      metadata: { format: 'pdf', credential_number: bundle.credential_number },
    });
  } finally {
    cleanup(host);
  }
}