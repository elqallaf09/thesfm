import type { Language } from './api';

const copy = {
  menu: ['القائمة', 'Menu', 'Menu'],
  account: ['حسابي', 'My account', 'Mon compte'],
  accountDetails: ['عدّل اسمك وصورتك وبيانات ملفك الشخصي من صفحة الحساب على هاتفك.', 'Update your name, photo and profile details on your phone’s account page.', 'Modifiez votre nom, votre photo et vos informations sur la page de votre compte, depuis votre téléphone.'],
  accountSignIn: ['سجّل الدخول بالحساب الذي تريد تعديله. إذا كنت مسجّلاً بالفعل، تأكد من أنه الحساب الصحيح.', 'Sign in to the account you want to edit. If you are already signed in, check that it is the right account.', 'Connectez-vous au compte à modifier. Si vous êtes déjà connecté, vérifiez qu’il s’agit du bon compte.'],
  accountScan: ['امسح الرمز بهاتفك أو افتح هذا العنوان.', 'Scan this code with your phone or open this address.', 'Scannez ce code avec votre téléphone ou ouvrez cette adresse.'],
} as const satisfies Record<string, readonly [string, string, string]>;

export function featureText(language: Language, key: keyof typeof copy) { return copy[key][language === 'ar' ? 0 : language === 'fr' ? 2 : 1]; }
