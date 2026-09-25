export const platformCopy = {
 ar: { loading: 'جارٍ التحميل…', error: 'تعذر إتمام الطلب. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.', retry: 'إعادة المحاولة', login: 'سجّل الدخول لاستخدام هذه الميزة.', save: 'حفظ', busy: 'جارٍ التنفيذ…', empty: 'لا توجد بيانات بعد.', remove: 'حذف', cancel: 'إلغاء', done: 'تم الحفظ.', more: 'عرض المزيد', refresh: 'تحديث' },
 en: { loading: 'Loading…', error: 'The request could not be completed. Check your connection and permissions, then retry.', retry: 'Retry', login: 'Sign in to use this feature.', save: 'Save', busy: 'Working…', empty: 'No records yet.', remove: 'Delete', cancel: 'Cancel', done: 'Saved.', more: 'Load more', refresh: 'Refresh' },
 fr: { loading: 'Chargement…', error: 'Impossible de terminer la demande. Vérifiez la connexion et vos droits, puis réessayez.', retry: 'Réessayer', login: 'Connectez-vous pour utiliser cette fonction.', save: 'Enregistrer', busy: 'En cours…', empty: 'Aucune donnée.', remove: 'Supprimer', cancel: 'Annuler', done: 'Enregistré.', more: 'Voir plus', refresh: 'Actualiser' },
};
export function platformLanguage(lang: string) { return lang === 'en' || lang === 'fr' ? lang : 'ar'; }
