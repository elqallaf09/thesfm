import type { ShariaMethodology } from './types';

export const MSCI_ISLAMIC_INDEX_JULY_2025: ShariaMethodology = {
  id: 'msci-islamic-index-series-assets',
  version: '2025-07',
  name: 'MSCI Islamic Index Series — new security entry screen',
  nameAr: 'منهجية سلسلة مؤشرات MSCI الإسلامية — فحص دخول ورقة مالية جديدة',
  nameFr: 'Série d’indices islamiques MSCI — filtre d’entrée d’un nouveau titre',
  sourceDocument: {
    title: 'MSCI Islamic Index Series Methodology',
    publisher: 'MSCI Inc.',
    url: 'https://www.msci.com/documents/10199/11c651fc-44a0-2740-be99-2163f074fcce',
    versionDate: '2025-07-01',
  },
  businessRules: {
    prohibitedRevenueThreshold: 0.05,
    thresholdLabel: '5% من إجمالي الدخل كحد أقصى للأنشطة المحظورة مجتمعة',
    directActivityExclusions: [
      'alcohol',
      'tobacco_and_non_medical_cannabis',
      'pork',
      'conventional_financial_services',
      'defense_and_weapons',
      'gambling',
      'music',
      'hotels',
      'cinema_and_broadcasting',
      'adult_entertainment_and_online_dating',
    ],
    supportingKeywords: {
      alcohol: ['alcohol', 'brewery', 'breweries', 'beer', 'wine', 'spirits', 'distillery'],
      tobacco_and_non_medical_cannabis: ['tobacco', 'cigarette', 'nicotine', 'recreational cannabis'],
      pork: ['pork', 'swine', 'porcine meat'],
      conventional_financial_services: ['commercial bank', 'consumer lending', 'interest-based lending', 'conventional insurance', 'credit card issuer', 'mortgage lender'],
      defense_and_weapons: ['defense equipment', 'military weapons', 'missile systems', 'arms manufacturer'],
      gambling: ['casino', 'sports betting', 'lottery', 'gambling'],
      music: ['music publishing', 'musical instruments', 'radio broadcasting'],
      hotels: ['hotel operator', 'hotel ownership', 'hospitality properties'],
      cinema_and_broadcasting: ['movie production', 'cinema operator', 'television broadcasting', 'cable television'],
      adult_entertainment_and_online_dating: ['adult entertainment', 'online dating', 'matchmaking application'],
    },
    sourceSection: 'Sections 2.1 and 2.1.1, pages 4–6',
  },
  financialRatioRules: [
    {
      id: 'total-debt-to-assets',
      name: 'Total debt to total assets',
      nameAr: 'إجمالي الدين إلى إجمالي الأصول',
      nameFr: 'Dette totale sur actifs totaux',
      numeratorFields: ['interest_bearing_debt'],
      denominatorField: 'total_assets',
      operator: '<=',
      threshold: 0.30,
      thresholdLabel: '30% حد الدخول',
      unavailableBehavior: 'insufficient_data',
      sourceSection: 'Section 2.2.1, page 7',
    },
    {
      id: 'cash-interest-securities-to-assets',
      name: 'Cash and interest-bearing securities to total assets',
      nameAr: 'النقد والأوراق المالية ذات الفائدة إلى إجمالي الأصول',
      nameFr: 'Trésorerie et titres portant intérêt sur actifs totaux',
      numeratorFields: ['cash_and_equivalents', 'interest_bearing_securities'],
      denominatorField: 'total_assets',
      operator: '<=',
      threshold: 0.30,
      thresholdLabel: '30% حد الدخول',
      unavailableBehavior: 'insufficient_data',
      sourceSection: 'Section 2.2.1, page 7',
    },
    {
      id: 'receivables-cash-to-assets',
      name: 'Accounts receivable and cash to total assets',
      nameAr: 'الذمم المدينة والنقد إلى إجمالي الأصول',
      nameFr: 'Créances clients et trésorerie sur actifs totaux',
      numeratorFields: ['accounts_receivable', 'cash_and_equivalents'],
      denominatorField: 'total_assets',
      operator: '<=',
      threshold: 0.46,
      thresholdLabel: '46% حد الدخول',
      unavailableBehavior: 'insufficient_data',
      sourceSection: 'Section 2.2.1, page 7',
    },
  ],
  denominatorRules: 'تستخدم هذه النسخة إجمالي الأصول مقاماً. حدود 33.33% و70% تخص الاحتفاظ بمكونات قائمة، وليست حد دخول ورقة جديدة.',
  purificationGuidance: 'عند وجود دخل فوائد أو إيراد من نشاط محظور، تخصم النسبة المقابلة من التوزيعات وفق عامل تنقية التوزيعات في القسم 2.3.',
  freshnessMonths: 15,
  notes: [
    'لا يُعاد إنتاج تصنيف MSCI ولا يُدّعى الانضمام إلى أي مؤشر؛ يطبق النظام قواعد الوثيقة على الأدلة العامة المتاحة.',
    'تستبعد المنهجية المؤسسات المالية الإسلامية المستوفية لتعريف الملحق 3 من الفحص المعتاد، لكن النظام الآلي يحيلها للمراجعة ما لم تتوفر وثائق هيئة شرعية صريحة.',
    'غياب البيانات لا يعد اجتيازاً.',
  ],
};

export const SHARIA_METHODOLOGIES = [MSCI_ISLAMIC_INDEX_JULY_2025];

export function getMethodology(id?: string | null) {
  return SHARIA_METHODOLOGIES.find(methodology => methodology.id === id) ?? MSCI_ISLAMIC_INDEX_JULY_2025;
}
