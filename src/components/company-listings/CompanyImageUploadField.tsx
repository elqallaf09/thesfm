'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';
import { ImagePlus, Loader2, RotateCcw, Trash2, UploadCloud } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useResolvedImageUrl } from '@/components/company-listings/useResolvedImageUrl';

type CompanyImageKind = 'logo' | 'cover';
type CompanyFormMode = 'create' | 'edit';

type CompanyImageUploadFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: CompanyImageKind;
  companyId?: string;
  mode?: CompanyFormMode;
  resetKey?: string | number;
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
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

export function CompanyImageUploadField({ label, value, onChange, kind, companyId, resetKey }: CompanyImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldId = useId();
  const { user } = useAuth();
  const { t } = useLanguage();
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
        uploadLabel: t('company_upload_logo'),
        hint: t('company_upload_logo_hint'),
        maxBytes: 2 * 1024 * 1024,
      };
    }
    return {
      uploadLabel: t('company_upload_cover'),
      hint: t('company_upload_cover_hint'),
      maxBytes: 5 * 1024 * 1024,
    };
  }, [kind, t]);

  useEffect(() => {
    setError('');
    setWarning('');
    setFailed(false);
    if (inputRef.current) inputRef.current.value = '';
  }, [resetKey, kind, setFailed]);

  async function handleFile(file: File | undefined) {
    setError('');
    setWarning('');
    if (!file) return;
    if (!user?.id) {
      setError(t('company_upload_auth_error'));
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('company_upload_type_error'));
      return;
    }
    if (file.size > copy.maxBytes) {
      setError(kind === 'logo' ? t('company_logo_size_error') : t('company_cover_size_error'));
      return;
    }

    try {
      const dimensions = await readImageDimensions(file);
      if (kind === 'logo') {
        const ratio = dimensions.width / dimensions.height;
        if (ratio < 0.82 || ratio > 1.22) setWarning(t('company_logo_ratio_warning'));
      } else if (dimensions.width <= dimensions.height || dimensions.width / dimensions.height < 2) {
        setWarning(t('company_cover_ratio_warning'));
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
      setError(t('company_upload_error'));
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
            <span>{uploading ? t('company_uploading_image') : copy.uploadLabel}</span>
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
                ? t('company_invalid_link')
                : loading
                  ? t('company_checking_image')
                  : failed
                    ? t('company_image_unavailable')
                    : t('company_image_preview')}
            </small>
            <div className="image-upload-actions">
              <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <RotateCcw size={14} />
                {t('company_replace_image')}
              </button>
              <button type="button" className="danger" onClick={() => onChange('')} disabled={uploading}>
                <Trash2 size={14} />
                {t('company_delete_image')}
              </button>
            </div>
          </div>
        ) : (
          <div className="image-upload-empty">
            <ImagePlus size={18} />
            <span>{t('company_drop_image')}</span>
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
        color: var(--foreground-secondary);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.5;
      }
      .image-upload-box,
      .image-upload-empty {
        position: relative;
        z-index: 0;
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
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
        border-radius: var(--radius-control);
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--primary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 14px;
        font: 600 13px/1.25 var(--font-ui);
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
        outline: 2px solid var(--focus-ring);
        outline-offset: 2px;
        border-color: var(--primary);
        background: var(--surface-hover);
        transform: translateY(-1px);
      }
      .image-upload-trigger:disabled,
      .image-upload-actions button:disabled {
        opacity: .65;
        cursor: not-allowed;
        transform: none;
      }
      .image-upload-box small {
        color: var(--foreground-muted);
        font-weight: 400;
        line-height: 1.6;
      }
      .image-preview {
        position: relative;
        z-index: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius-card);
        background: var(--surface-muted);
        padding: 10px;
        display: grid;
        gap: 10px;
        overflow: visible;
      }
      .image-preview img {
        width: 100%;
        max-height: 180px;
        border-radius: var(--radius-control);
        object-fit: contain;
        background: var(--surface);
      }
      .image-preview small {
        color: var(--accent-hover);
        font-weight: 500;
        line-height: 1.6;
      }
      .image-preview.invalid {
        border-color: color-mix(in srgb, var(--danger) 30%, transparent);
        background: var(--danger-soft);
      }
      .image-preview.invalid small {
        color: var(--danger);
      }
      .image-preview-loader {
        min-height: 52px;
        border-radius: var(--radius-control);
        display: grid;
        place-items: center;
        color: var(--accent-hover);
        background: var(--accent-soft);
        font-size: 24px;
        font-weight: 600;
        letter-spacing: 2px;
      }
      .image-upload-empty {
        min-height: 72px;
        place-items: center;
        color: var(--accent-hover);
        font-weight: 500;
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
        color: var(--danger);
        border-color: color-mix(in srgb, var(--danger) 28%, transparent);
        background: var(--danger-soft);
      }
      .image-upload-warning,
      .image-upload-error {
        position: relative;
        z-index: 1;
        margin: 0;
        border-radius: var(--radius-control);
        padding: 10px 12px;
        display: block;
        font-weight: 500;
        font-size: 13px;
        line-height: 1.65;
      }
      .image-upload-warning {
        color: var(--warning);
        background: var(--warning-soft);
        border: 1px solid color-mix(in srgb, var(--warning) 32%, transparent);
      }
      .image-upload-error {
        color: var(--danger);
        background: var(--danger-soft);
        border: 1px solid color-mix(in srgb, var(--danger) 32%, transparent);
      }
      .image-upload-spin {
        animation: imageUploadSpin .8s linear infinite;
      }
      @keyframes imageUploadSpin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  );
}
