import type { RiskLocale } from '@/lib/portfolio-risk/current';

export const HISTORY_IMPORT_COPY = {
  ar: {
    title: 'فحص ملف التاريخ المالي', description: 'اختر ملف JSON بصيغة SFM يحتوي على قيم المحفظة والتدفقات وتقويم تقييم مستقل. يُفحص مقابل استثمارات حسابك، ولا يُحفظ في هذا الفحص.',
    file: 'ملف التاريخ المالي (JSON، حتى 2 MB)', check: 'فحص الملف', checking: 'جارٍ فحص الملف…',
    pending: 'اكتمل فحص الاتساق — يحتاج مراجعة مستقلة للمصدر قبل اعتماده.',
    notice: 'هذا الفحص لا يثبت صحة المصدر، ولا يعتمد الملف، ولا يضيف نتائج مخاطر إلى محفظتك.',
    format: 'صيغة الملف غير مدعومة. استخدم ملف SFM دون حقول ملكية الحساب أو الاعتماد.',
    large: 'حجم الملف يتجاوز 2 MB.', source: 'أكمل مرجع مصدر القيم ومرجع التقويم المستقل وحقوق استخدامهما.',
    auth: 'سجّل الدخول لفحص ملفك.', period: 'الفترة', points: 'نقاط التقييم', positions: 'المراكز المطابقة', currency: 'العملة', fingerprint: 'بصمة الملف',
  },
  en: {
    title: 'Check a historical data file', description: 'Choose SFM-format JSON containing portfolio NAV, external flows and an independent valuation calendar. It is checked against your account investments and is not saved by this check.',
    file: 'Historical data file (JSON, up to 2 MB)', check: 'Check file', checking: 'Checking file…',
    pending: 'Consistency checks passed — independent source review is still required.',
    notice: 'This check does not authenticate or approve the source, or add risk results to your portfolio.',
    format: 'Unsupported file format. Use an SFM file without account ownership or approval fields.',
    large: 'The file exceeds 2 MB.', source: 'Provide separate NAV and calendar source references and their usage rights.',
    auth: 'Sign in to check your file.', period: 'Period', points: 'Valuation points', positions: 'Matched positions', currency: 'Currency', fingerprint: 'File fingerprint',
  },
  fr: {
    title: 'Vérifier un fichier historique', description: 'Choisissez un fichier JSON au format SFM avec valeurs liquidatives, flux externes et calendrier indépendant. Il est comparé aux investissements de votre compte et n’est pas enregistré par cette vérification.',
    file: 'Fichier historique (JSON, 2 MB maximum)', check: 'Vérifier le fichier', checking: 'Vérification…',
    pending: 'Cohérence validée — un examen indépendant de la source reste nécessaire.',
    notice: 'Cette vérification n’authentifie ni n’approuve la source et n’ajoute aucun résultat de risque au portefeuille.',
    format: 'Format non pris en charge. Utilisez un fichier SFM sans champs de propriétaire ou d’approbation.',
    large: 'Le fichier dépasse 2 MB.', source: 'Fournissez des références distinctes pour les valeurs et le calendrier ainsi que leurs droits d’utilisation.',
    auth: 'Connectez-vous pour vérifier votre fichier.', period: 'Période', points: 'Points de valorisation', positions: 'Positions rapprochées', currency: 'Devise', fingerprint: 'Empreinte du fichier',
  },
} satisfies Record<RiskLocale, Record<string, string>>;
