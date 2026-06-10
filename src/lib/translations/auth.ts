import type { Lang } from '../translations';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR_AUTH: Record<string, TranslationEntry> = {
  login_title: { ar:'المدير المالي الذكي', en:'Smart Financial Manager', fr:'Gestionnaire financier intelligent' },
  login_subtitle: { ar:'ادخل إلى لوحة THE SFM لإدارة دخلك ومصاريفك وأهدافك بوضوح.', en:'Sign in to THE SFM dashboard to manage income, expenses, and goals clearly.', fr:'Connectez-vous au tableau THE SFM pour gérer revenus, dépenses et objectifs.' },
  login_username: { ar:'اسم المستخدم', en:'Username', fr:"Nom d'utilisateur" },
  login_password: { ar:'كلمة المرور', en:'Password', fr:'Mot de passe' },
  login_confirm_password: { ar:'تأكيد كلمة المرور', en:'Confirm password', fr:'Confirmer le mot de passe' },
  login_sign_in: { ar:'تسجيل الدخول', en:'Sign in', fr:'Connexion' },
  login_signing_in: { ar:'جاري تسجيل الدخول...', en:'Signing in...', fr:'Connexion en cours...' },
  login_create_account: { ar:'إنشاء حساب', en:'Create account', fr:'Créer un compte' },
  login_switch_create: { ar:'إنشاء حساب جديد', en:'Create new account', fr:'Créer un nouveau compte' },
  login_switch_login: { ar:'لدي حساب بالفعل', en:'I already have an account', fr:"J'ai déjà un compte" },
  login_guest: { ar:'متابعة كضيف', en:'Continue as guest', fr:'Continuer en invité' },
  login_forgot: { ar:'نسيت كلمة المرور؟', en:'Forgot password?', fr:'Mot de passe oublié ?' },
  login_username_placeholder: { ar:'أدخل اسم المستخدم', en:'Enter username', fr:"Entrez le nom d'utilisateur" },
  login_password_placeholder: { ar:'أدخل كلمة المرور', en:'Enter password', fr:'Entrez le mot de passe' },
  login_error_empty: { ar:'أكمل كل الحقول المطلوبة.', en:'Complete all required fields.', fr:'Complétez tous les champs requis.' },
  login_error_short_username: { ar:'اسم المستخدم يجب أن يكون 3 أحرف على الأقل.', en:'Username must be at least 3 characters.', fr:"Le nom d'utilisateur doit contenir au moins 3 caractères." },
  login_error_short_password: { ar:'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', en:'Password must be at least 6 characters.', fr:'Le mot de passe doit contenir au moins 6 caractères.' },
  login_error_mismatch: { ar:'كلمتا المرور غير متطابقتين.', en:'Passwords do not match.', fr:'Les mots de passe ne correspondent pas.' },
  login_error_exists: { ar:'اسم المستخدم مستخدم بالفعل.', en:'This username is already taken.', fr:"Ce nom d'utilisateur est déjà utilisé." },
  login_error_failed: { ar:'اسم المستخدم أو كلمة المرور غير صحيحة.', en:'Username or password is incorrect.', fr:"Nom d'utilisateur ou mot de passe incorrect." },
  login_error_register: { ar:'تعذر إنشاء الحساب. حاول مرة أخرى.', en:'Could not create the account. Try again.', fr:'Impossible de créer le compte. Réessayez.' },
  login_reset_sent: { ar:'تم إرسال رابط استعادة كلمة المرور إن كان الحساب موجوداً.', en:'A reset link was sent if the account exists.', fr:'Un lien de réinitialisation a été envoyé si le compte existe.' },
};
