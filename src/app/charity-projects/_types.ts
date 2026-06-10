// Types for charity-projects/page
export type Lang = 'ar' | 'en' | 'fr';
export type ProjectStatus = 'planning' | 'fundraising' | 'in_progress' | 'completed' | 'paused';
export type ProjectCategory = 'ongoing' | 'sponsorship' | 'zakat' | 'sacrifice' | 'endowment' | 'mosque' | 'water_well' | 'education' | 'relief' | 'other';
export type AssetType = 'cash' | 'savings' | 'investment' | 'gold' | 'silver' | 'non_zakat';
export type OrganizationType = 'charity' | 'zakat_house' | 'humanitarian' | 'waqf' | 'mosque' | 'education' | 'relief' | 'other';
export type VerificationStatus = 'verified' | 'pending_review' | 'unverified' | 'rejected';
export type CharityProjectsTab = 'overview' | 'projects' | 'beneficiaries' | 'contributors' | 'documents' | 'impact' | 'reports';

export type CharityProject = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  target_amount: number;
  collected_amount: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  organization_name: string | null;
  notes: string | null;
};

export type ZakatAsset = {
  id: string;
  asset_name: string;
  asset_type: AssetType;
  amount: number;
  currency: string;
  ownership_date: string | null;
  zakat_due_date: string | null;
  is_zakatable: boolean;
};

export type Commitment = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'annual' | 'once';
  next_due_date: string | null;
  category: ProjectCategory;
  status: string;
};

export type ProjectDonation = {
  id: string;
  project_id: string | null;
  organization_id?: string | null;
  amount: number;
  currency: string;
  donation_date: string | null;
  donation_type: string | null;
  notes: string | null;
  created_at: string | null;
};

export type CharityDocument = {
  id: string;
  user_id: string;
  project_id: string | null;
  donation_id: string | null;
  zakat_asset_id: string | null;
  commitment_id: string | null;
  title: string;
  category: DocumentCategory;
  file_url: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  notes: string | null;
  uploaded_at: string | null;
};

export type DocumentCategory = 'donation_receipt' | 'charity_certificate' | 'project_report' | 'zakat_document' | 'beneficiary_report' | 'other';
export type ReminderType = 'zakat' | 'hawl' | 'ramadan' | 'dhul_hijjah' | 'arafah' | 'sacrifice' | 'sponsorship' | 'project_milestone' | 'general';
export type ReminderStatus = 'active' | 'completed' | 'dismissed';
export type ReminderPriority = 'low' | 'normal' | 'high';
export type BeneficiaryCategory = 'orphan' | 'family' | 'student' | 'medical' | 'elderly' | 'refugee' | 'project_group' | 'other';
export type BeneficiaryStatus = 'active' | 'paused' | 'completed' | 'needs_review';
export type ContributorRole = 'owner' | 'contributor' | 'viewer';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'late' | 'cancelled';

export type CharityOrganization = {
  id: string;
  name_ar: string;
  name_en: string | null;
  name_fr: string | null;
  license_number: string | null;
  country: string | null;
  city: string | null;
  organization_type: OrganizationType;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  verification_status: VerificationStatus;
  transparency_score: number;
  efficiency_score: number;
  track_record_score: number;
  notes: string | null;
  data_source: string | null;
  is_active: boolean;
};

export type CharityImpactMetric = {
  id: string;
  user_id: string;
  project_id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  notes: string | null;
  created_at: string | null;
};

export type CharityReminder = {
  id: string;
  user_id: string;
  title: string;
  reminder_type: ReminderType;
  related_project_id: string | null;
  related_zakat_asset_id: string | null;
  related_commitment_id: string | null;
  due_date: string;
  hijri_date: string | null;
  remind_before_days: number;
  status: ReminderStatus;
  priority: ReminderPriority;
  notes: string | null;
};

export type MetalsPriceResponse = {
  success: boolean;
  source: 'api' | 'manual' | 'fallback';
  currency: 'KWD';
  gold: { pricePerGram: number; pricePerGram24k?: number; pricePerGram22k?: number; pricePerGram21k?: number; pricePerGram18k?: number; unit: 'gram' };
  silver: { pricePerGram: number; unit: 'gram' };
  updatedAt: string;
  message?: string;
};

export type ZakatCalculation = {
  id: string;
  calculation_date: string | null;
  currency: string;
  cash_amount: number;
  investment_amount: number;
  gold_value: number;
  silver_value: number;
  deductible_debts: number;
  net_zakat_base: number;
  nisab_method: string;
  gold_nisab_value: number;
  silver_nisab_value: number;
  selected_nisab_value: number;
  zakat_due: number;
  price_source: string | null;
  notes: string | null;
};

export type CharityBeneficiary = {
  id: string;
  user_id: string;
  project_id: string | null;
  reference_code: string | null;
  display_name: string;
  category: BeneficiaryCategory;
  organization_name: string | null;
  country: string | null;
  city: string | null;
  monthly_support_amount: number;
  currency: string;
  sponsorship_start_date: string | null;
  sponsorship_end_date: string | null;
  next_renewal_date: string | null;
  status: BeneficiaryStatus;
  notes: string | null;
};

export type CharityContributor = {
  id: string;
  user_id: string;
  project_id: string;
  contributor_name: string;
  contributor_email: string | null;
  role: ContributorRole;
  pledged_amount: number;
  paid_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  due_date: string | null;
  notes: string | null;
};
