ALTER TABLE public.monthly_income_sources
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KWD',
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text,
ADD COLUMN IF NOT EXISTS attachment_type text,
ADD COLUMN IF NOT EXISTS attachment_size bigint,
ADD COLUMN IF NOT EXISTS exchange_rate numeric,
ADD COLUMN IF NOT EXISTS amount_kwd numeric;

CREATE INDEX IF NOT EXISTS monthly_income_sources_currency_idx
  ON public.monthly_income_sources (currency);

CREATE INDEX IF NOT EXISTS monthly_income_sources_attachment_url_idx
  ON public.monthly_income_sources (attachment_url)
  WHERE attachment_url IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'income-attachments',
  'income-attachments',
  true,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can read own income attachments" ON storage.objects;
CREATE POLICY "Users can read own income attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'income-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can upload own income attachments" ON storage.objects;
CREATE POLICY "Users can upload own income attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'income-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own income attachments" ON storage.objects;
CREATE POLICY "Users can update own income attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'income-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'income-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
