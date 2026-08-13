import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Upload,
  Trash2,
  Image as ImageIcon,
  Camera,
  Sparkles,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import { companySupabase } from '../../lib/supabaseCompany';
import {
  COMPANY_DOCUMENT_TYPE_LABELS,
  COMPANY_STATUS_LABELS,
  listMyCompanyDocuments,
  removeCompanyLogo,
  updateMyCompanyProfile,
  uploadCompanyDocument,
  uploadCompanyLogo,
  type CompanyDocument,
  type CompanyDocumentType,
} from '../../services/companies';

const DOCUMENT_TYPES: CompanyDocumentType[] = [
  'trade_license',
  'company_registration',
  'business_certificate',
  'other',
];

const COMPANY_CATEGORIES: string[] = [
  'Information Technology',
  'Software Development',
  'Telecommunications',
  'Banking & Finance',
  'Manufacturing',
  'Garments & Textiles',
  'Healthcare',
  'Education',
  'Retail & E-commerce',
  'Construction',
  'Real Estate',
  'Hospitality & Tourism',
  'Logistics & Transportation',
  'Agriculture',
  'Energy & Utilities',
  'Media & Entertainment',
  'Government',
  'NGO / Non-Profit',
  'Other',
];

export const CompanyProfilePage: React.FC = () => {
  const { language } = useLanguage();
  const { company, refresh } = useCompanyAuth();

  const [form, setForm] = useState({
    company_name: '',
    category: '',
    description: '',
    address: '',
    phone: '',
    contact_name: '',
    website_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [uploadType, setUploadType] = useState<CompanyDocumentType>('trade_license');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!company) return;
    setForm({
      company_name: company.company_name ?? '',
      category: company.category ?? '',
      description: company.description ?? '',
      address: company.address ?? '',
      phone: company.phone ?? '',
      contact_name: company.contact_name ?? '',
      website_url: company.website_url ?? '',
    });
  }, [company]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!company) return;
      try {
        const docs = await listMyCompanyDocuments(company.id);
        if (mounted) setDocuments(docs);
      } catch {
        if (mounted) setDocuments([]);
      } finally {
        if (mounted) setLoadingDocs(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setError(null);
    setSuccess(null);

    if (!form.company_name.trim() || !form.category.trim() || !form.address.trim() || !form.phone.trim()) {
      setError(language === 'bn' ? 'প্রয়োজনীয় ক্ষেত্রগুলো পূরণ করুন' : 'Please fill all required fields');
      return;
    }
    if (form.description.length > 2000) {
      setError(language === 'bn' ? 'বিবরণ ২০০০ অক্ষরের বেশি হতে পারবে না' : 'Description must be 2000 characters or less');
      return;
    }

    setSaving(true);
    try {
      await updateMyCompanyProfile({
        companyName: form.company_name.trim(),
        category: form.category.trim(),
        description: form.description.trim() || null,
        address: form.address.trim(),
        phone: form.phone.trim(),
        contactName: form.contact_name.trim() || null,
        websiteUrl: form.website_url.trim() || null,
      });
      await refresh();
      setSuccess(language === 'bn' ? 'প্রোফাইল আপডেট সম্পন্ন' : 'Profile updated successfully');
    } catch (err: any) {
      setError(err?.message ?? (language === 'bn' ? 'আপডেট ব্যর্থ' : 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!company || !uploadFile) return;
    if (uploadFile.size > 10 * 1024 * 1024) {
      setUploadError(language === 'bn' ? 'ফাইল ১০ MB এর কম হতে হবে' : 'File must be under 10 MB');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const doc = await uploadCompanyDocument(company.id, uploadFile, uploadType);
      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.document_type !== doc.document_type);
        return [doc, ...filtered];
      });
      setUploadFile(null);
    } catch (err: any) {
      setUploadError(err?.message ?? (language === 'bn' ? 'আপলোড ব্যর্থ' : 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDoc = async (doc: CompanyDocument) => {
    if (!company) return;
    if (!confirm(language === 'bn' ? 'ডকুমেন্ট মুছে ফেলবেন?' : 'Remove this document?')) return;
    try {
      await companySupabase.storage.from('company-documents').remove([doc.file_path]);
      await companySupabase.from('company_documents').delete().eq('id', doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      setUploadError(err?.message ?? (language === 'bn' ? 'মুছে ফেলা ব্যর্থ' : 'Remove failed'));
    }
  };

  const handleLogoPick = () => logoInputRef.current?.click();

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file || !company) return;
    setLogoError(null);
    setLogoSuccess(null);
    setLogoUploading(true);
    try {
      const result = await uploadCompanyLogo(company.id, file);
      await updateMyCompanyProfile({ logoPath: result.path, logoUrl: result.url });
      await refresh();
      setLogoSuccess(language === 'bn' ? 'লোগো আপলোড সম্পন্ন' : 'Logo uploaded');
    } catch (err: any) {
      setLogoError(err?.message ?? (language === 'bn' ? 'লোগো আপলোড ব্যর্থ' : 'Logo upload failed'));
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!company || !company.logo_path) return;
    if (!confirm(language === 'bn' ? 'লোগো মুছে ফেলবেন?' : 'Remove company logo?')) return;
    try {
      await removeCompanyLogo(company.id, company.logo_path);
      await refresh();
    } catch (err: any) {
      setLogoError(err?.message ?? (language === 'bn' ? 'লোগো মুছতে ব্যর্থ' : 'Could not remove logo'));
    }
  };

  if (!company) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const statusInfo = COMPANY_STATUS_LABELS[company.status];
  const approvedOn = company.approved_at ? new Date(company.approved_at).toLocaleDateString() : null;
  const memberSince = new Date(company.created_at).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-3xl shadow-brand-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E31B23] via-[#F97316] to-[#FF8A00]" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.company_name}
                className="shrink-0 w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-black text-slate-900 truncate">
                {language === 'bn' ? 'কোম্পানি প্রোফাইল' : 'Company Profile'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {language === 'bn' ? 'আপনার কোম্পানির তথ্য এবং ডকুমেন্ট পরিচালনা করুন' : 'Manage your company information and documents'}
              </p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
            statusInfo.tone === 'emerald' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : statusInfo.tone === 'amber' ? 'bg-amber-50 border border-amber-200 text-amber-700'
            : 'bg-rose-50 border border-rose-200 text-rose-700'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? statusInfo.bn : statusInfo.en}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <div className="flex items-start gap-5">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.company_name}
              className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-slate-200 shadow-md bg-white"
            />
          ) : (
            <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#E31B23] via-[#F97316] to-amber-500 text-white flex items-center justify-center shadow-md text-3xl font-black">
              {company.company_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900">
              {language === 'bn' ? 'কোম্পানি লোগো' : 'Company Logo'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'bn' ? 'PNG, JPG, JPEG বা WEBP। সর্বোচ্চ ৫ MB।' : 'PNG, JPG, JPEG or WEBP. Max 5 MB.'}
            </p>

            {logoError && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{logoError}</span>
              </div>
            )}
            {logoSuccess && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{logoSuccess}</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
              <button
                type="button"
                onClick={handleLogoPick}
                disabled={logoUploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-60"
              >
                {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{company.logo_url
                  ? (language === 'bn' ? 'লোগো পরিবর্তন' : 'Replace Logo')
                  : (language === 'bn' ? 'লোগো আপলোড' : 'Upload Logo')}</span>
              </button>
              {company.logo_url && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={logoUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs rounded-xl disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'লোগো মুছুন' : 'Remove Logo'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <h2 className="text-sm font-black text-slate-900 mb-4">
          {language === 'bn' ? 'কোম্পানি তথ্য' : 'Company Information'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={language === 'bn' ? 'কোম্পানির নাম *' : 'Company Name *'}
              icon={Building2}
              value={form.company_name}
              onChange={(v) => setForm((f) => ({ ...f, company_name: v }))}
            />
            <SelectField
              label={language === 'bn' ? 'ক্যাটাগরি *' : 'Category *'}
              icon={Sparkles}
              value={form.category}
              options={COMPANY_CATEGORIES}
              onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            />
            <Field
              label={language === 'bn' ? 'ফোন *' : 'Phone *'}
              icon={Phone}
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
            <Field
              label={language === 'bn' ? 'ইমেইল' : 'Email'}
              icon={Mail}
              value={company.email}
              readOnly
            />
            <Field
              label={language === 'bn' ? 'যোগাযোগ ব্যক্তি' : 'Contact Person'}
              icon={User}
              value={form.contact_name}
              onChange={(v) => setForm((f) => ({ ...f, contact_name: v }))}
            />
            <Field
              label={language === 'bn' ? 'ওয়েবসাইট' : 'Website'}
              icon={Globe}
              value={form.website_url}
              onChange={(v) => setForm((f) => ({ ...f, website_url: v }))}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'ঠিকানা *' : 'Address *'}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'কোম্পানি বিবরণ' : 'Company Description'}
              <span className="ml-2 text-[10px] text-slate-400 font-medium">
                {form.description.length}/2000
              </span>
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={language === 'bn'
                ? 'আপনার কোম্পানি সম্পর্কে সংক্ষেপে লিখুন…'
                : 'Briefly describe your company…'}
              maxLength={2000}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{language === 'bn' ? 'প্রোফাইল আপডেট করুন' : 'Save Profile'}</span>
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#E31B23]" />
          {language === 'bn' ? 'ভেরিফিকেশন তথ্য' : 'Verification Details'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {language === 'bn' ? 'নিবন্ধনের তারিখ' : 'Registration Date'}
            </p>
            <p className="text-sm font-black text-slate-900 mt-1">{memberSince}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {language === 'bn' ? 'অনুমোদনের তারিখ' : 'Approval Date'}
            </p>
            <p className="text-sm font-black text-slate-900 mt-1">{approvedOn ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {language === 'bn' ? 'ভেরিফিকেশন স্ট্যাটাস' : 'Verification Status'}
            </p>
            <p className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
              <ShieldCheck className={`w-3.5 h-3.5 ${
                statusInfo.tone === 'emerald' ? 'text-emerald-600'
                : statusInfo.tone === 'amber' ? 'text-amber-600'
                : 'text-rose-600'
              }`} />
              {language === 'bn' ? statusInfo.bn : statusInfo.en}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-brand-sm p-5 sm:p-6">
        <h2 className="text-sm font-black text-slate-900 mb-4">
          {language === 'bn' ? 'কোম্পানি ডকুমেন্ট' : 'Company Documents'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'ডকুমেন্টের ধরন' : 'Document Type'}
            </label>
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as CompanyDocumentType)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23]"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {language === 'bn' ? COMPANY_DOCUMENT_TYPE_LABELS[t].bn : COMPANY_DOCUMENT_TYPE_LABELS[t].en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {language === 'bn' ? 'ফাইল নির্বাচন' : 'File'}
            </label>
            <label className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#E31B23]">
              <span className="text-xs text-slate-700 truncate flex items-center gap-2 min-w-0">
                <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{uploadFile ? uploadFile.name : (language === 'bn' ? 'ফাইল নির্বাচন করুন' : 'Choose file')}</span>
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  setUploadError(null);
                }}
              />
            </label>
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!uploadFile || uploading}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E31B23] to-[#F97316] hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span>{language === 'bn' ? 'আপলোড করুন' : 'Upload Document'}</span>
        </button>

        <div className="mt-5 space-y-2">
          {loadingDocs ? (
            <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          ) : documents.length === 0 ? (
            <p className="text-xs text-slate-500">
              {language === 'bn' ? 'কোনো ডকুমেন্ট জমা দেওয়া হয়নি।' : 'No documents uploaded yet.'}
            </p>
          ) : (
            documents.map((doc) => {
              const label = COMPANY_DOCUMENT_TYPE_LABELS[doc.document_type];
              return (
                <div key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-[#E31B23] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-slate-500">
                        {language === 'bn' ? label.bn : label.en} · {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.verified_at ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {language === 'bn' ? 'যাচাইকৃত' : 'Verified'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {language === 'bn' ? 'অপেক্ষায়' : 'Pending'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(doc)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      aria-label={language === 'bn' ? 'মুছুন' : 'Remove'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}> = ({ label, icon: Icon, value, onChange, placeholder, readOnly }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
      />
    </div>
  </div>
);

const SelectField: React.FC<{
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}> = ({ label, icon: Icon, value, options, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#E31B23] focus:bg-white focus:ring-2 focus:ring-[#F97316]/20 transition appearance-none"
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  </div>
);

export default CompanyProfilePage;