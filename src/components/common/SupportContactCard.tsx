import React from 'react';
import { LifeBuoy, Mail, Phone, MessageCircle } from 'lucide-react';

export const SUPPORT_EMAIL = 'support@skillproof.top';
export const SUPPORT_PHONE = '01877913760';
export const SUPPORT_PHONE_TEL = `tel:+880${SUPPORT_PHONE.slice(1)}`;
export const SUPPORT_WHATSAPP = `https://wa.me/880${SUPPORT_PHONE.slice(1)}`;

interface SupportContactCardProps {
  variant?: 'amber' | 'rose' | 'slate';
  titleBn?: string;
  titleEn?: string;
  descriptionBn?: string;
  descriptionEn?: string;
  showWhatsApp?: boolean;
  compact?: boolean;
  language?: 'bn' | 'en';
}

const VARIANTS: Record<
  NonNullable<SupportContactCardProps['variant']>,
  { wrap: string; iconWrap: string; iconColor: string; title: string; body: string; link: string }
> = {
  amber: {
    wrap: 'border-amber-200 bg-amber-50/80',
    iconWrap: 'bg-amber-100 text-amber-700',
    iconColor: 'text-amber-600',
    title: 'text-amber-900',
    body: 'text-amber-800',
    link: 'text-[#E31B23] hover:text-[#F97316]',
  },
  rose: {
    wrap: 'border-rose-200 bg-rose-50/80',
    iconWrap: 'bg-rose-100 text-rose-700',
    iconColor: 'text-rose-600',
    title: 'text-rose-900',
    body: 'text-rose-800',
    link: 'text-[#E31B23] hover:text-[#F97316]',
  },
  slate: {
    wrap: 'border-slate-200 bg-slate-50',
    iconWrap: 'bg-slate-200 text-slate-700',
    iconColor: 'text-slate-600',
    title: 'text-slate-900',
    body: 'text-slate-700',
    link: 'text-[#E31B23] hover:text-[#F97316]',
  },
};

export const SupportContactCard: React.FC<SupportContactCardProps> = ({
  variant = 'slate',
  titleBn = 'সহায়তা দরকার?',
  titleEn = 'Need help?',
  descriptionBn = 'আমাদের support টি�ের সাথে যোগাযোগ করুন — দ্রুত সাহায্য পাবেন।',
  descriptionEn = 'Reach our support team — we respond quickly.',
  showWhatsApp = true,
  compact = false,
  language = 'en',
}) => {
  const v = VARIANTS[variant];
  const isBn = language === 'bn';

  return (
    <div
      className={`rounded-2xl border ${v.wrap} ${compact ? 'p-3' : 'p-4'} shadow-[0_1px_2px_rgba(15,23,42,0.04)]`}
      role="region"
      aria-label={isBn ? 'সাপোর্ট যোগা�োগ' : 'Support contact'}
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${v.iconWrap}`}>
          <LifeBuoy className={`h-5 w-5 ${v.iconColor}`} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-bold uppercase tracking-[0.08em] ${v.title}`}>
            {isBn ? titleBn : titleEn}
          </p>
          <p className={`mt-1 text-[13px] leading-snug ${v.body}`}>
            {isBn ? descriptionBn : descriptionEn}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={`inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-white/80 px-3 py-1 text-[12px] font-bold ${v.link}`}
            >
              <Mail className="h-3.5 w-3.5" />
              {SUPPORT_EMAIL}
            </a>
            <a
              href={SUPPORT_PHONE_TEL}
              className={`inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-white/80 px-3 py-1 text-[12px] font-bold ${v.link}`}
            >
              <Phone className="h-3.5 w-3.5" />
              {SUPPORT_PHONE}
            </a>
            {showWhatsApp && (
              <a
                href={SUPPORT_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportContactCard;
