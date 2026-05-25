import { sumAmounts } from './financeData';

export const CHARITY_PROJECTS_TABLE = 'charity_projects';
export const CHARITY_DONATIONS_TABLE = 'charity_project_donations';
export const CHARITY_BENEFICIARIES_TABLE = 'charity_beneficiaries';

export function totalCharityDonations(rows: any[] = []) {
  return sumAmounts(rows, ['amount', 'donation_amount']);
}
