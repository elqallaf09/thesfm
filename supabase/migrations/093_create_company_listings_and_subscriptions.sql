CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  plan text NOT NULL,
  billing_interval text NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_plan_check CHECK (plan IN ('premium', 'company')),
  CONSTRAINT user_subscriptions_billing_interval_check CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly')),
  CONSTRAINT user_subscriptions_status_check CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'inactive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_plan_idx
  ON public.user_subscriptions(user_id, plan);

CREATE INDEX IF NOT EXISTS user_subscriptions_user_status_idx
  ON public.user_subscriptions(user_id, plan, status);

CREATE TABLE IF NOT EXISTS public.company_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  company_name text NOT NULL,
  category text NOT NULL,
  country text NULL,
  city text NULL,
  short_description text NULL,
  long_description text NULL,
  website_url text NULL,
  email text NULL,
  phone text NULL,
  whatsapp text NULL,
  linkedin_url text NULL,
  twitter_url text NULL,
  instagram_url text NULL,
  founded_year integer NULL,
  license_number text NULL,
  regulator_name text NULL,
  services jsonb NULL,
  logo_url text NULL,
  cover_image_url text NULL,
  status text NOT NULL DEFAULT 'pending_review',
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NULL,
  CONSTRAINT company_listings_category_check CHECK (category IN ('investment', 'trading', 'accounting', 'feasibility', 'financial_consulting')),
  CONSTRAINT company_listings_status_check CHECK (status IN ('pending_review', 'approved', 'rejected', 'inactive'))
);

CREATE INDEX IF NOT EXISTS company_listings_category_status_idx
  ON public.company_listings(category, status, created_at DESC);

CREATE INDEX IF NOT EXISTS company_listings_owner_idx
  ON public.company_listings(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_company_listing_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'approved' AND (OLD.approved_at IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.approved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_listings_set_updated_at ON public.company_listings;
CREATE TRIGGER company_listings_set_updated_at
  BEFORE UPDATE ON public.company_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_listing_updated_at();

CREATE OR REPLACE FUNCTION public.set_subscription_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_subscriptions_set_updated_at ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_set_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_subscription_updated_at();

ALTER TABLE public.company_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_listings' AND policyname = 'Public can read approved company listings'
  ) THEN
    CREATE POLICY "Public can read approved company listings"
      ON public.company_listings FOR SELECT
      USING (status = 'approved');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_listings' AND policyname = 'Owners can read own company listings'
  ) THEN
    CREATE POLICY "Owners can read own company listings"
      ON public.company_listings FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_listings' AND policyname = 'Owners can submit pending company listings'
  ) THEN
    CREATE POLICY "Owners can submit pending company listings"
      ON public.company_listings FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id AND status = 'pending_review');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_listings' AND policyname = 'Owners can update non-approved company listings'
  ) THEN
    CREATE POLICY "Owners can update non-approved company listings"
      ON public.company_listings FOR UPDATE TO authenticated
      USING (auth.uid() = user_id AND status <> 'approved')
      WITH CHECK (auth.uid() = user_id AND status <> 'approved');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_listings' AND policyname = 'Owners can delete non-approved company listings'
  ) THEN
    CREATE POLICY "Owners can delete non-approved company listings"
      ON public.company_listings FOR DELETE TO authenticated
      USING (auth.uid() = user_id AND status <> 'approved');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_subscriptions' AND policyname = 'Users can read own subscriptions'
  ) THEN
    CREATE POLICY "Users can read own subscriptions"
      ON public.user_subscriptions FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON public.company_listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_listings TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
