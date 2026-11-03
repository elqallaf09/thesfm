import type { MobileLanguage } from '../../../src/lib/mobile/resourceContract';

export type Registration = {
  username: string; email: string; password: string; confirmation: string;
  termsAccepted: boolean; language: MobileLanguage;
};

// Same email syntax as the website, with a bounded provider payload.
export const validRegistrationEmail = (value: string) => value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Match the website minimum; the Auth provider remains the password-policy authority. */
export function registrationError(input: Registration) {
  if (!/^[\p{L}\p{N}_-]{3,50}$/u.test(input.username.trim())) return 'INVALID_USERNAME';
  if (!validRegistrationEmail(input.email)) return 'INVALID_EMAIL';
  if (input.password.trim().length < 6 || input.password.length > 1024) return 'INVALID_PASSWORD';
  if (input.password !== input.confirmation) return 'PASSWORD_MISMATCH';
  if (!input.termsAccepted) return 'TERMS_REQUIRED';
  return null;
}

export const registrationCopy = {
  ar: {
    title: 'إنشاء حساب جديد', body: 'ابدأ بحساب واحد للتمويل والاستثمار والأعمال.',
    username: 'اسم المستخدم', usernameHint: '3–50 حرفاً أو رقماً، والشرطة أو الشرطة السفلية',
    confirmation: 'تأكيد كلمة المرور', passwordHint: '6 أحرف على الأقل؛ كلمة أطول تزيد الأمان.',
    consent: 'أوافق على الشروط وسياسة الخصوصية', submit: 'إنشاء الحساب', busy: 'جارٍ إنشاء الحساب…',
    back: 'العودة لتسجيل الدخول', confirmTitle: 'تحقق من بريدك الإلكتروني',
    confirmBody: 'إذا كان البريد مؤهلاً للتسجيل، ستصلك رسالة تأكيد. افتح رابط التأكيد في بريدك، ثم عد إلى التطبيق وسجّل الدخول. تحقق أيضاً من الرسائل غير المرغوبة.',
    resend: 'إعادة إرسال رسالة التأكيد', resendWait: 'يمكنك إعادة الإرسال خلال', seconds: 'ثانية',
    resent: 'تم قبول طلب الإرسال. تحقق من بريدك الإلكتروني.',
    forgotTitle: 'استعادة كلمة المرور', forgotBody: 'أدخل بريدك لإرسال رابط آمن لتعيين كلمة مرور جديدة على موقع THE SFM.',
    sendReset: 'إرسال رابط الاستعادة', resetSent: 'إذا كان البريد مسجلاً، سنرسل رابط استعادة كلمة المرور. افتح الرابط ثم عد لتسجيل الدخول في التطبيق.',
    sending: 'جارٍ الإرسال…',
    errors: {
      INVALID_USERNAME: 'استخدم اسماً من 3 إلى 50 حرفاً أو رقماً، ويمكن إضافة الشرطة أو الشرطة السفلية.',
      INVALID_EMAIL: 'أدخل بريداً إلكترونياً صحيحاً.', INVALID_PASSWORD: 'استخدم كلمة مرور من 6 إلى 1024 حرفاً.',
      PASSWORD_MISMATCH: 'كلمتا المرور غير متطابقتين.', TERMS_REQUIRED: 'وافق على الشروط وسياسة الخصوصية للمتابعة.',
      WEAK_PASSWORD: 'اختر كلمة مرور أطول وفريدة تستوفي متطلبات الأمان.',
      RATE_LIMITED: 'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.',
      EMAIL_NOT_CONFIRMED: 'أكد بريدك الإلكتروني أولاً. يمكنك إعادة إرسال رسالة التأكيد.',
      SIGNUP_DISABLED: 'إنشاء الحسابات غير متاح حالياً. حاول لاحقاً.',
    },
  },
  en: {
    title: 'Create an account', body: 'One account for finance, investing, and business.',
    username: 'Username', usernameHint: '3–50 letters or numbers, hyphens or underscores',
    confirmation: 'Confirm password', passwordHint: 'At least 6 characters; a longer password improves security.',
    consent: 'I agree to the Terms and Privacy Policy', submit: 'Create account', busy: 'Creating account…',
    back: 'Back to sign in', confirmTitle: 'Check your email',
    confirmBody: 'If this email is eligible for registration, you will receive a confirmation email. Open its confirmation link, then return to the app and sign in. Check your spam folder too.',
    resend: 'Resend confirmation email', resendWait: 'You can resend in', seconds: 'seconds',
    resent: 'Email request accepted. Check your inbox.',
    forgotTitle: 'Recover password', forgotBody: 'Enter your email for a secure link to set a new password on the THE SFM website.',
    sendReset: 'Send reset link', resetSent: 'If this email is registered, we will send a password reset link. Open it, then return to sign in to the app.',
    sending: 'Sending…',
    errors: {
      INVALID_USERNAME: 'Use 3 to 50 letters or numbers, with hyphens or underscores if needed.',
      INVALID_EMAIL: 'Enter a valid email address.', INVALID_PASSWORD: 'Use a password of 6 to 1024 characters.',
      PASSWORD_MISMATCH: 'Passwords do not match.', TERMS_REQUIRED: 'Accept the Terms and Privacy Policy to continue.',
      WEAK_PASSWORD: 'Choose a longer, unique password that meets the security requirements.',
      RATE_LIMITED: 'Too many requests. Wait a little before trying again.',
      EMAIL_NOT_CONFIRMED: 'Confirm your email first. You can resend the confirmation email.',
      SIGNUP_DISABLED: 'Registration is unavailable right now. Please try later.',
    },
  },
  fr: {
    title: 'Créer un compte', body: 'Un compte pour vos finances, investissements et activités.',
    username: 'Nom d’utilisateur', usernameHint: '3–50 lettres ou chiffres, tirets ou traits de soulignement',
    confirmation: 'Confirmer le mot de passe', passwordHint: 'Au moins 6 caractères ; un mot de passe plus long améliore la sécurité.',
    consent: 'J’accepte les conditions et la politique de confidentialité', submit: 'Créer le compte', busy: 'Création du compte…',
    back: 'Retour à la connexion', confirmTitle: 'Vérifiez votre e-mail',
    confirmBody: 'Si cet e-mail peut être inscrit, vous recevrez un message de confirmation. Ouvrez son lien, puis revenez dans l’application pour vous connecter. Vérifiez aussi les spams.',
    resend: 'Renvoyer l’e-mail de confirmation', resendWait: 'Nouvel envoi possible dans', seconds: 'secondes',
    resent: 'Demande d’envoi acceptée. Vérifiez votre boîte de réception.',
    forgotTitle: 'Récupérer le mot de passe', forgotBody: 'Entrez votre e-mail pour recevoir un lien sécurisé et définir un nouveau mot de passe sur le site THE SFM.',
    sendReset: 'Envoyer le lien', resetSent: 'Si cet e-mail est enregistré, nous enverrons un lien de réinitialisation. Ouvrez-le, puis revenez vous connecter dans l’application.',
    sending: 'Envoi en cours…',
    errors: {
      INVALID_USERNAME: 'Utilisez 3 à 50 lettres ou chiffres, avec des tirets ou traits de soulignement si nécessaire.',
      INVALID_EMAIL: 'Entrez une adresse e-mail valide.', INVALID_PASSWORD: 'Utilisez un mot de passe de 6 à 1024 caractères.',
      PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas.', TERMS_REQUIRED: 'Acceptez les conditions et la politique de confidentialité.',
      WEAK_PASSWORD: 'Choisissez un mot de passe plus long et unique répondant aux exigences de sécurité.',
      RATE_LIMITED: 'Trop de demandes. Patientez avant de réessayer.',
      EMAIL_NOT_CONFIRMED: 'Confirmez d’abord votre e-mail. Vous pouvez renvoyer la confirmation.',
      SIGNUP_DISABLED: 'L’inscription est indisponible pour le moment. Réessayez plus tard.',
    },
  },
} as const;
