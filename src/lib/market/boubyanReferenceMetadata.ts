/** Official publication dates are distinct from THE SFM's source review date. */
export const BOUBYAN_REFERENCE = {
  id: 'boubyan-capital',
  name: 'Boubyan Capital',
  nameAr: 'بوبيان كابيتال',
  brokerageUrl: 'https://boubyancapital.com/ar/brokerage-ar/',
  reportingPeriod: 'Q2 2026',
  checkedAt: '2026-10-03T21:28:24.000Z',
  nextReviewAt: '2027-01-04T05:00:00.000Z',
  reviewIntervalMonths: 3,
  reviewTimezone: 'Asia/Kuwait',
  lists: [
    {
      id: 'kuwait',
      url: 'https://boubyancapital.com/media/filer_public/45/5f/455ff834-e011-4fa9-89b0-f05ee7f5d47b/kse-list-q2-2026.pdf',
      issuedAt: '2026-07-29',
      sha256: '73e76b0deb3ab79e09b4a33b316aba25eaa8372aa4bdd92f93f8f00532dd7a69',
      pages: 5,
      rowCount: 101,
    },
    {
      id: 'gcc',
      url: 'https://boubyancapital.com/media/filer_public/38/a7/38a7d683-14b6-4233-bdde-af812d4f69a0/gcc-list-q2-2026.pdf',
      issuedAt: '2026-07-29',
      sha256: 'f0d64c9fd5f366dbc6b3f0e1b0bb9a55243b5c3dc31f931282d98d99429b527c',
      pages: 26,
      rowCount: 558,
    },
    {
      id: 'usa',
      url: 'https://boubyancapital.com/media/filer_public/02/2c/022ce190-c020-4163-8dc7-0da726e48941/usa-tradinglist-q2-2026.pdf',
      issuedAt: '2026-08-01',
      sha256: 'ee626063fde8ffb68abd233e3dd108bd0d9b8f65eb36e80bdc5edfd80c5c0c7f',
      pages: 78,
      rowCount: 2623,
    },
  ],
} as const;

export type BoubyanListId = typeof BOUBYAN_REFERENCE.lists[number]['id'];

export const BOUBYAN_METHODOLOGY = {
  ar: 'قوائم الأسهم المتوافقة مع الشريعة المنشورة من بوبيان كابيتال والمعتمدة من هيئتها الشرعية',
  en: 'Boubyan Capital published Shariah-compliant trading lists approved by its Shariah board',
  fr: 'Listes de titres conformes à la charia publiées par Boubyan Capital et approuvées par son comité charia',
} as const;
