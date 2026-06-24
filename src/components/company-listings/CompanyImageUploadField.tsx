'use client';

import { useId, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';
import { ImagePlus, Loader2, RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useResolvedImageUrl } from '@/components/company-listings/useResolvedImageUrl';

type CompanyImageKind = 'logo' | 'cover';

type CompanyImageUploadFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: CompanyImageKind;
  companyId?: string;
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const AR_MESSAGES = {
  unsupportedType: 'نوع الملف غير مدعوم. يرجى رفع صورة PNG أو JPG أو WEBP.',
  logoTooLarge: 'حجم الصورة كبير جداً. الحد الأقصى للشعار 2MB.',
  coverTooLarge: 'حجم الصورة كبير جداً. الحد الأقصى لصورة الغلاف 5MB.',
  logoRatio: 'يفضل أن يكون شعار الشركة بصورة مربعة.',
  coverRatio: 'يفضل أن تكون صورة الغلاف بعرض أكبر من الارتفاع.',
  authRequired: 'يرجى تسجيل الدخول لرفع الصور.',
  uploadFailed: 'تعذر رفع الصورة حالياً. حاول مرة أخرى.',
};

function isAsciiUrl(value: string) {
  const raw = value.trim();
  if (!raw) return true;
  if (/[^\x00-\x7F]/.test(raw)) return false;
  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname.includes('.'));
  } catch {
    return false;
  }
}

async function readImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function compressToWebp(file: File, kind: CompanyImageKind) {
  if (typeof document === 'undefined') return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const maxWidth = kind === 'logo' ? 800 : 1600;
    const maxHeight = kind === 'logo' ? 800 : 700;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.86));
    if (!blob) return file;
    return new File([blob], `${kind}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function buildStoragePath(userId: string, companyId: string | undefined, kind: CompanyImageKind, file: File) {
  const folder = companyId ? companyId : 'temp';
  const safeExtension = file.type === 'image/webp' ? 'webp' : EXTENSION_BY_TYPE[file.type] ?? 'webp';
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${userId}/${folder}/${kind}-${Date.now()}-${randomPart}.${safeExtension}`;
}

export function CompanyImageUploadField({ label, value, onChange, kind, companyId }: CompanyImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldId = useId();
  const { user } = useAuth();
  const valid = isAsciiUrl(value);
  const { imageUrl, loading, failed, setFailed } = useResolvedImageUrl(valid ? value : '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const warningId = `${fieldId}-warning`;
  const errorId = `${fieldId}-error`;
  const urlInputId = `${fieldId}-url`;
  const describedBy = [
    `${fieldId}-hint`,
    warning ? warningId : '',
    error ? errorId : '',
  ].filter(Boolean).join(' ');

  const copy = useMemo(() => {
    if (kind === 'logo') {
      return {
        uploadLabel: 'رفع شعار الشركة',
        hint: 'PNG أو JPG أو WEBP - الحد الأقصى 2MB - يفضل 512x512 أو 800x800',
        maxBytes: 2 * 1024 * 1024,
      };
    }
    return {
      uploadLabel: 'رفع صورة الغلاف',
      hint: 'PNG أو JPG أو WEBP - الحد الأقصى 5MB - يفضل 1600x600',
      maxBytes: 5 * 1024 * 1024,
    };
  }, [kind]);

  async function handleFile(file: File | undefined) {
    setError('');
    setWarning('');
    if (!file) return;
    if (!user?.id) {
      setError(AR_MESSAGES.authRequired);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(AR_MESSAGES.unsupportedType);
      return;
    }
    if (file.size > copy.maxBytes) {
      setError(kind === 'logo' ? AR_MESSAGES.logoTooLarge : AR_MESSAGES.coverTooLarge);
      return;
    }

    try {
      const dimensions = await readImageDimensions(file);
      if (kind === 'logo') {
        const ratio = dimensions.width / dimensions.height;
        if (ratio < 0.82 || ratio > 1.22) setWarning(AR_MESSAGES.logoRatio);
      } else if (dimensions.width <= dimensions.height || dimensions.width / dimensions.height < 2) {
        setWarning(AR_MESSAGES.coverRatio);
      }

      setUploading(true);
      const optimized = await compressToWebp(file, kind);
      const path = buildStoragePath(user.id, companyId, kind, optimized);
      const { error: uploadError } = await supabase.storage.from('company-assets').upload(path, optimized, {
        cacheControl: '31536000',
        contentType: optimized.type,
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('company-assets').getPublicUrl(path);
      if (!data.publicUrl) throw new Error('Missing public URL');
      onChange(data.publicUrl);
      setFailed(false);
    } catch {
      setError(AR_MESSAGES.uploadFailed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <div
        className="submit-field image-upload-field"
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault();
          void handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <label className="image-upload-label" htmlFor={urlInputId}>{label}</label>
        <div className="image-upload-box" data-kind={kind}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="image-upload-input"
            onChange={event => void handleFile(event.target.files?.[0])}
          />
          <button type="button" className="image-upload-trigger" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 size={18} className="image-upload-spin" /> : <UploadCloud size={18} />}
            <span>{uploading ? 'جاري رفع الصورة...' : copy.uploadLabel}</span>
          </button>
          <small id={`${fieldId}-hint`}>{copy.hint}</small>
        </div>
        <input
          id={urlInputId}
          value={value}
          onChange={event => { setError(''); onChange(event.target.value); }}
          inputMode="url"
          dir="ltr"
          placeholder="https://example.com/logo.png"
          aria-invalid={Boolean(error) || (!valid && Boolean(value.trim()))}
          aria-describedby={describedBy}
        />
        {value.trim() ? (
          <div className={`image-preview ${valid && !failed ? '' : 'invalid'}`}>
            {valid && imageUrl && !failed ? (
              <NextImage
                src={imageUrl}
                alt={label}
                width={480}
                height={260}
                unoptimized
                loading="lazy"
                onError={() => setFailed(true)}
              />
            ) : null}
            {valid && loading ? <span className="image-preview-loader">...</span> : null}
            <small>
              {!valid
                ? 'الرابط غير صحيح'
                : loading
                  ? 'جاري التحقق من الصورة'
                  : failed
                    ? 'تعذر عرض صورة من هذا الرابط'
                    : 'معاينة الصورة'}
            </small>
            <div className="image-upload-actions">
              <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <RotateCcw size={14} />
                استبدال الصورة
              </button>
              <button type="button" className="danger" onClick={() => onChange('')} disabled={uploading}>
                <Trash2 size={14} />
                حذف الصورة
              </button>
            </div>
          </div>
        ) : (
          <div className="image-upload-empty">
            <ImagePlus size={18} />
            <span>اسحب الصورة هنا أو اضغط للاختيار</span>
          </div>
        )}
        {warning ? (
          <p id={warningId} role="status" aria-live="polite" className="image-upload-warning">
            {warning}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="image-upload-error">
            {error}
          </p>
        ) : null}
      </div>
      <ImageUploadStyles />
    </>
  );
}

function ImageUploadStyles() {
  return (
    <style jsx global>{`
      .image-upload-field {
        align-content: start;
        position: relative;
        z-index: 0;
        overflow: visible;
        gap: 10px;
      }
      .image-upload-label {
        color: #475569;
        font-size: 13px;
        font-weight: 900;
        line-height: 1.5;
      }
      .image-upload-box,
      .image-upload-empty {
        position: relative;
        z-index: 0;
        border: 1px dashed rgba(11, 118, 224, 0.24);
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(11, 118, 224, 0.05), rgba(24, 212, 212, 0.08));
        padding: 12px;
        display: grid;
        gap: 8px;
      }
      .image-upload-input {
        position: fixed;
        inline-size: 1px;
        block-size: 1px;
        opacity: 0;
        pointer-events: none;
        inset-inline-start: -9999px;
      }
      .image-upload-trigger,
      .image-upload-actions button {
        min-height: 42px;
        border-radius: 13px;
        border: 1px solid rgba(11, 118, 224, 0.18);
        background: #ffffff;
        color: #0b76e0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 14px;
        font: 950 13px/1 Tajawal, Arial, sans-serif;
        cursor: pointer;
        transition: transform .16s ease, border-color .16s ease, background .16s ease;
      }
      .image-upload-trigger span,
      .image-upload-empty span {
        color: inherit;
        font: inherit;
      }
      .image-upload-trigger:hover,
      .image-upload-trigger:focus-visible,
      .image-upload-actions button:hover,
      .image-upload-actions button:focus-visible {
        outline: none;
        border-color: rgba(24, 212, 212, 0.5);
        background: #f0fdff;
        transform: translateY(-1px);
      }
      .image-upload-trigger:disabled,
      .image-upload-actions button:disabled {
        opacity: .65;
        cursor: not-allowed;
        transform: none;
      }
      .image-upload-box small {
        color: #64748b;
        font-weight: 850;
        line-height: 1.6;
      }
      .image-preview {
        position: relative;
        z-index: 0;
        border: 1px solid rgba(15, 23, 42, 0.10);
        border-radius: 16px;
        background: #f8fbff;
        padding: 10px;
        display: grid;
        gap: 10px;
        overflow: visible;
      }
      .image-preview img {
        width: 100%;
        max-height: 180px;
        border-radius: 12px;
        object-fit: contain;
        background: #ffffff;
      }
      .image-preview small {
        color: #0f766e;
        font-weight: 900;
        line-height: 1.6;
      }
      .image-preview.invalid {
        border-color: rgba(220, 38, 38, 0.24);
        background: rgba(254, 242, 242, 0.88);
      }
      .image-preview.invalid small {
        color: #991b1b;
      }
      .image-preview-loader {
        min-height: 52px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: #0f766e;
        background: rgba(20, 184, 166, 0.08);
        font-size: 24px;
        font-weight: 950;
        letter-spacing: 2px;
      }
      .image-upload-empty {
        min-height: 72px;
        place-items: center;
        color: #0f766e;
        font-weight: 900;
        text-align: center;
      }
      .image-upload-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .image-upload-actions button {
        flex: 1 1 150px;
        min-height: 38px;
        font-size: 12px;
      }
      .image-upload-actions .danger {
        color: #be123c;
        border-color: rgba(244, 63, 94, 0.22);
        background: #fff1f2;
      }
      .image-upload-warning,
      .image-upload-error {
        position: relative;
        z-index: 1;
        margin: 0;
        border-radius: 12px;
        padding: 10px 12px;
        display: block;
        font-weight: 900;
        font-size: 13px;
        line-height: 1.65;
      }
      .image-upload-warning {
        color: #92400e;
        background: #fffbeb;
        border: 1px solid #fde68a;
      }
      .image-upload-error {
        color: #991b1b;
        background: #fef2f2;
        border: 1px solid #fecaca;
      }
      .image-upload-spin {
        animation: imageUploadSpin .8s linear infinite;
      }
      @keyframes imageUploadSpin {
        to { transform: rotate(360deg); }
      }
      .dark .image-upload-box,
      .dark .image-upload-empty {
        background: rgba(14, 36, 59, 0.78);
        border-color: rgba(74, 222, 228, 0.22);
      }
      .dark .image-upload-trigger,
      .dark .image-upload-actions button {
        color: #d9fbff;
        background: rgba(15, 36, 59, 0.92);
        border-color: rgba(74, 222, 228, 0.22);
      }
      .dark .image-upload-box small {
        color: #b8c7d9;
      }
      .dark .image-preview {
        background: rgba(7, 26, 46, 0.92);
        border-color: rgba(74, 222, 228, 0.18);
      }
      .dark .image-preview img {
        background: rgba(15, 36, 59, 0.92);
      }
      .dark .image-preview small {
        color: #9ff7f7;
      }
      .dark .image-upload-label {
        color: #dce8f5;
      }
    `}</style>
  );
}
