'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  Crown,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Trash2,
  User,
  WalletCards,
  X,
} from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { notifyCurrentUserProfileChanged } from '@/hooks/useCurrentUserProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { isEmail } from '@/lib/authSecurity';
import {
  accountActivityLabel,
  fetchAccountActivities,
  formatAccountActivityTimestamp,
  recordAccountActivity,
  type AccountActivityRow,
} from '@/lib/accountActivity';
import { useCurrency } from '@/lib/useCurrency';

type Lang = 'ar' | 'en' | 'fr';
type ThemeMode = 'light' | 'dark' | 'system';
type ModalKind = 'password' | 'email' | 'twoFactor' | 'devices' | 'delete' | 'subscription' | null;
type TextMap = Record<Lang, string>;

type ProfileState = {
  displayName: string;
  username: string;
  email: string;
  avatarUrl: string;
  phoneCode: string;
  phone: string;
  age: string;
  gender: string;
  country: string;
  city: string;
  profession: string;
  professionOther: string;
};

type PreferencesState = {
  language: Lang;
  theme: ThemeMode;
  currency: string;
  cycleStart: string;
  luxury: boolean;
  reports: boolean;
  expenses: boolean;
  investments: boolean;
  ai: boolean;
};

type EmailChangeState = {
  currentEmail: string;
  newEmail: string;
  confirmEmail: string;
  currentPassword: string;
};

type EmailTwoFactorState = {
  enabled: boolean;
  enabledAt: string;
  code: string;
  mode: 'idle' | 'enable' | 'disable';
  step: 'overview' | 'code';
  loading: boolean;
  message: string;
  error: string;
};

type AccountActivityState = {
  items: AccountActivityRow[];
  loading: boolean;
  error: string;
};

const STORE_KEY = 'sfm_settings';
const PROFILE_EXTRA_KEY = 'sfm_profile_extras';
const THEME_STORE_KEY = 'the-sfm-theme';

const txt = {
  title: { ar: 'الملف الشخصي', en: 'Profile', fr: 'Profil' },
  subtitle: { ar: 'إدارة بياناتك الشخصية وإعدادات حسابك', en: 'Manage your identity and account settings', fr: 'Gérez votre identité et les paramètres du compte' },
  identity: { ar: 'بطاقة الهوية الشخصية', en: 'Identity Card', fr: "Carte d'identité" },
  accountStats: { ar: 'إحصائيات الحساب', en: 'Account Statistics', fr: 'Statistiques du compte' },
  personalInfo: { ar: 'المعلومات الشخصية', en: 'Personal Information', fr: 'Informations personnelles' },
  security: { ar: 'الأمان وتسجيل الدخول', en: 'Security and Sign-in', fr: 'Sécurité et connexion' },
  preferences: { ar: 'التفضيلات الشخصية', en: 'Personal Preferences', fr: 'Préférences personnelles' },
  premium: { ar: 'العضوية والمميزات', en: 'Membership and Benefits', fr: 'Abonnement et avantages' },
  activity: { ar: 'نشاط الحساب', en: 'Account Activity', fr: 'Activité du compte' },
  danger: { ar: 'منطقة الخطر', en: 'Danger Zone', fr: 'Zone de danger' },
  premiumBadge: { ar: 'SFM Premium', en: 'SFM Premium', fr: 'SFM Premium' },
  elite: { ar: 'Elite Member', en: 'Elite Member', fr: 'Membre Elite' },
  completion: { ar: 'اكتمال الملف', en: 'Profile completion', fr: 'Profil complété' },
  lastUpdate: { ar: 'آخر تحديث: اليوم', en: 'Last update: today', fr: "Dernière mise à jour : aujourd'hui" },
  lastActivity: { ar: 'آخر نشاط: نشط الآن', en: 'Last activity: active now', fr: 'Dernière activité : actif' },
  selectedLanguage: { ar: 'اللغة المختارة', en: 'Selected language', fr: 'Langue sélectionnée' },
  editPhoto: { ar: 'تعديل الصورة', en: 'Edit photo', fr: 'Modifier la photo' },
  viewProfile: { ar: 'عرض الملف', en: 'View profile', fr: 'Voir le profil' },
  goals: { ar: 'الأهداف المالية', en: 'Financial goals', fr: 'Objectifs financiers' },
  investmentStatus: { ar: 'حالة الاستثمار', en: 'Investment status', fr: "Statut d'investissement" },
  active: { ar: 'نشط', en: 'Active', fr: 'Actif' },
  inactive: { ar: 'غير نشط', en: 'Inactive', fr: 'Inactif' },
  health: { ar: 'مستوى الصحة المالية', en: 'Financial health', fr: 'Santé financière' },
  fullName: { ar: 'الاسم الكامل', en: 'Full name', fr: 'Nom complet' },
  username: { ar: 'اسم المستخدم', en: 'Username', fr: "Nom d'utilisateur" },
  email: { ar: 'البريد الإلكتروني', en: 'Email', fr: 'E-mail' },
  emailAddress: { ar: 'البريد الإلكتروني', en: 'Email Address', fr: 'Adresse e-mail' },
  changeEmail: { ar: 'تغيير البريد الإلكتروني', en: 'Change Email', fr: 'Changer l’e-mail' },
  currentEmail: { ar: 'البريد الحالي', en: 'Current Email', fr: 'E-mail actuel' },
  newEmail: { ar: 'البريد الإلكتروني الجديد', en: 'New Email', fr: 'Nouvel e-mail' },
  confirmNewEmail: { ar: 'تأكيد البريد الإلكتروني الجديد', en: 'Confirm New Email', fr: 'Confirmer le nouvel e-mail' },
  sendConfirmationLink: { ar: 'إرسال رابط التأكيد', en: 'Send Confirmation Link', fr: 'Envoyer le lien de confirmation' },
  sendingConfirmationLink: { ar: 'جاري إرسال رابط التأكيد...', en: 'Sending confirmation link...', fr: 'Envoi du lien de confirmation...' },
  pendingConfirmation: { ar: 'البريد الجديد بانتظار التأكيد', en: 'New email pending confirmation', fr: 'Nouvel e-mail en attente de confirmation' },
  emailVerified: { ar: 'البريد الإلكتروني مؤكد', en: 'Email address verified', fr: 'Adresse e-mail vérifiée' },
  emailNotVerified: { ar: 'البريد الإلكتروني غير مؤكد', en: 'Email address not verified', fr: 'Adresse e-mail non vérifiée' },
  emailSecurityNote: { ar: 'لأمان حسابك، سنطلب كلمة المرور الحالية ونرسل رابط تأكيد إلى البريد الجديد.', en: 'For your security, we will ask for your current password and send a confirmation link to the new email address.', fr: 'Pour votre sécurité, nous demanderons votre mot de passe actuel et enverrons un lien de confirmation à la nouvelle adresse e-mail.' },
  invalidEmail: { ar: 'الرجاء إدخال بريد إلكتروني صحيح.', en: 'Please enter a valid email address.', fr: 'Veuillez saisir une adresse e-mail valide.' },
  emailMismatch: { ar: 'البريدان غير متطابقين.', en: 'Email addresses do not match.', fr: 'Les adresses e-mail ne correspondent pas.' },
  sameEmail: { ar: 'البريد الجديد يجب أن يكون مختلفاً عن البريد الحالي.', en: 'The new email must be different from the current email.', fr: 'Le nouvel e-mail doit être différent de l’e-mail actuel.' },
  currentPasswordRequired: { ar: 'الرجاء إدخال كلمة المرور الحالية.', en: 'Please enter your current password.', fr: 'Veuillez saisir votre mot de passe actuel.' },
  wrongCurrentPassword: { ar: 'كلمة المرور الحالية غير صحيحة.', en: 'Current password is incorrect.', fr: 'Le mot de passe actuel est incorrect.' },
  emailChangeSent: { ar: 'تم إرسال رابط تأكيد إلى البريد الإلكتروني الجديد. افتح بريدك وأكد التغيير لإكمال العملية.', en: 'A confirmation link has been sent to the new email address. Open your email and confirm the change to complete the process.', fr: 'Un lien de confirmation a été envoyé à la nouvelle adresse e-mail. Ouvrez votre e-mail et confirmez le changement.' },
  confirmationEmailSent: { ar: 'تم إرسال رابط التأكيد إلى بريدك الإلكتروني.', en: 'Confirmation link sent to your email.', fr: 'Le lien de confirmation a été envoyé à votre e-mail.' },
  resendEmailConfirmation: { ar: 'إعادة إرسال رابط تأكيد البريد', en: 'Resend email confirmation link', fr: 'Renvoyer le lien de confirmation' },
  resendingEmailConfirmation: { ar: 'جاري إرسال رابط تأكيد البريد...', en: 'Sending confirmation link...', fr: 'Envoi du lien de confirmation...' },
  emailConfirmationResendError: { ar: 'تعذر إرسال رابط التأكيد حالياً. حاول مرة أخرى.', en: 'Could not send the confirmation link right now. Please try again.', fr: 'Impossible d’envoyer le lien de confirmation pour le moment. Réessayez.' },
  emailVerifiedFor2fa: { ar: 'يمكنك الآن تفعيل التحقق عبر البريد الإلكتروني لحماية الحساب.', en: 'You can now enable email verification to protect the account.', fr: 'Vous pouvez maintenant activer la vérification par e-mail pour protéger le compte.' },
  emailUnverifiedFor2fa: { ar: 'أكد بريدك الإلكتروني أولاً حتى تتمكن من تفعيل المصادقة الثنائية.', en: 'Confirm your email first before enabling two-factor authentication.', fr: 'Confirmez d’abord votre e-mail avant d’activer l’authentification à deux facteurs.' },
  avatarUploadLoginRequired: { ar: 'يرجى تسجيل الدخول لتعديل الصورة.', en: 'Please sign in to edit your photo.', fr: 'Veuillez vous connecter pour modifier la photo.' },
  avatarUploadSuccess: { ar: 'تم تحديث الصورة بنجاح.', en: 'Profile photo updated successfully.', fr: 'La photo a été mise à jour avec succès.' },
  avatarUploadError: { ar: 'تعذر تحديث الصورة حالياً. حاول مرة أخرى.', en: 'Could not update the photo right now. Please try again.', fr: 'Impossible de mettre à jour la photo pour le moment. Réessayez.' },
  avatarUploadUnsupported: { ar: 'نوع الملف غير مدعوم. الرجاء رفع صورة JPG أو PNG أو WEBP.', en: 'Unsupported file type. Please upload a JPG, PNG, or WEBP image.', fr: 'Type de fichier non pris en charge. Importez une image JPG, PNG ou WEBP.' },
  avatarUploadTooLarge: { ar: 'حجم الصورة كبير جداً. الحد الأقصى 5MB.', en: 'The photo is too large. Maximum size is 5MB.', fr: 'La photo est trop volumineuse. Taille maximale : 5 Mo.' },
  avatarUploading: { ar: 'جاري رفع الصورة...', en: 'Uploading photo...', fr: 'Import de la photo...' },
  emailChangeError: { ar: 'تعذر تغيير البريد الإلكتروني حالياً. حاول مرة أخرى.', en: 'Could not change email right now. Please try again.', fr: 'Impossible de changer l’e-mail pour le moment. Réessayez.' },
  emailUseError: { ar: 'تعذر استخدام هذا البريد الإلكتروني. جرّب بريداً آخر أو حاول لاحقاً.', en: 'Could not use this email. Try another email or try again later.', fr: 'Impossible d’utiliser cet e-mail. Essayez une autre adresse ou réessayez plus tard.' },
  phone: { ar: 'رقم الهاتف', en: 'Phone number', fr: 'Téléphone' },
  phoneCode: { ar: 'رمز الدولة', en: 'Country code', fr: 'Indicatif' },
  age: { ar: 'العمر', en: 'Age', fr: 'Âge' },
  gender: { ar: 'الجنس', en: 'Gender', fr: 'Genre' },
  male: { ar: 'ذكر', en: 'Male', fr: 'Homme' },
  female: { ar: 'أنثى', en: 'Female', fr: 'Femme' },
  preferNotToSay: { ar: 'أفضل عدم الإفصاح', en: 'Prefer not to say', fr: 'Préfère ne pas répondre' },
  country: { ar: 'الدولة', en: 'Country', fr: 'Pays' },
  city: { ar: 'المدينة', en: 'City', fr: 'Ville' },
  profession: { ar: 'المهنة', en: 'Profession', fr: 'Profession' },
  preferredCurrency: { ar: 'العملة المفضلة', en: 'Preferred currency', fr: 'Devise préférée' },
  preferredLanguage: { ar: 'اللغة المفضلة', en: 'Preferred language', fr: 'Langue préférée' },
  selectGender: { ar: 'اختر الجنس', en: 'Select gender', fr: 'Sélectionner le genre' },
  selectProfession: { ar: 'اختر المهنة', en: 'Select profession', fr: 'Sélectionner la profession' },
  selectCountry: { ar: 'اختر الدولة', en: 'Select country', fr: 'Sélectionner le pays' },
  selectCity: { ar: 'اختر المدينة', en: 'Select city', fr: 'Sélectionner la ville' },
  enterPhone: { ar: 'أدخل رقم الهاتف', en: 'Enter phone number', fr: 'Saisir le numéro de téléphone' },
  phoneExample: { ar: 'مثال: 99999999', en: 'Example: 99999999', fr: 'Exemple : 99999999' },
  enterAge: { ar: 'أدخل العمر', en: 'Enter age', fr: "Saisir l'âge" },
  selectCurrency: { ar: 'اختر العملة', en: 'Select currency', fr: 'Sélectionner la devise' },
  other: { ar: 'أخرى', en: 'Other', fr: 'Autre' },
  enterProfession: { ar: 'اكتب المهنة', en: 'Enter profession', fr: 'Saisir la profession' },
  profileSaved: { ar: 'تم حفظ المعلومات الشخصية بنجاح.', en: 'Personal information saved successfully.', fr: 'Informations personnelles enregistrées avec succès.' },
  invalidAge: { ar: 'الرجاء إدخال عمر صحيح.', en: 'Please enter a valid age.', fr: 'Veuillez saisir un âge valide.' },
  invalidPhone: { ar: 'الرجاء إدخال رقم هاتف صحيح.', en: 'Please enter a valid phone number.', fr: 'Veuillez saisir un numéro de téléphone valide.' },
  savePersonal: { ar: 'حفظ المعلومات الشخصية', en: 'Save personal information', fr: 'Enregistrer les informations' },
  saved: { ar: 'تم الحفظ بنجاح', en: 'Saved successfully', fr: 'Enregistré avec succès' },
  saveError: { ar: 'تعذر حفظ المعلومات الشخصية، الرجاء المحاولة مرة أخرى.', en: 'Could not save personal information. Please try again.', fr: "Impossible d’enregistrer les informations personnelles. Veuillez réessayer." },
  changePassword: { ar: 'تغيير كلمة المرور', en: 'Change password', fr: 'Changer le mot de passe' },
  twoFactor: { ar: 'تفعيل المصادقة الثنائية', en: 'Enable two-factor authentication', fr: "Activer l'authentification à deux facteurs" },
  connectedDevices: { ar: 'الأجهزة المتصلة', en: 'Connected devices', fr: 'Appareils connectés' },
  lastLogin: { ar: 'آخر تسجيل دخول', en: 'Last login', fr: 'Dernière connexion' },
  signOutAll: { ar: 'تسجيل الخروج من كل الأجهزة', en: 'Sign out from all devices', fr: 'Se déconnecter de tous les appareils' },
  currentPassword: { ar: 'كلمة المرور الحالية', en: 'Current password', fr: 'Mot de passe actuel' },
  newPassword: { ar: 'كلمة المرور الجديدة', en: 'New password', fr: 'Nouveau mot de passe' },
  confirmPassword: { ar: 'تأكيد كلمة المرور الجديدة', en: 'Confirm new password', fr: 'Confirmer le nouveau mot de passe' },
  passwordMismatch: { ar: 'كلمتا المرور غير متطابقتين', en: 'Passwords do not match', fr: 'Les mots de passe ne correspondent pas' },
  passwordShort: { ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', en: 'Password must be at least 8 characters', fr: 'Le mot de passe doit contenir au moins 8 caractères' },
  passwordChanged: { ar: 'تم تغيير كلمة المرور', en: 'Password changed', fr: 'Mot de passe modifié' },
  twoFactorHint: { ar: 'المصادقة الثنائية تحتاج ربطها بنظام المصادقة.', en: 'Two-factor authentication needs to be connected to the auth system.', fr: "L'authentification à deux facteurs doit être reliée au système d'authentification." },
  twoFactorTitle: { ar: 'المصادقة الثنائية', en: 'Two-Factor Authentication', fr: 'Authentification à deux facteurs' },
  emailTwoFactor: { ar: 'التحقق عبر البريد الإلكتروني', en: 'Email Two-Factor Authentication', fr: 'Authentification à deux facteurs par e-mail' },
  emailTwoFactorDescription: { ar: 'عند تسجيل الدخول، سنرسل رمز تحقق إلى بريدك الإلكتروني قبل الدخول إلى الحساب.', en: 'When you sign in, we will send a verification code to your email before account access.', fr: 'Lors de la connexion, nous enverrons un code de vérification à votre e-mail avant l’accès au compte.' },
  emailTwoFactorSetup: { ar: 'فعّل التحقق عبر البريد الإلكتروني لحماية حسابك بطبقة إضافية.', en: 'Enable email verification to protect your account with an extra layer.', fr: 'Activez la vérification par e-mail pour protéger votre compte avec une couche supplémentaire.' },
  emailTwoFactorSecurity: { ar: 'المصادقة الثنائية تضيف طبقة حماية إضافية. حتى إذا عرف شخص كلمة المرور، سيحتاج رمز التحقق المرسل إلى بريدك.', en: 'Two-factor authentication adds an extra protection layer. Even if someone knows your password, they will need the code sent to your email.', fr: 'L’authentification à deux facteurs ajoute une couche de protection. Même si quelqu’un connaît votre mot de passe, il lui faudra le code envoyé à votre e-mail.' },
  enableEmailTwoFactor: { ar: 'تفعيل التحقق عبر البريد', en: 'Enable Email Verification', fr: 'Activer la vérification par e-mail' },
  disableEmailTwoFactor: { ar: 'إيقاف التحقق عبر البريد الإلكتروني', en: 'Disable Email Verification', fr: 'Désactiver la vérification par e-mail' },
  twoFactorEnabled: { ar: 'مفعل', en: 'Enabled', fr: 'Activé' },
  twoFactorDisabled: { ar: 'غير مفعل', en: 'Disabled', fr: 'Désactivé' },
  twoFactorLoading: { ar: 'جاري تحميل المصادقة الثنائية...', en: 'Loading two-factor authentication...', fr: 'Chargement de l’authentification à deux facteurs...' },
  twoFactorLoadError: { ar: 'تعذر تحميل إعدادات المصادقة الثنائية حالياً.', en: 'Could not load two-factor authentication settings right now.', fr: 'Impossible de charger les paramètres d’authentification à deux facteurs pour le moment.' },
  twoFactorNoEmail: { ar: 'لا يمكن تفعيل المصادقة الثنائية بدون بريد إلكتروني صالح.', en: 'Two-factor authentication requires a valid email address.', fr: 'L’authentification à deux facteurs nécessite une adresse e-mail valide.' },
  twoFactorEmailUnverified: { ar: 'لا يمكن تفعيل المصادقة الثنائية قبل تأكيد البريد الإلكتروني.', en: 'Confirm your email before enabling two-factor authentication.', fr: 'Confirmez votre e-mail avant d’activer l’authentification à deux facteurs.' },
  verificationCode: { ar: 'رمز التحقق', en: 'Verification Code', fr: 'Code de vérification' },
  verifyCode: { ar: 'تحقق', en: 'Verify', fr: 'Vérifier' },
  enterEmailTwoFactorCode: { ar: 'أدخل رمز التحقق المرسل إلى بريدك الإلكتروني.', en: 'Enter the code sent to your email.', fr: 'Saisissez le code envoyé à votre e-mail.' },
  sendCode: { ar: 'إرسال الرمز', en: 'Send Code', fr: 'Envoyer le code' },
  resendCode: { ar: 'إعادة إرسال الرمز', en: 'Resend Code', fr: 'Renvoyer le code' },
  sendingCode: { ar: 'جاري إرسال الرمز...', en: 'Sending code...', fr: 'Envoi du code...' },
  verifyingCode: { ar: 'جاري التحقق...', en: 'Verifying...', fr: 'Vérification...' },
  codeSent: { ar: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.', en: 'A verification code has been sent to your email.', fr: 'Un code de vérification a été envoyé à votre e-mail.' },
  invalidCode: { ar: 'رمز التحقق غير صحيح.', en: 'The verification code is incorrect.', fr: 'Le code de vérification est incorrect.' },
  codeExpired: { ar: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.', en: 'The code has expired. Request a new code.', fr: 'Le code a expiré. Demandez un nouveau code.' },
  codeInvalidOrExpired: { ar: 'رمز التحقق غير صحيح أو منتهي الصلاحية.', en: 'The verification code is incorrect or expired.', fr: 'Le code de vérification est incorrect ou expiré.' },
  emailTwoFactorEnabledSuccess: { ar: 'تم تفعيل التحقق عبر البريد الإلكتروني بنجاح.', en: 'Email two-factor authentication was enabled successfully.', fr: 'L’authentification à deux facteurs par e-mail a été activée.' },
  emailTwoFactorDisabledSuccess: { ar: 'تم إيقاف التحقق عبر البريد الإلكتروني.', en: 'Email two-factor authentication was disabled.', fr: 'L’authentification à deux facteurs par e-mail a été désactivée.' },
  lastEnabled: { ar: 'آخر تفعيل', en: 'Last enabled', fr: 'Dernière activation' },
  devicesHint: { ar: 'إدارة الأجهزة تحتاج ربط سجل الجلسات في نظام المصادقة.', en: 'Device management needs session history from the auth system.', fr: 'La gestion des appareils nécessite l’historique des sessions.' },
  language: { ar: 'اللغة', en: 'Language', fr: 'Langue' },
  theme: { ar: 'المظهر', en: 'Theme', fr: 'Thème' },
  light: { ar: 'فاتح', en: 'Light', fr: 'Clair' },
  dark: { ar: 'داكن', en: 'Dark', fr: 'Sombre' },
  system: { ar: 'النظام', en: 'System', fr: 'Système' },
  currency: { ar: 'العملة', en: 'Currency', fr: 'Devise' },
  cycleStart: { ar: 'بداية الشهر المالي', en: 'Financial month start', fr: 'Début du mois financier' },
  luxury: { ar: 'تفعيل اللمسة الفاخرة', en: 'Enable luxury accent', fr: 'Activer la touche luxe' },
  notifications: { ar: 'الإشعارات', en: 'Notifications', fr: 'Notifications' },
  reports: { ar: 'تذكير التقرير الشهري', en: 'Monthly report reminders', fr: 'Rappels du rapport mensuel' },
  expenseAlerts: { ar: 'تنبيهات المصروفات', en: 'Expense alerts', fr: 'Alertes dépenses' },
  investmentAlerts: { ar: 'تنبيهات الاستثمار', en: 'Investment alerts', fr: 'Alertes investissement' },
  aiAlerts: { ar: 'تنبيهات توصيات الذكاء الاصطناعي', en: 'AI recommendation alerts', fr: 'Alertes recommandations IA' },
  plan: { ar: 'خطة العضوية الحالية', en: 'Current membership plan', fr: 'Plan actuel' },
  startDate: { ar: 'تاريخ بداية الاشتراك', en: 'Subscription start', fr: 'Début de l’abonnement' },
  renewalDate: { ar: 'تاريخ التجديد', en: 'Renewal date', fr: 'Date de renouvellement' },
  manageSubscription: { ar: 'إدارة الاشتراك', en: 'Manage subscription', fr: "Gérer l'abonnement" },
  paymentNeeded: { ar: 'الدفع غير متاح حالياً. يرجى المحاولة لاحقاً.', en: 'Payments are not available right now. Please try again later.', fr: 'Le paiement est indisponible pour le moment. Veuillez réessayer plus tard.' },
  subscriptionPortalIntro: { ar: 'افتح بوابة Stripe لإدارة الخطة، طريقة الدفع، الفواتير، أو إلغاء الاشتراك.', en: 'Open the Stripe portal to manage your plan, payment method, invoices, or cancellation.', fr: 'Ouvrez le portail Stripe pour gérer votre formule, le moyen de paiement, les factures ou l’annulation.' },
  openSubscriptionPortal: { ar: 'فتح بوابة إدارة الاشتراك', en: 'Open subscription portal', fr: 'Ouvrir le portail d’abonnement' },
  openingSubscriptionPortal: { ar: 'جاري فتح إدارة الاشتراك...', en: 'Opening subscription portal...', fr: 'Ouverture du portail d’abonnement...' },
  subscriptionNoActive: { ar: 'لا يوجد اشتراك نشط لهذا الحساب حتى الآن.', en: 'There is no active subscription for this account yet.', fr: 'Aucun abonnement actif n’est associé à ce compte pour le moment.' },
  subscriptionPortalError: { ar: 'تعذر فتح إدارة الاشتراك. حاول مرة أخرى.', en: 'Could not open subscription management. Please try again.', fr: 'Impossible d’ouvrir la gestion de l’abonnement. Veuillez réessayer.' },
  exportData: { ar: 'تصدير نسخة من بياناتي قبل الحذف', en: 'Export my data before deletion', fr: 'Exporter mes données avant suppression' },
  deleteAccount: { ar: 'حذف الحساب', en: 'Delete account', fr: 'Supprimer le compte' },
  deleteHint: { ar: 'سيتم حذف حسابك وبياناتك المرتبطة نهائياً. لا يمكن التراجع عن هذا الإجراء.', en: 'Your account and related data will be permanently deleted. This action cannot be undone.', fr: 'Votre compte et les données associées seront définitivement supprimés. Cette action est irréversible.' },
  typeDelete: { ar: 'اكتب DELETE أو حذف لتفعيل زر الحذف النهائي', en: 'Type DELETE or حذف to enable final deletion', fr: 'Tapez DELETE ou حذف pour activer la suppression finale' },
  finalDelete: { ar: 'تأكيد الحذف النهائي', en: 'Confirm final deletion', fr: 'Confirmer la suppression finale' },
  deletingAccount: { ar: 'جاري حذف الحساب...', en: 'Deleting account...', fr: 'Suppression du compte...' },
  accountDeleted: { ar: 'تم حذف الحساب بنجاح', en: 'Account deleted successfully', fr: 'Compte supprimé avec succès' },
  accountDeleteError: { ar: 'تعذر حذف الحساب حالياً، الرجاء المحاولة مرة أخرى.', en: 'Could not delete the account right now. Please try again.', fr: 'Impossible de supprimer le compte pour le moment. Veuillez réessayer.' },
  cancel: { ar: 'إلغاء', en: 'Cancel', fr: 'Annuler' },
  close: { ar: 'إغلاق', en: 'Close', fr: 'Fermer' },
  open: { ar: 'فتح', en: 'Open', fr: 'Ouvrir' },
  enable: { ar: 'تفعيل', en: 'Enable', fr: 'Activer' },
  view: { ar: 'عرض', en: 'View', fr: 'Voir' },
  execute: { ar: 'تنفيذ', en: 'Run', fr: 'Exécuter' },
  themeChanged: { ar: 'تم تغيير المظهر بنجاح.', en: 'Appearance updated successfully.', fr: 'Apparence mise à jour avec succès.' },
  exportedReport: { ar: 'تم تصدير تقرير', en: 'Report exported', fr: 'Rapport exporté' },
  today: { ar: 'اليوم', en: 'Today', fr: "Aujourd'hui" },
  noActivity: { ar: 'لا يوجد نشاط مسجل حتى الآن.', en: 'No account activity recorded yet.', fr: 'Aucune activité du compte pour le moment.' },
  noActivityHelp: { ar: 'ستظهر هنا العمليات التي تنفذها داخل حسابك.', en: 'Actions you perform inside your account will appear here.', fr: 'Les actions effectuées dans votre compte apparaîtront ici.' },
  activityLoadError: { ar: 'تعذر تحميل نشاط الحساب.', en: 'Could not load account activity.', fr: 'Impossible de charger l’activité du compte.' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry', fr: 'Réessayer' },
  advancedAi: { ar: 'تحليلات AI متقدمة', en: 'Advanced AI analytics', fr: 'Analyses IA avancées' },
  smartAdvice: { ar: 'توصيات مالية ذكية', en: 'Smart financial recommendations', fr: 'Recommandations financières intelligentes' },
  pdf: { ar: 'تصدير PDF', en: 'PDF export', fr: 'Export PDF' },
  protection: { ar: 'حماية متقدمة', en: 'Advanced protection', fr: 'Protection avancée' },
  sync: { ar: 'مزامنة البيانات', en: 'Data sync', fr: 'Synchronisation des données' },
  unlimitedGoals: { ar: 'أهداف مالية غير محدودة', en: 'Unlimited financial goals', fr: 'Objectifs illimités' },
  monthlyReports: { ar: 'تقارير شهرية', en: 'Monthly reports', fr: 'Rapports mensuels' },
  prioritySupport: { ar: 'دعم أولوية', en: 'Priority support', fr: 'Support prioritaire' },
};

type ProfileOption = {
  value: string;
  labels: TextMap;
  search?: string;
  phoneCode?: string;
};

const genderOptions: ProfileOption[] = [
  { value: 'male', labels: { ar: 'ذكر', en: 'Male', fr: 'Homme' } },
  { value: 'female', labels: { ar: 'أنثى', en: 'Female', fr: 'Femme' } },
  { value: 'prefer_not_to_say', labels: { ar: 'أفضل عدم الإفصاح', en: 'Prefer not to say', fr: 'Préfère ne pas répondre' } },
];

const professionOptions: ProfileOption[] = [
  { value: 'student', labels: { ar: 'طالب', en: 'Student', fr: 'Étudiant' } },
  { value: 'government_employee', labels: { ar: 'موظف حكومي', en: 'Government employee', fr: 'Employé du secteur public' } },
  { value: 'private_employee', labels: { ar: 'موظف قطاع خاص', en: 'Private sector employee', fr: 'Employé du secteur privé' } },
  { value: 'business_owner', labels: { ar: 'صاحب عمل', en: 'Business owner', fr: "Chef d'entreprise" } },
  { value: 'entrepreneur', labels: { ar: 'رائد أعمال', en: 'Entrepreneur', fr: 'Entrepreneur' } },
  { value: 'investor', labels: { ar: 'مستثمر', en: 'Investor', fr: 'Investisseur' } },
  { value: 'accountant', labels: { ar: 'محاسب', en: 'Accountant', fr: 'Comptable' } },
  { value: 'financial_advisor', labels: { ar: 'مستشار مالي', en: 'Financial advisor', fr: 'Conseiller financier' } },
  { value: 'engineer', labels: { ar: 'مهندس', en: 'Engineer', fr: 'Ingénieur' } },
  { value: 'doctor', labels: { ar: 'طبيب', en: 'Doctor', fr: 'Médecin' } },
  { value: 'teacher', labels: { ar: 'معلم', en: 'Teacher', fr: 'Enseignant' } },
  { value: 'freelancer', labels: { ar: 'مستقل / فريلانسر', en: 'Freelancer', fr: 'Indépendant / freelance' } },
  { value: 'retired', labels: { ar: 'متقاعد', en: 'Retired', fr: 'Retraité' } },
  { value: 'unemployed', labels: { ar: 'غير موظف', en: 'Unemployed', fr: 'Sans emploi' } },
  { value: 'other', labels: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

const COUNTRY_LABEL_OVERRIDES: Record<string, TextMap> = {
  KW: { ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' },
  SA: { ar: 'السعودية', en: 'Saudi Arabia', fr: 'Arabie saoudite' },
  AE: { ar: 'الإمارات', en: 'UAE', fr: 'Émirats arabes unis' },
  QA: { ar: 'قطر', en: 'Qatar', fr: 'Qatar' },
  BH: { ar: 'البحرين', en: 'Bahrain', fr: 'Bahreïn' },
  OM: { ar: 'عُمان', en: 'Oman', fr: 'Oman' },
  PS: { ar: 'فلسطين', en: 'Palestine', fr: 'Palestine' },
};

const COUNTRY_DIAL_CODES: Array<readonly [code: string, phoneCode: string, aliases?: string]> = [
  ['KW', '+965', 'kuwait الكويت'],
  ['SA', '+966', 'saudi ksa السعودية'],
  ['AE', '+971', 'uae united arab emirates emirates الإمارات'],
  ['QA', '+974', 'qatar قطر'],
  ['BH', '+973', 'bahrain البحرين'],
  ['OM', '+968', 'oman عمان عُمان'],
  ['AF', '+93'],
  ['AL', '+355'],
  ['DZ', '+213'],
  ['AS', '+1-684'],
  ['AD', '+376'],
  ['AO', '+244'],
  ['AI', '+1-264'],
  ['AG', '+1-268'],
  ['AR', '+54'],
  ['AM', '+374'],
  ['AW', '+297'],
  ['AU', '+61'],
  ['AT', '+43'],
  ['AZ', '+994'],
  ['BS', '+1-242'],
  ['BD', '+880'],
  ['BB', '+1-246'],
  ['BY', '+375'],
  ['BE', '+32'],
  ['BZ', '+501'],
  ['BJ', '+229'],
  ['BM', '+1-441'],
  ['BT', '+975'],
  ['BO', '+591'],
  ['BA', '+387'],
  ['BW', '+267'],
  ['BR', '+55'],
  ['BN', '+673'],
  ['BG', '+359'],
  ['BF', '+226'],
  ['BI', '+257'],
  ['KH', '+855'],
  ['CM', '+237'],
  ['CA', '+1'],
  ['CV', '+238'],
  ['KY', '+1-345'],
  ['CF', '+236'],
  ['TD', '+235'],
  ['CL', '+56'],
  ['CN', '+86'],
  ['CO', '+57'],
  ['KM', '+269'],
  ['CG', '+242'],
  ['CD', '+243'],
  ['CK', '+682'],
  ['CR', '+506'],
  ['CI', '+225'],
  ['HR', '+385'],
  ['CU', '+53'],
  ['CW', '+599'],
  ['CY', '+357'],
  ['CZ', '+420'],
  ['DK', '+45'],
  ['DJ', '+253'],
  ['DM', '+1-767'],
  ['DO', '+1-809'],
  ['EC', '+593'],
  ['EG', '+20', 'egypt مصر'],
  ['SV', '+503'],
  ['GQ', '+240'],
  ['ER', '+291'],
  ['EE', '+372'],
  ['SZ', '+268'],
  ['ET', '+251'],
  ['FO', '+298'],
  ['FJ', '+679'],
  ['FI', '+358'],
  ['FR', '+33'],
  ['GF', '+594'],
  ['PF', '+689'],
  ['GA', '+241'],
  ['GM', '+220'],
  ['GE', '+995'],
  ['DE', '+49'],
  ['GH', '+233'],
  ['GI', '+350'],
  ['GR', '+30'],
  ['GL', '+299'],
  ['GD', '+1-473'],
  ['GP', '+590'],
  ['GU', '+1-671'],
  ['GT', '+502'],
  ['GG', '+44-1481'],
  ['GN', '+224'],
  ['GW', '+245'],
  ['GY', '+592'],
  ['HT', '+509'],
  ['HN', '+504'],
  ['HK', '+852'],
  ['HU', '+36'],
  ['IS', '+354'],
  ['IN', '+91'],
  ['ID', '+62'],
  ['IR', '+98'],
  ['IQ', '+964'],
  ['IE', '+353'],
  ['IM', '+44-1624'],
  ['IL', '+972'],
  ['IT', '+39'],
  ['JM', '+1-876'],
  ['JP', '+81'],
  ['JE', '+44-1534'],
  ['JO', '+962'],
  ['KZ', '+7'],
  ['KE', '+254'],
  ['KI', '+686'],
  ['XK', '+383', 'kosovo'],
  ['KR', '+82'],
  ['KG', '+996'],
  ['LA', '+856'],
  ['LV', '+371'],
  ['LB', '+961'],
  ['LS', '+266'],
  ['LR', '+231'],
  ['LY', '+218'],
  ['LI', '+423'],
  ['LT', '+370'],
  ['LU', '+352'],
  ['MO', '+853'],
  ['MG', '+261'],
  ['MW', '+265'],
  ['MY', '+60'],
  ['MV', '+960'],
  ['ML', '+223'],
  ['MT', '+356'],
  ['MH', '+692'],
  ['MQ', '+596'],
  ['MR', '+222'],
  ['MU', '+230'],
  ['YT', '+262'],
  ['MX', '+52'],
  ['FM', '+691'],
  ['MD', '+373'],
  ['MC', '+377'],
  ['MN', '+976'],
  ['ME', '+382'],
  ['MS', '+1-664'],
  ['MA', '+212', 'morocco المغرب'],
  ['MZ', '+258'],
  ['MM', '+95'],
  ['NA', '+264'],
  ['NR', '+674'],
  ['NP', '+977'],
  ['NL', '+31'],
  ['NC', '+687'],
  ['NZ', '+64'],
  ['NI', '+505'],
  ['NE', '+227'],
  ['NG', '+234'],
  ['NU', '+683'],
  ['KP', '+850'],
  ['MK', '+389'],
  ['MP', '+1-670'],
  ['NO', '+47'],
  ['PK', '+92'],
  ['PW', '+680'],
  ['PS', '+970', 'palestine فلسطين'],
  ['PA', '+507'],
  ['PG', '+675'],
  ['PY', '+595'],
  ['PE', '+51'],
  ['PH', '+63'],
  ['PL', '+48'],
  ['PT', '+351'],
  ['PR', '+1-787'],
  ['RE', '+262'],
  ['RO', '+40'],
  ['RU', '+7'],
  ['RW', '+250'],
  ['BL', '+590'],
  ['SH', '+290'],
  ['KN', '+1-869'],
  ['LC', '+1-758'],
  ['MF', '+590'],
  ['PM', '+508'],
  ['VC', '+1-784'],
  ['WS', '+685'],
  ['SM', '+378'],
  ['ST', '+239'],
  ['SN', '+221'],
  ['RS', '+381'],
  ['SC', '+248'],
  ['SL', '+232'],
  ['SG', '+65'],
  ['SX', '+1-721'],
  ['SK', '+421'],
  ['SI', '+386'],
  ['SB', '+677'],
  ['SO', '+252'],
  ['ZA', '+27'],
  ['SS', '+211'],
  ['ES', '+34'],
  ['LK', '+94'],
  ['SD', '+249'],
  ['SR', '+597'],
  ['SE', '+46'],
  ['CH', '+41'],
  ['SY', '+963'],
  ['TW', '+886'],
  ['TJ', '+992'],
  ['TZ', '+255'],
  ['TH', '+66'],
  ['TL', '+670'],
  ['TG', '+228'],
  ['TK', '+690'],
  ['TO', '+676'],
  ['TT', '+1-868'],
  ['TN', '+216'],
  ['TR', '+90'],
  ['TM', '+993'],
  ['TC', '+1-649'],
  ['TV', '+688'],
  ['UG', '+256'],
  ['UA', '+380'],
  ['GB', '+44'],
  ['US', '+1'],
  ['UY', '+598'],
  ['UZ', '+998'],
  ['VU', '+678'],
  ['VA', '+379'],
  ['VE', '+58'],
  ['VN', '+84'],
  ['VG', '+1-284'],
  ['VI', '+1-340'],
  ['WF', '+681'],
  ['YE', '+967'],
  ['ZM', '+260'],
  ['ZW', '+263'],
];

function countryName(code: string, lang: Lang) {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

function countryOption([value, phoneCode, aliases = '']: readonly [string, string, string?]): ProfileOption {
  const labels = COUNTRY_LABEL_OVERRIDES[value] ?? {
    ar: countryName(value, 'ar'),
    en: countryName(value, 'en'),
    fr: countryName(value, 'fr'),
  };
  return {
    value,
    labels,
    search: [value, phoneCode, aliases, labels.ar, labels.en, labels.fr].filter(Boolean).join(' '),
    phoneCode,
  };
}

const countryOptions: ProfileOption[] = [
  ...COUNTRY_DIAL_CODES.map(countryOption),
  { value: 'OTHER', labels: { ar: 'أخرى', en: 'Other', fr: 'Autre' }, search: 'other أخرى autre' },
];

const kuwaitCityOptions: ProfileOption[] = [
  { value: 'kuwait_city', labels: { ar: 'مدينة الكويت', en: 'Kuwait City', fr: 'Koweït Ville' } },
  { value: 'hawalli', labels: { ar: 'حولي', en: 'Hawalli', fr: 'Hawalli' } },
  { value: 'salmiya', labels: { ar: 'السالمية', en: 'Salmiya', fr: 'Salmiya' } },
  { value: 'jahra', labels: { ar: 'الجهراء', en: 'Jahra', fr: 'Jahra' } },
  { value: 'farwaniya', labels: { ar: 'الفروانية', en: 'Farwaniya', fr: 'Farwaniya' } },
  { value: 'ahmadi', labels: { ar: 'الأحمدي', en: 'Ahmadi', fr: 'Ahmadi' } },
  { value: 'mubarak_alkabeer', labels: { ar: 'مبارك الكبير', en: 'Mubarak Al-Kabeer', fr: 'Moubarak Al-Kabeer' } },
  { value: 'other', labels: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

const countryAlias: Record<string, string> = {
  kw: 'KW',
  kuwait: 'KW',
  'دولة الكويت': 'KW',
  الكويت: 'KW',
  sa: 'SA',
  'saudi arabia': 'SA',
  السعودية: 'SA',
  ksa: 'SA',
  ae: 'AE',
  'united arab emirates': 'AE',
  uae: 'AE',
  الإمارات: 'AE',
  emirates: 'AE',
  qa: 'QA',
  qatar: 'QA',
  قطر: 'QA',
  bh: 'BH',
  bahrain: 'BH',
  البحرين: 'BH',
  om: 'OM',
  oman: 'OM',
  عُمان: 'OM',
  عمان: 'OM',
  other: 'OTHER',
  أخرى: 'OTHER',
};

const phoneCodes = Array.from(new Set(countryOptions.map(option => option.phoneCode).filter((code): code is string => Boolean(code))))
  .sort((left, right) => Number(left.replace(/\D/g, '')) - Number(right.replace(/\D/g, '')));
function T(key: keyof typeof txt, lang: Lang) {
  return txt[key][lang] || txt[key].ar;
}

function optionLabel(option: ProfileOption | undefined, lang: Lang) {
  return option?.labels[lang] || option?.labels.en || option?.labels.ar || '';
}

function normalizeCountry(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  const direct = countryOptions.find(option => option.value === raw || option.value.toLowerCase() === normalized);
  if (direct) return direct.value;
  const byLabel = countryOptions.find(option => {
    const labels = [option.labels.ar, option.labels.en, option.labels.fr, option.search || ''];
    return labels.some(label => label.toLowerCase() === normalized);
  });
  if (byLabel) return byLabel.value;
  return countryAlias[normalized] || raw;
}

function phoneCodeForCountry(country: string) {
  return countryOptions.find(option => option.value === normalizeCountry(country))?.phoneCode || '';
}

function normalizeStoredCity(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return kuwaitCityOptions.find(option => option.value === raw || option.labels.en.toLowerCase() === raw.toLowerCase() || option.labels.ar === raw)?.value || raw;
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function stripUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => key !== 'user_id' && value !== undefined),
  ) as Partial<T>;
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeThemeMode(value: unknown): ThemeMode | undefined {
  return value === 'light' || value === 'dark' || value === 'system' ? value : undefined;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { lang, setLang, dir } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const activityUserIdRef = useRef('');
  const [profile, setProfile] = useState<ProfileState>({
    displayName: '',
    username: '',
    email: '',
    avatarUrl: '',
    phoneCode: '+965',
    phone: '',
    age: '',
    gender: '',
    country: '',
    city: '',
    profession: '',
    professionOther: '',
  });
  const [preferences, setPreferences] = useState<PreferencesState>({
    language: lang,
    theme: 'light',
    currency,
    cycleStart: new Date().toISOString().slice(0, 10),
    luxury: true,
    reports: true,
    expenses: true,
    investments: true,
    ai: true,
  });
  const [stats, setStats] = useState({ goals: 0, investments: 0, health: 78 });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [emailChange, setEmailChange] = useState<EmailChangeState>({ currentEmail: '', newEmail: '', confirmEmail: '', currentPassword: '' });
  const [changingEmail, setChangingEmail] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendingEmailConfirmation, setResendingEmailConfirmation] = useState(false);
  const [emailTwoFactor, setEmailTwoFactor] = useState<EmailTwoFactorState>({
    enabled: false,
    enabledAt: '',
    code: '',
    mode: 'idle',
    step: 'overview',
    loading: true,
    message: '',
    error: '',
  });
  const [deleteWord, setDeleteWord] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [subscriptionPortal, setSubscriptionPortal] = useState<{ loading: boolean; message: string; tone: 'info' | 'danger' }>({
    loading: false,
    message: '',
    tone: 'info',
  });
  const [accountActivity, setAccountActivity] = useState<AccountActivityState>({
    items: [],
    loading: false,
    error: '',
  });

  const L = (key: keyof typeof txt) => T(key, lang);
  const authUser = user as (typeof user & { new_email?: string | null; email_change_sent_at?: string | null }) | null;
  const currentAuthEmail = user?.email || profile.email;
  const emailVerified = Boolean(user?.email_confirmed_at);
  const canUseEmailTwoFactor = Boolean(
    user?.email &&
    isEmail(user.email) &&
    !user.email.toLowerCase().endsWith('@smart-finance.local') &&
    emailVerified,
  );

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, router, user]);

  useEffect(() => {
    const stored = readStored<Partial<PreferencesState>>(STORE_KEY, {});
    const storedTheme =
      normalizeThemeMode(typeof window !== 'undefined' ? localStorage.getItem(THEME_STORE_KEY) : null) ||
      normalizeThemeMode(typeof window !== 'undefined' ? localStorage.getItem('theme') : null) ||
      normalizeThemeMode(stored.theme) ||
      normalizeThemeMode(theme);
    setPreferences(prev => ({
      ...prev,
      ...stored,
      language: lang,
      theme: storedTheme || prev.theme,
      currency: stored.currency || currency,
      cycleStart: stored.cycleStart || prev.cycleStart,
    }));
    if (storedTheme && storedTheme !== theme) setTheme(storedTheme);
  }, [currency, lang, setTheme, theme]);

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    const extras = readStored<Record<string, Partial<ProfileState>>>(PROFILE_EXTRA_KEY, {});
    const db = supabase as any;
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[profile] Failed to load profile', error);
      setToast(T('saveError', lang));
      window.setTimeout(() => setToast(''), 2400);
      return;
    }

    const extra = extras[user.id] || {};
    const authEmail = user.email || String(data?.email || '');
    if (user.email && data?.email !== user.email) {
      const { error: emailSyncError } = await db
        .from('profiles')
        .update({ email: user.email, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (emailSyncError) console.error('[profile] Failed to sync auth email to profile', emailSyncError);
    }
    const normalizedCountry = normalizeCountry(data?.country || extra.country || '');
    const phoneCode = String(data?.phone_country_code || extra.phoneCode || phoneCodeForCountry(normalizedCountry) || '+965');
    setPendingEmail(String((user as { new_email?: string | null }).new_email || ''));
    setEmailTwoFactor(prev => ({
      ...prev,
      enabled: false,
      enabledAt: '',
      loading: false,
      error: '',
    }));
    setProfile({
      displayName: String(data?.display_name || user.user_metadata?.display_name || ''),
      username: String(data?.username || user.email?.split('@')[0] || ''),
      email: authEmail,
      avatarUrl: String(data?.avatar_url || user.user_metadata?.avatar_url || ''),
      phoneCode,
      phone: String(data?.phone_number || extra.phone || ''),
      age: data?.age ? String(data.age) : String(extra.age || ''),
      gender: String(data?.gender || extra.gender || ''),
      profession: String(data?.profession || extra.profession || ''),
      professionOther: String(data?.profession_other || extra.professionOther || ''),
      country: normalizedCountry,
      city: normalizeStoredCity(data?.city || extra.city || ''),
    });

    const savedCurrency = data?.preferred_currency || data?.default_currency || data?.currency;
    setPreferences(prev => ({
      ...prev,
      language: (data?.preferred_lang as Lang) || (data?.language as Lang) || prev.language,
      theme: (data?.preferred_theme as ThemeMode) || (data?.theme as ThemeMode) || prev.theme,
      currency: savedCurrency || prev.currency,
    }));

    const [goalRes, investRes] = await Promise.all([
      supabase.from('financial_goals').select('id').eq('user_id', user.id),
      supabase.from('investment_items').select('id').eq('user_id', user.id),
    ]);
    setStats({
      goals: goalRes.data?.length || 0,
      investments: investRes.data?.length || 0,
      health: Math.min(100, 62 + (goalRes.data?.length || 0) * 3 + (investRes.data?.length || 0) * 4),
    });
  }, [lang, user]);

  const loadAccountActivity = useCallback(async () => {
    if (!user?.id) {
      setAccountActivity({ items: [], loading: false, error: '' });
      return;
    }

    const requestedUserId = user.id;
    setAccountActivity({ items: [], loading: true, error: '' });
    try {
      const items = await fetchAccountActivities(supabase, 20);
      setAccountActivity(prev => {
        if (activityUserIdRef.current !== requestedUserId) return prev;
        return { items, loading: false, error: '' };
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[account-activity] profile fetch failed', {
          userId: requestedUserId,
          error,
        });
      }
      setAccountActivity(prev => {
        if (activityUserIdRef.current !== requestedUserId) return prev;
        return { items: [], loading: false, error: T('activityLoadError', lang) };
      });
    }
  }, [user?.id, lang]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    activityUserIdRef.current = user?.id || '';
    setAccountActivity({ items: [], loading: Boolean(user?.id), error: '' });
    if (!user?.id) return;
    void loadAccountActivity();
  }, [loadAccountActivity, user?.id]);

  const completion = useMemo(() => {
    const fields = [profile.displayName, profile.username, profile.email, profile.phone, profile.age, profile.gender, profile.country, profile.city, profile.profession];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);

  const initials = useMemo(() => {
    const base = profile.displayName || profile.username || 'SFM';
    return base.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  }, [profile.displayName, profile.username]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function recordProfileActivity(
    eventType: Parameters<typeof recordAccountActivity>[1]['eventType'],
    metadata: Record<string, unknown> = {},
  ) {
    if (!user?.id) return;
    void recordAccountActivity(supabase, {
      userId: user.id,
      eventType,
      entityType: 'profile',
      metadata,
    })
      .then(result => {
        if (!result.skipped) void loadAccountActivity();
      })
      .catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[account-activity] profile insert failed', {
            userId: user.id,
            eventType,
            error,
          });
        }
      });
  }

  function openAvatarPicker() {
    if (uploadingAvatar) return;
    if (!user?.id) {
      showToast(L('avatarUploadLoginRequired'));
      return;
    }
    avatarInputRef.current?.click();
  }

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = allowedTypes[file.type];
    if (!extension) {
      input.value = '';
      showToast(L('avatarUploadUnsupported'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      input.value = '';
      showToast(L('avatarUploadTooLarge'));
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const sessionUser = authData.user;
      if (authError || !sessionUser?.id) {
        showToast(L('avatarUploadLoginRequired'));
        return;
      }

      const now = new Date().toISOString();
      const filePath = `${sessionUser.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl;
      if (!avatarUrl) throw new Error('Avatar URL missing');

      const db = supabase as any;
      let profileUpdate = await db
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: now })
        .eq('id', sessionUser.id)
        .select('id')
        .maybeSingle();

      if (profileUpdate.error) throw profileUpdate.error;

      if (!profileUpdate.data) {
        profileUpdate = await db
          .from('profiles')
          .upsert({
            id: sessionUser.id,
            username: profile.username || sessionUser.email?.split('@')[0] || 'sfm-user',
            display_name: profile.displayName || sessionUser.user_metadata?.display_name || null,
            email: sessionUser.email || profile.email || null,
            avatar_url: avatarUrl,
            updated_at: now,
          }, { onConflict: 'id' })
          .select('id')
          .maybeSingle();
        if (profileUpdate.error) throw profileUpdate.error;
      }

      await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
      setProfile(prev => ({ ...prev, avatarUrl }));
      notifyCurrentUserProfileChanged({
        userId: sessionUser.id,
        authEmail: sessionUser.email,
        profile: { avatar_url: avatarUrl },
      });
      router.refresh();
      showToast(L('avatarUploadSuccess'));
      recordProfileActivity('profile_updated', {
        fields: ['avatar_url'],
      });
    } catch (error) {
      console.error('[Profile] Avatar upload failed', error);
      showToast(L('avatarUploadError'));
    } finally {
      input.value = '';
      setUploadingAvatar(false);
    }
  }

  function persistPreferences(next: PreferencesState) {
    const themeChanged = next.theme !== preferences.theme;
    const languageChanged = next.language !== preferences.language;
    setPreferences(next);
    setLang(next.language);
    setCurrency(next.currency);
    setTheme(next.theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORE_KEY, next.theme);
      localStorage.setItem('theme', next.theme);
    }
    writeStored(STORE_KEY, next);
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('sfm-luxury', next.luxury);
    if (languageChanged) {
      recordProfileActivity('language_changed', {
        from: preferences.language,
        to: next.language,
      });
    }
    showToast(themeChanged ? L('themeChanged') : L('saved'));
  }

  async function saveProfile() {
    if (!user?.id) return;
    setSaving(true);
    const displayName = profile.displayName.trim();
    const username = profile.username.trim();
    const ageValue = profile.age.trim() ? Number(profile.age) : null;
    const phoneValue = profile.phone.trim();
    if (ageValue !== null && (!Number.isFinite(ageValue) || ageValue < 13 || ageValue > 100)) {
      setSaving(false);
      showToast(L('invalidAge'));
      return;
    }
    if (phoneValue && !/^[0-9+\-\s()]{5,20}$/.test(phoneValue)) {
      setSaving(false);
      showToast(L('invalidPhone'));
      return;
    }
    const now = new Date().toISOString();
    const payload = stripUndefined({
      username,
      display_name: displayName,
      email: user.email || profile.email,
      age: ageValue,
      phone_country_code: profile.phoneCode,
      phone_number: cleanOptional(profile.phone),
      profession: cleanOptional(profile.profession),
      gender: cleanOptional(profile.gender),
      country: cleanOptional(profile.country),
      preferred_lang: preferences.language,
      language: preferences.language,
      preferred_currency: preferences.currency || 'KWD',
      currency: preferences.currency || 'KWD',
      preferred_theme: preferences.theme,
      theme: preferences.theme,
      default_currency: preferences.currency || 'KWD',
      city: cleanOptional(profile.city),
      profession_other: profile.profession === 'other' ? cleanOptional(profile.professionOther) : null,
      updated_at: now,
    });
    const upsertPayload = {
      id: user.id,
      ...payload,
    };
    const minimalPayload = stripUndefined({
      username,
      display_name: displayName,
      email: user.email || profile.email,
      profession: cleanOptional(profile.profession),
      updated_at: now,
    });
    const minimalUpsertPayload = {
      id: user.id,
      ...minimalPayload,
    };
    const isSchemaCacheColumnError = (error: unknown) => {
      if (!error || typeof error !== 'object') return false;
      const supabaseError = error as { code?: string; message?: string; details?: string; hint?: string };
      const text = `${supabaseError.message || ''} ${supabaseError.details || ''} ${supabaseError.hint || ''}`.toLowerCase();
      return supabaseError.code === 'PGRST204' || (text.includes('schema cache') && text.includes('column'));
    };
    const logProfileSaveError = (error: unknown, failedPayload: Record<string, unknown>) => {
      if (process.env.NODE_ENV !== 'development') return;
      const supabaseError = error && typeof error === 'object'
        ? error as { code?: string; message?: string; details?: string; hint?: string }
        : {};
      console.error('[Profile] Failed to save profile', {
        code: supabaseError.code,
        message: supabaseError.message,
        details: supabaseError.details,
        hint: supabaseError.hint,
        payload: failedPayload,
      });
    };

    const db = supabase as any;
    let saveError: unknown = null;
    let savedProfile = false;
    let updateResult = await db
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select('id')
      .maybeSingle();

    if (updateResult.error) {
      saveError = updateResult.error;
      logProfileSaveError(updateResult.error, payload);
      if (isSchemaCacheColumnError(updateResult.error)) {
        updateResult = await db
          .from('profiles')
          .update(minimalPayload)
          .eq('id', user.id)
          .select('id')
          .maybeSingle();
        if (updateResult.error) {
          saveError = updateResult.error;
          logProfileSaveError(updateResult.error, minimalPayload);
        } else {
          saveError = null;
        }
      }
    }
    if (!saveError && updateResult.data) savedProfile = true;

    if (!saveError && !savedProfile) {
      let upsertResult = await db
        .from('profiles')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select('id')
        .maybeSingle();
      if (upsertResult.error) {
        saveError = upsertResult.error;
        logProfileSaveError(upsertResult.error, upsertPayload);
        if (isSchemaCacheColumnError(upsertResult.error)) {
          upsertResult = await db
            .from('profiles')
            .upsert(minimalUpsertPayload, { onConflict: 'id' })
            .select('id')
            .maybeSingle();
          if (upsertResult.error) {
            saveError = upsertResult.error;
            logProfileSaveError(upsertResult.error, minimalUpsertPayload);
          } else {
            saveError = null;
            savedProfile = true;
          }
        }
      } else {
        savedProfile = true;
      }
    }

    if (saveError) {
      setSaving(false);
      showToast(L('saveError'));
      return;
    }
    const extras = readStored<Record<string, Partial<ProfileState>>>(PROFILE_EXTRA_KEY, {});
    writeStored(PROFILE_EXTRA_KEY, { ...extras, [user.id]: { country: profile.country, city: profile.city, professionOther: profile.professionOther } });
    if (!saveError) {
      const { data: authData } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          full_name: displayName,
          username,
        },
      });
      const authEmail = authData.user?.email || user.email || profile.email;
      notifyCurrentUserProfileChanged({
        userId: user.id,
        authEmail,
        profile: {
          display_name: displayName,
          username,
          email: authEmail,
          default_currency: preferences.currency || 'KWD',
          country: cleanOptional(profile.country),
        },
      });
      router.refresh();
      await loadProfileData();
      recordProfileActivity('profile_updated', {
        fields: ['display_name', 'username', 'preferences'],
      });
    }
    setSaving(false);
    showToast(L('profileSaved'));
  }

  async function changePassword() {
    if (!passwords.current) return showToast(L('currentPassword'));
    if (passwords.next.length < 8) return showToast(L('passwordShort'));
    if (passwords.next !== passwords.confirm) return showToast(L('passwordMismatch'));
    const { error } = await supabase.auth.updateUser({ password: passwords.next });
    if (error) showToast(error.message);
    else {
      setPasswords({ current: '', next: '', confirm: '' });
      setModal(null);
      showToast(L('passwordChanged'));
    }
  }

  async function changeEmail() {
    if (!user) return;
    const currentEmail = (currentAuthEmail || '').trim().toLowerCase();
    const newEmail = emailChange.newEmail.trim().toLowerCase();
    const confirmEmail = emailChange.confirmEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return showToast(L('invalidEmail'));
    if (newEmail !== confirmEmail) return showToast(L('emailMismatch'));
    if (newEmail === currentEmail) return showToast(L('sameEmail'));
    if (!emailChange.currentPassword) return showToast(L('currentPasswordRequired'));
    if (!currentEmail) return showToast(L('emailChangeError'));

    setChangingEmail(true);
    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: emailChange.currentPassword,
    });
    if (passwordError) {
      setChangingEmail(false);
      showToast(L('wrongCurrentPassword'));
      return;
    }

    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/profile` },
    );
    setChangingEmail(false);
    if (error) {
      showToast(L('emailUseError'));
      return;
    }
    setPendingEmail(newEmail);
    setEmailChange({ currentEmail, newEmail: '', confirmEmail: '', currentPassword: '' });
    setShowEmailPassword(false);
    setModal(null);
    showToast(L('emailChangeSent'));
  }

  async function signOutEverywhere() {
    await supabase.auth.signOut({ scope: 'global' });
    await signOut();
    router.push('/login');
  }

  async function deleteAccount() {
    if (deletingAccount || (deleteWord !== 'DELETE' && deleteWord !== 'حذف')) return;
    setDeletingAccount(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw sessionError || new Error('Missing authenticated session');

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error || 'delete_failed');

      showToast(L('accountDeleted'));
      await supabase.auth.signOut({ scope: 'global' }).catch(() => undefined);
      await signOut().catch(() => undefined);
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
      window.setTimeout(() => router.replace('/login'), 500);
    } catch (error) {
      console.error('[Profile] Account deletion failed', error);
      showToast(L('accountDeleteError'));
      setDeletingAccount(false);
    }
  }

  function openEmailModal() {
    const currentEmail = currentAuthEmail || '';
    setEmailChange({ currentEmail, newEmail: '', confirmEmail: '', currentPassword: '' });
    setShowEmailPassword(false);
    setModal('email');
  }

  function openTwoFactorModal() {
    setEmailTwoFactor(prev => ({
      ...prev,
      code: '',
      mode: 'idle',
      step: 'overview',
      message: '',
      error: '',
      loading: false,
    }));
    setModal('twoFactor');
  }

  function openSubscriptionModal() {
    setSubscriptionPortal({ loading: false, message: '', tone: 'info' });
    setModal('subscription');
    void openSubscriptionPortal();
  }

  async function openSubscriptionPortal() {
    if (subscriptionPortal.loading) return;
    setSubscriptionPortal({ loading: true, message: '', tone: 'info' });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (sessionData.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers,
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; url?: string; code?: string; message?: string } | null;

      if (response.ok && result?.ok && result.url) {
        window.location.assign(result.url);
        return;
      }

      const message = result?.message || (result?.code === 'NO_ACTIVE_SUBSCRIPTION' ? L('subscriptionNoActive') : L('subscriptionPortalError'));
      setSubscriptionPortal({
        loading: false,
        message,
        tone: result?.code === 'NO_ACTIVE_SUBSCRIPTION' ? 'info' : 'danger',
      });
    } catch (error) {
      console.error('[profile] Failed to open subscription portal', error);
      setSubscriptionPortal({ loading: false, message: L('subscriptionPortalError'), tone: 'danger' });
    }
  }

  async function resendEmailConfirmation() {
    const email = user?.email?.trim();
    if (!email || !isEmail(email)) {
      setEmailTwoFactor(prev => ({ ...prev, error: L('twoFactorNoEmail'), message: '' }));
      return;
    }

    setResendingEmailConfirmation(true);
    setEmailTwoFactor(prev => ({ ...prev, error: '', message: '' }));

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setEmailTwoFactor(prev => ({ ...prev, error: L('emailConfirmationResendError'), message: '' }));
        return;
      }

      setEmailTwoFactor(prev => ({ ...prev, error: '', message: L('confirmationEmailSent') }));
      showToast(L('confirmationEmailSent'));
    } catch {
      setEmailTwoFactor(prev => ({ ...prev, error: L('emailConfirmationResendError'), message: '' }));
    } finally {
      setResendingEmailConfirmation(false);
    }
  }

  async function sendEmailTwoFactorCode(mode: 'enable' | 'disable') {
    if (!user?.email || !isEmail(user.email) || user.email.toLowerCase().endsWith('@smart-finance.local')) {
      setEmailTwoFactor(prev => ({ ...prev, error: L('twoFactorNoEmail'), message: '' }));
      return;
    }
    if (!emailVerified) {
      setEmailTwoFactor(prev => ({ ...prev, error: L('twoFactorEmailUnverified'), message: '' }));
      return;
    }

    setEmailTwoFactor(prev => ({ ...prev, loading: true, mode, error: '', message: '' }));
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });

    setEmailTwoFactor(prev => ({
      ...prev,
      loading: false,
      step: error ? prev.step : 'code',
      mode: error ? prev.mode : mode,
      code: '',
      message: error ? '' : L('codeSent'),
      error: error ? L('twoFactorLoadError') : '',
    }));
  }

  async function verifyEmailTwoFactorCode() {
    if (!user?.email || !emailTwoFactor.code.trim()) return;
    const action = emailTwoFactor.mode;
    if (action !== 'enable' && action !== 'disable') return;

    setEmailTwoFactor(prev => ({ ...prev, loading: true, error: '', message: '' }));
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: user.email,
      token: emailTwoFactor.code.trim(),
      type: 'email',
    });

    if (verifyError) {
      setEmailTwoFactor(prev => ({
        ...prev,
        loading: false,
        error: verifyError.message.toLowerCase().includes('expired') ? L('codeExpired') : L('codeInvalidOrExpired'),
      }));
      return;
    }

    const enabled = action === 'enable';
    const enabledAt = enabled ? new Date().toISOString() : null;
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        email_2fa_enabled: enabled,
        email_2fa_enabled_at: enabledAt,
      })
      .eq('id', user.id);

    if (profileError) {
      setEmailTwoFactor(prev => ({ ...prev, loading: false, error: L('twoFactorLoadError') }));
      return;
    }

    setEmailTwoFactor(prev => ({
      ...prev,
      enabled,
      enabledAt: enabledAt || '',
      code: '',
      mode: 'idle',
      step: 'overview',
      loading: false,
      message: '',
      error: '',
    }));
    setModal(null);
    showToast(enabled ? L('emailTwoFactorEnabledSuccess') : L('emailTwoFactorDisabledSuccess'));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ profile, preferences, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'the-sfm-profile-data.json';
    a.click();
    URL.revokeObjectURL(url);
    recordProfileActivity('report_exported', {
      export_type: 'profile_json',
      source: 'profile',
    });
    showToast(L('exportedReport'));
  }

  if (loading) {
    return <div className="profile-loading">...</div>;
  }

  return (
    <div className="profile-page" dir={dir}>
      <Sidebar />
      <main className="profile-main">
        <header className="profile-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image src="/sfm-logo.png" alt="THE SFM" width={42} height={42} priority className="sfm-brand-mark sfm-brand-mark--mobile" />
            <div>
              <span>THE SFM</span>
              <h1>{L('title')}</h1>
              <p>{L('subtitle')}</p>
            </div>
          </div>
        </header>

        <section className="profile-layout">
          <ProfileHeroCard
            initials={initials}
            name={profile.displayName || 'THE SFM'}
            username={profile.username}
            avatarUrl={profile.avatarUrl}
            completion={completion}
            language={lang.toUpperCase()}
            uploadingAvatar={uploadingAvatar}
            labels={{ premium: L('premiumBadge'), elite: L('elite'), completion: L('completion'), lastActivity: L('lastActivity'), selectedLanguage: L('selectedLanguage'), editPhoto: L('editPhoto'), uploadingPhoto: L('avatarUploading'), viewProfile: L('viewProfile') }}
            onEditPhoto={openAvatarPicker}
            onView={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
          <input
            ref={avatarInputRef}
            className="avatar-upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={event => void handleAvatarFileChange(event)}
            aria-label={L('editPhoto')}
          />
          <ProfileStatsCards
            labels={{ goals: L('goals'), investmentStatus: L('investmentStatus'), completion: L('completion'), health: L('health'), active: L('active'), inactive: L('inactive') }}
            stats={{ goals: stats.goals, investments: stats.investments, completion, health: stats.health }}
          />
        </section>

        <PersonalInfoForm lang={lang} profile={profile} setProfile={setProfile} preferences={preferences} setPreferences={next => persistPreferences(next)} saving={saving} labels={{
          title: L('personalInfo'), fullName: L('fullName'), username: L('username'), email: L('email'), phone: L('phone'), phoneCode: L('phoneCode'), age: L('age'), gender: L('gender'), male: L('male'), female: L('female'), preferNotToSay: L('preferNotToSay'), country: L('country'), city: L('city'), profession: L('profession'), currency: L('preferredCurrency'), language: L('preferredLanguage'), save: L('savePersonal'), selectGender: L('selectGender'), selectProfession: L('selectProfession'), selectCountry: L('selectCountry'), selectCity: L('selectCity'), enterPhone: L('enterPhone'), phoneExample: L('phoneExample'), enterAge: L('enterAge'), selectCurrency: L('selectCurrency'), other: L('other'), enterProfession: L('enterProfession'),
        }} onSave={() => void saveProfile()} />

        <SecuritySettings
          labels={{
            title: L('security'), emailAddress: L('emailAddress'), changeEmail: L('changeEmail'), emailVerified: L('emailVerified'), emailNotVerified: L('emailNotVerified'), pendingConfirmation: L('pendingConfirmation'),
            changePassword: L('changePassword'), twoFactor: L('twoFactorTitle'), emailTwoFactor: L('emailTwoFactor'), twoFactorEnabled: L('twoFactorEnabled'), twoFactorDisabled: L('twoFactorDisabled'), lastEnabled: L('lastEnabled'), devices: L('connectedDevices'), lastLogin: L('lastLogin'), signOutAll: L('signOutAll'), open: L('open'), enable: L('enable'), view: L('view'), execute: L('execute'), today: L('today'), disable: L('disableEmailTwoFactor'),
          }}
          currentEmail={currentAuthEmail}
          pendingEmail={pendingEmail || String(authUser?.new_email || '')}
          emailVerified={emailVerified}
          emailTwoFactorEnabled={emailTwoFactor.enabled}
          emailTwoFactorEnabledAt={emailTwoFactor.enabledAt}
          onModal={setModal}
          onChangeEmail={openEmailModal}
          onTwoFactor={openTwoFactorModal}
          onSignOutAll={() => void signOutEverywhere()}
        />

        <PreferenceSettings lang={lang} preferences={preferences} onChange={persistPreferences} labels={{
          title: L('preferences'), language: L('language'), theme: L('theme'), light: L('light'), dark: L('dark'), system: L('system'), currency: L('currency'), cycleStart: L('cycleStart'), luxury: L('luxury'), notifications: L('notifications'), reports: L('reports'), expenseAlerts: L('expenseAlerts'), investmentAlerts: L('investmentAlerts'), aiAlerts: L('aiAlerts'),
        }} />

        <PremiumFeatures labels={{
          title: L('premium'), plan: L('plan'), premium: L('premiumBadge'), start: L('startDate'), renewal: L('renewalDate'), manage: L('manageSubscription'), advancedAi: L('advancedAi'), smartAdvice: L('smartAdvice'), pdf: L('pdf'), protection: L('protection'), sync: L('sync'), goals: L('unlimitedGoals'), reports: L('monthlyReports'), support: L('prioritySupport'),
        }} onManage={openSubscriptionModal} />

        <AccountActivity
          lang={lang}
          labels={{
            title: L('activity'),
            noActivity: L('noActivity'),
            noActivityHelp: L('noActivityHelp'),
            error: accountActivity.error || L('activityLoadError'),
            retry: L('retry'),
          }}
          items={accountActivity.items}
          loading={accountActivity.loading}
          error={Boolean(accountActivity.error)}
          onRetry={() => void loadAccountActivity()}
        />

        <DangerZone labels={{ title: L('danger'), exportData: L('exportData'), deleteAccount: L('deleteAccount'), deleteHint: L('deleteHint') }} onExport={exportData} onDelete={() => setModal('delete')} />

        {toast && (
          <div className="profile-toast" role="status" aria-live="polite">
            <span className="profile-toast-icon" aria-hidden="true">
              <CheckCircle2 size={18} />
            </span>
            <p>{toast}</p>
            <button type="button" onClick={() => setToast('')} aria-label={L('close')}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </main>

      <ConfirmationModal open={modal === 'password'} title={L('changePassword')} onClose={() => setModal(null)}>
        <div className="modal-fields">
          <Field icon={<KeyRound size={16} />} label={L('currentPassword')}><input type="password" value={passwords.current} onChange={event => setPasswords(prev => ({ ...prev, current: event.target.value }))} /></Field>
          <Field icon={<Lock size={16} />} label={L('newPassword')}><input type="password" value={passwords.next} onChange={event => setPasswords(prev => ({ ...prev, next: event.target.value }))} /></Field>
          <Field icon={<ShieldCheck size={16} />} label={L('confirmPassword')}><input type="password" value={passwords.confirm} onChange={event => setPasswords(prev => ({ ...prev, confirm: event.target.value }))} /></Field>
          <button className="gold-btn" onClick={() => void changePassword()}><Save size={16} />{L('changePassword')}</button>
        </div>
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'email'} title={L('changeEmail')} onClose={() => setModal(null)}>
        <div className="modal-fields">
          <InfoBox icon={<ShieldCheck />} text={L('emailSecurityNote')} />
          <Field icon={<Mail size={16} />} label={L('currentEmail')}><input value={emailChange.currentEmail || currentAuthEmail} readOnly dir="ltr" /></Field>
          <Field icon={<Mail size={16} />} label={L('newEmail')}><input type="email" value={emailChange.newEmail} onChange={event => setEmailChange(prev => ({ ...prev, newEmail: event.target.value }))} dir="ltr" autoComplete="email" /></Field>
          <Field icon={<Mail size={16} />} label={L('confirmNewEmail')}><input type="email" value={emailChange.confirmEmail} onChange={event => setEmailChange(prev => ({ ...prev, confirmEmail: event.target.value }))} dir="ltr" autoComplete="email" /></Field>
          <Field icon={<KeyRound size={16} />} label={L('currentPassword')}>
            <input
              type={showEmailPassword ? 'text' : 'password'}
              value={emailChange.currentPassword}
              onChange={event => setEmailChange(prev => ({ ...prev, currentPassword: event.target.value }))}
              autoComplete="current-password"
            />
            <button type="button" className="field-icon-btn" onClick={() => setShowEmailPassword(value => !value)} aria-label={showEmailPassword ? L('close') : L('view')}>
              {showEmailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </Field>
          <button className="gold-btn" onClick={() => void changeEmail()} disabled={changingEmail}>
            <Save size={16} />{changingEmail ? L('sendingConfirmationLink') : L('sendConfirmationLink')}
          </button>
        </div>
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'twoFactor'} title={L('twoFactorTitle')} onClose={() => setModal(null)}>
        <div className="modal-fields">
          <InfoBox icon={<ShieldCheck />} text={L('emailTwoFactorSecurity')} />
          <div className="two-factor-panel">
            <div className="two-factor-row">
              <span className="stat-icon"><Mail size={18} /></span>
              <div>
                <strong>{L('emailTwoFactor')}</strong>
                <p>{L('emailTwoFactorDescription')}</p>
                <span className={emailTwoFactor.enabled ? 'status-pill on' : 'status-pill'}>
                  {emailTwoFactor.enabled ? L('twoFactorEnabled') : L('twoFactorDisabled')}
                </span>
              </div>
            </div>

            <div className={emailVerified ? 'email-verification-card verified' : 'email-verification-card unverified'}>
              <div>
                <strong>
                  {emailVerified ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {emailVerified ? L('emailVerified') : L('emailNotVerified')}
                </strong>
                <p>{emailVerified ? L('emailVerifiedFor2fa') : L('emailUnverifiedFor2fa')}</p>
              </div>
              {!emailVerified && user?.email && isEmail(user.email) && (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => void resendEmailConfirmation()}
                  disabled={resendingEmailConfirmation}
                >
                  <Mail size={16} />
                  {resendingEmailConfirmation ? L('resendingEmailConfirmation') : L('resendEmailConfirmation')}
                </button>
              )}
            </div>

            {!canUseEmailTwoFactor && (
              <div className="message-inline danger">
                {currentAuthEmail ? L('twoFactorEmailUnverified') : L('twoFactorNoEmail')}
              </div>
            )}

            {emailTwoFactor.step === 'overview' && !canUseEmailTwoFactor && (
              <button className="gold-btn" type="button" disabled>
                <ShieldCheck size={16} />
                {emailTwoFactor.enabled ? L('disableEmailTwoFactor') : L('enableEmailTwoFactor')}
              </button>
            )}

            {emailTwoFactor.step === 'overview' && canUseEmailTwoFactor && (
              <>
                <p className="two-factor-copy">{L('emailTwoFactorSetup')}</p>
                <button
                  className={emailTwoFactor.enabled ? 'danger-btn' : 'gold-btn'}
                  onClick={() => void sendEmailTwoFactorCode(emailTwoFactor.enabled ? 'disable' : 'enable')}
                  disabled={emailTwoFactor.loading}
                >
                  <ShieldCheck size={16} />
                  {emailTwoFactor.loading ? L('sendingCode') : emailTwoFactor.enabled ? L('disableEmailTwoFactor') : L('enableEmailTwoFactor')}
                </button>
              </>
            )}

            {emailTwoFactor.step === 'code' && (
              <>
                <Field icon={<KeyRound size={16} />} label={L('verificationCode')}>
                  <input
                    value={emailTwoFactor.code}
                    onChange={event => setEmailTwoFactor(prev => ({ ...prev, code: event.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    aria-label={L('verificationCode')}
                    dir="ltr"
                  />
                </Field>
                <p className="two-factor-copy">{L('enterEmailTwoFactorCode')}</p>
                <div className="section-actions">
                  <button className="gold-btn" onClick={() => void verifyEmailTwoFactorCode()} disabled={emailTwoFactor.loading || emailTwoFactor.code.length !== 6}>
                    <CheckCircle2 size={16} />
                    {emailTwoFactor.loading ? L('verifyingCode') : L('verifyCode')}
                  </button>
                  <button className="ghost-btn" onClick={() => void sendEmailTwoFactorCode(emailTwoFactor.mode === 'disable' ? 'disable' : 'enable')} disabled={emailTwoFactor.loading}>
                    <Mail size={16} />
                    {L('resendCode')}
                  </button>
                </div>
              </>
            )}

            {emailTwoFactor.message && <div className="message-inline">{emailTwoFactor.message}</div>}
            {emailTwoFactor.error && <div className="message-inline danger">{emailTwoFactor.error}</div>}
          </div>
        </div>
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'devices'} title={L('connectedDevices')} onClose={() => setModal(null)}>
        <InfoBox icon={<Smartphone />} text={L('devicesHint')} />
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'subscription'} title={L('manageSubscription')} onClose={() => setModal(null)}>
        <div className="modal-fields">
          <InfoBox icon={<Crown />} text={L('subscriptionPortalIntro')} />
          {subscriptionPortal.message && (
            <div className={`message-inline ${subscriptionPortal.tone === 'danger' ? 'danger' : ''}`}>
              {subscriptionPortal.message}
            </div>
          )}
          <div className="section-actions">
            <button className="gold-btn" onClick={() => void openSubscriptionPortal()} disabled={subscriptionPortal.loading}>
              <Crown size={16} />
              {subscriptionPortal.loading ? L('openingSubscriptionPortal') : L('openSubscriptionPortal')}
            </button>
            <button className="ghost-btn" onClick={() => setModal(null)} disabled={subscriptionPortal.loading}>
              {L('cancel')}
            </button>
          </div>
        </div>
      </ConfirmationModal>

      <ConfirmationModal open={modal === 'delete'} title={L('deleteAccount')} onClose={() => setModal(null)}>
        <div className="modal-fields">
          <InfoBox icon={<AlertTriangle />} text={L('deleteHint')} danger />
          <Field icon={<Trash2 size={16} />} label={L('typeDelete')}><input value={deleteWord} onChange={event => setDeleteWord(event.target.value)} disabled={deletingAccount} /></Field>
          <button className="danger-btn" disabled={deletingAccount || (deleteWord !== 'DELETE' && deleteWord !== 'حذف')} onClick={deleteAccount}>{deletingAccount ? L('deletingAccount') : L('finalDelete')}</button>
        </div>
      </ConfirmationModal>

      <style jsx global>{`
        .profile-page{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-deep-navy);display:flex;font-family:Tajawal,Arial,sans-serif}.profile-main{flex:1;width:100%;max-width:1280px;margin:0 auto;padding:24px;margin-inline-start:230px}.profile-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}.profile-top span{color:var(--sfm-muted);font-size:12px;font-weight:900}.profile-top h1{font-size:30px;margin:4px 0 6px;font-weight:900}.profile-top p{margin:0;color:var(--sfm-muted);font-weight:700}
        .profile-card{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:24px;box-shadow:0 4px 22px rgba(3,18,37,.06);padding:20px}.profile-layout{display:grid;grid-template-columns:360px 1fr;gap:16px;margin-bottom:16px}.hero-card{background:linear-gradient(145deg,var(--sfm-deep-navy),var(--sfm-primary-dark));color:var(--sfm-card);border:1px solid rgba(167,243,240,.2);border-radius:26px;padding:24px;box-shadow:0 18px 55px rgba(3,18,37,.16)}.avatar{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;font-size:28px;font-weight:900;border:4px solid rgba(255,255,255,.12);overflow:hidden;background-size:cover;background-position:center}.avatar-upload-input{position:fixed;inline-size:1px;block-size:1px;opacity:0;pointer-events:none;inset-inline-start:-9999px;inset-block-start:auto}.premium-pill{display:inline-flex;align-items:center;gap:7px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);border:1px solid rgba(167,243,240,.22);border-radius:999px;padding:7px 12px;font-size:12px;font-weight:900}.hero-actions,.section-actions{display:flex;gap:8px;flex-wrap:wrap}.ghost-btn,.gold-btn,.danger-btn{height:42px;border-radius:14px;border:0;padding:0 15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;text-decoration:none;transition:.2s}.gold-btn{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 10px 24px rgba(167,243,240,.2)}.ghost-btn{background:var(--sfm-light-card);color:var(--sfm-muted);border:1px solid rgba(167,243,240,.18)}.danger-btn{background:#B91C1C;color:#fff}.danger-btn:disabled,.gold-btn:disabled,.ghost-btn:disabled{opacity:.55;cursor:not-allowed;filter:saturate(.75)}.dark-ghost{background:rgba(255,255,255,.08);color:var(--sfm-card);border:1px solid rgba(255,255,255,.14)}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;height:100%}.stat-card{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:20px;padding:16px;display:grid;gap:9px;min-height:150px}.stat-icon{width:40px;height:40px;border-radius:14px;background:rgba(167,243,240,.12);color:var(--sfm-soft-cyan);display:grid;place-items:center}.stat-card span,.field label,.mini-label{font-size:12px;color:var(--sfm-muted);font-weight:900}.stat-card strong{font-size:22px}.section-head{display:flex;align-items:center;gap:10px;margin-bottom:16px}.section-head h2{margin:0;font-size:18px;font-weight:900}.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.field{display:grid;gap:7px}.input-wrap{height:52px;border:1.5px solid rgba(167,243,240,.2);border-radius:15px;background:var(--sfm-light-card);display:flex;align-items:center;gap:9px;padding:0 12px;color:var(--sfm-muted);transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}.input-wrap:focus-within{border-color:rgba(24,212,212,.58);box-shadow:0 0 0 4px rgba(24,212,212,.10)}.input-wrap input,.input-wrap select{border:0;outline:0;background:transparent;width:100%;height:100%;font:800 14px Tajawal,Arial,sans-serif;color:var(--sfm-foreground);min-width:0}.input-wrap input::placeholder{color:var(--sfm-muted);opacity:.9}.input-wrap input[readonly]{opacity:.65}.profile-combobox{position:relative}.profile-combobox input{cursor:pointer}.profile-combobox.open{border-color:rgba(24,212,212,.58);box-shadow:0 0 0 4px rgba(24,212,212,.10)}.profile-combobox-chevron{flex:0 0 auto;color:var(--sfm-muted);transition:.18s ease}.profile-combobox-chevron.open{transform:rotate(180deg);color:var(--sfm-primary)}.profile-combobox-menu{position:absolute;z-index:70;inset-inline:0;top:calc(100% + 8px);max-height:280px;overflow:auto;background:var(--sfm-card);border:1px solid rgba(24,212,212,.22);border-radius:16px;padding:6px;box-shadow:0 18px 42px rgba(3,18,37,.18)}.profile-combobox-menu button{width:100%;border:0;background:transparent;color:var(--sfm-foreground);border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 11px;font:900 13px Tajawal,Arial,sans-serif;text-align:inherit;cursor:pointer}.profile-combobox-menu button:hover,.profile-combobox-menu button.active{background:rgba(24,212,212,.10)}.profile-combobox-menu button.selected{background:rgba(24,212,212,.14);color:var(--sfm-primary-dark)}.profile-combobox-menu button svg{color:var(--sfm-accent);flex:0 0 auto}.field-icon-btn{border:0;background:transparent;color:var(--sfm-muted);display:grid;place-items:center;border-radius:999px;padding:5px;cursor:pointer}.field-icon-btn:hover,.field-icon-btn:focus-visible{color:var(--sfm-primary);outline:2px solid rgba(24,212,212,.24);outline-offset:2px}.profile-section{margin-bottom:16px}.setting-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-bottom:1px solid rgba(167,243,240,.1)}.setting-row:last-child{border-bottom:0}.setting-row p{margin:4px 0 0;color:var(--sfm-muted);font-size:12px;font-weight:700;overflow-wrap:anywhere}.toggle{width:48px;height:28px;border-radius:999px;border:0;background:#CBD5E1;padding:3px;cursor:pointer}.toggle i{display:block;width:22px;height:22px;border-radius:50%;background:white;transition:.2s}.toggle.on{background:var(--sfm-accent)}.toggle.on i{transform:translateX(-20px)}[dir="ltr"] .toggle.on i{transform:translateX(20px)}
        .pref-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.segmented{display:flex;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.14);border-radius:14px;padding:4px;gap:4px}.segmented button{flex:1;border:0;border-radius:11px;background:transparent;height:38px;font:900 12px Tajawal,Arial,sans-serif;color:var(--sfm-muted);cursor:pointer}.segmented button.active{background:var(--sfm-card);color:var(--sfm-foreground);box-shadow:0 3px 12px rgba(3,18,37,.08)}.dark .profile-combobox-menu button.selected{color:var(--sfm-soft-cyan)}.premium-grid,.activity-list{display:grid;gap:10px}.premium-grid{grid-template-columns:repeat(4,1fr)}.feature-card{background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:14px;font-weight:900;color:var(--sfm-muted);display:flex;align-items:center;gap:9px}.plan-card{background:linear-gradient(135deg,var(--sfm-foreground),var(--sfm-primary-dark));color:var(--sfm-card);border-radius:20px;padding:18px;display:grid;gap:8px}.activity-item,.activity-empty{display:flex;align-items:center;gap:12px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.1);border-radius:15px;padding:12px}.activity-item svg{color:var(--sfm-soft-cyan)}.activity-empty{display:grid;gap:8px;color:var(--sfm-muted);font-weight:850}.activity-empty strong{color:var(--sfm-foreground);font-weight:950}.activity-empty p{margin:0;color:var(--sfm-muted);font-size:13px;line-height:1.6}.activity-empty .ghost-btn{width:max-content}.activity-skeleton span,.activity-skeleton strong,.activity-skeleton p{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(167,243,240,.16),rgba(255,255,255,.86),rgba(167,243,240,.16));background-size:220% 100%;animation:profileSkeleton 1.2s ease-in-out infinite}.activity-skeleton span{width:32px;height:32px}.activity-skeleton strong{width:160px;height:14px}.activity-skeleton p{width:110px;height:11px;margin-top:8px!important}@keyframes profileSkeleton{to{background-position:-220% 0}}.danger-zone{border-color:rgba(185,28,28,.18);background:linear-gradient(135deg,var(--sfm-card),#FFF7F4)}.profile-toast{position:fixed;z-index:50;inset-inline-start:24px;inset-inline-end:auto;bottom:24px;width:max-content;max-width:min(420px,calc(100vw - 48px));display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;background:var(--sfm-primary-dark);color:#EAF6FF;border:1px solid rgba(24,212,212,.28);border-radius:18px;padding:12px 14px;font-weight:900;line-height:1.55;box-shadow:0 18px 45px rgba(3,18,37,.22),0 0 0 1px rgba(255,255,255,.04);animation:toastSlideUp .22s ease-out}.profile-toast p{margin:0;min-width:0;overflow-wrap:anywhere}.profile-toast-icon{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:rgba(24,212,212,.14);color:var(--sfm-soft-cyan);box-shadow:0 0 18px rgba(24,212,212,.18)}.profile-toast button{width:30px;height:30px;border:0;border-radius:999px;background:rgba(255,255,255,.08);color:#EAF6FF;display:grid;place-items:center;cursor:pointer;transition:.18s ease}.profile-toast button:hover,.profile-toast button:focus-visible{background:rgba(24,212,212,.18);color:#FFFFFF;outline:2px solid rgba(24,212,212,.34);outline-offset:2px}@keyframes toastSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .modal-overlay{position:fixed;inset:0;z-index:90;background:rgba(17,17,17,.45);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}.modal-card{width:min(520px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:var(--sfm-card);border:1px solid rgba(167,243,240,.18);border-radius:24px;padding:22px;box-shadow:0 24px 80px rgba(3,18,37,.28)}.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.modal-head h3{margin:0;font-size:19px}.modal-fields{display:grid;gap:12px}.info-box{display:flex;gap:10px;align-items:flex-start;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:16px;padding:14px;color:var(--sfm-muted);line-height:1.7;font-weight:800}.info-box.danger{background:#FEF2F2;border-color:#FCA5A5;color:#B91C1C}.two-factor-panel{display:grid;gap:14px;border:1px solid rgba(24,212,212,.18);background:var(--sfm-light-card);border-radius:18px;padding:14px}.two-factor-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start}.two-factor-row strong{display:block;color:var(--sfm-foreground);font-size:15px}.two-factor-row p,.two-factor-copy{margin:4px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.7}.status-pill{display:inline-flex;width:max-content;margin-top:9px;border-radius:999px;border:1px solid rgba(100,116,139,.20);background:rgba(100,116,139,.10);color:var(--sfm-muted);padding:5px 10px;font-weight:950;font-size:12px}.status-pill.on{background:rgba(16,185,129,.14);border-color:rgba(16,185,129,.25);color:#047857}.message-inline{border:1px solid rgba(16,185,129,.22);background:rgba(16,185,129,.10);color:#047857;border-radius:14px;padding:10px 12px;font-size:13px;font-weight:900;line-height:1.6}.message-inline.danger{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.24);color:#B91C1C}.profile-loading{min-height:100vh;display:grid;place-items:center;background:var(--sfm-light-card);color:var(--sfm-muted);font-size:34px}
        .dark .profile-page{--profile-bg:#0a1422;--profile-card:#0f1d31;--profile-card-soft:#13243a;--profile-border:#1d3050;--profile-text:#e8eef6;--profile-body:#b8c7d9;--profile-muted:#8ea6c3;--profile-accent:#2fd6c0;background:radial-gradient(circle at 14% 8%,rgba(47,214,192,.12),transparent 30%),linear-gradient(160deg,#0a1422 0%,#0b1728 56%,#08111f 100%)!important;color:var(--profile-text)!important}.dark .profile-main,.dark .profile-top h1,.dark .section-head h2,.dark .stat-card strong,.dark .setting-row strong,.dark .two-factor-row strong,.dark .modal-head h3{color:var(--profile-text)!important}.dark .profile-top span,.dark .profile-top p,.dark .stat-card span,.dark .field label,.dark .mini-label,.dark .setting-row p,.dark .feature-card,.dark .activity-item p,.dark .two-factor-row p,.dark .two-factor-copy,.dark .info-box,.dark .status-pill{color:var(--profile-body)!important}.dark .profile-card,.dark .stat-card,.dark .modal-card{background:linear-gradient(180deg,var(--profile-card),#0d1a2d)!important;border-color:var(--profile-border)!important;box-shadow:0 18px 44px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.03)!important}.dark .hero-card{background:radial-gradient(circle at 18% 12%,rgba(47,214,192,.22),transparent 32%),linear-gradient(145deg,#07111f,#0f1d31 60%,#13243a)!important;border-color:rgba(47,214,192,.28)!important;color:var(--profile-text)!important}.dark .hero-card p{color:var(--profile-body)!important}.dark .premium-pill{background:rgba(47,214,192,.14)!important;border-color:rgba(47,214,192,.32)!important;color:var(--profile-accent)!important}.dark .stat-icon{background:rgba(47,214,192,.12)!important;border:1px solid rgba(47,214,192,.22)!important;color:var(--profile-accent)!important}.dark .input-wrap,.dark .segmented,.dark .feature-card,.dark .activity-item,.dark .info-box,.dark .two-factor-panel{background:var(--profile-card-soft)!important;border-color:var(--profile-border)!important;color:var(--profile-body)!important}.dark .input-wrap:hover,.dark .input-wrap:focus-within,.dark .profile-combobox.open{border-color:rgba(47,214,192,.56)!important;box-shadow:0 0 0 4px rgba(47,214,192,.12)!important;background:#102238!important}.dark .input-wrap svg,.dark .profile-combobox-chevron,.dark .field-icon-btn{color:var(--profile-muted)!important}.dark .input-wrap:focus-within svg,.dark .field-icon-btn:hover,.dark .field-icon-btn:focus-visible{color:var(--profile-accent)!important}.dark .input-wrap input,.dark .input-wrap select,.dark .profile-combobox input{color:var(--profile-text)!important;-webkit-text-fill-color:var(--profile-text)!important}.dark .input-wrap input::placeholder{color:var(--profile-muted)!important;-webkit-text-fill-color:var(--profile-muted)!important;opacity:1}.dark .input-wrap input[readonly]{opacity:1;color:var(--profile-body)!important;-webkit-text-fill-color:var(--profile-body)!important}.dark .profile-combobox-menu,.dark .currency-popover{background:#0f1d31!important;border-color:rgba(47,214,192,.28)!important;box-shadow:0 24px 60px rgba(0,0,0,.38)!important}.dark .profile-combobox-menu button,.dark .currency-list button{color:var(--profile-text)!important}.dark .profile-combobox-menu button:hover,.dark .profile-combobox-menu button.active,.dark .currency-list button:hover,.dark .currency-list button.active{background:rgba(47,214,192,.12)!important;border-color:rgba(47,214,192,.22)!important;color:var(--profile-accent)!important}.dark .profile-combobox-menu button.selected{background:rgba(47,214,192,.16)!important;color:var(--profile-accent)!important}.dark .segmented button{color:var(--profile-body)!important}.dark .segmented button:hover{color:var(--profile-text)!important;background:rgba(47,214,192,.09)!important}.dark .segmented button.active{background:linear-gradient(135deg,#123552,#0f2b45)!important;color:var(--profile-text)!important;border:1px solid rgba(47,214,192,.20)!important;box-shadow:0 8px 22px rgba(0,0,0,.22)!important}.dark .ghost-btn{background:rgba(19,36,58,.86)!important;border-color:var(--profile-border)!important;color:var(--profile-text)!important}.dark .ghost-btn:hover,.dark .ghost-btn:focus-visible{background:rgba(47,214,192,.11)!important;border-color:rgba(47,214,192,.36)!important;color:var(--profile-accent)!important;outline:2px solid rgba(47,214,192,.24)!important;outline-offset:2px}.dark .gold-btn{color:#061a2e!important;background:linear-gradient(135deg,#2fd6c0,#38bdf8)!important;box-shadow:0 16px 36px rgba(47,214,192,.18)!important}.dark .danger-btn{background:#dc2626!important;color:#fff!important;box-shadow:0 14px 28px rgba(220,38,38,.18)!important}.dark .danger-zone{background:linear-gradient(180deg,rgba(127,29,29,.18),var(--profile-card))!important;border-color:rgba(248,113,113,.34)!important}.dark .danger-zone p{color:#fca5a5!important}.dark .info-box.danger{background:rgba(127,29,29,.24)!important;border-color:rgba(248,113,113,.34)!important;color:#fecaca!important}.dark .message-inline{background:rgba(16,185,129,.16)!important;border-color:rgba(16,185,129,.30)!important;color:#86efac!important}.dark .message-inline.danger{background:rgba(127,29,29,.24)!important;border-color:rgba(248,113,113,.32)!important;color:#fecaca!important}.dark .status-pill.on{background:rgba(16,185,129,.16)!important;border-color:rgba(16,185,129,.30)!important;color:#86efac!important}.dark .toggle{background:#334155!important;border:1px solid var(--profile-border)!important}.dark .toggle i{background:#e8eef6!important}.dark .toggle.on{background:linear-gradient(135deg,#2fd6c0,#38bdf8)!important}.dark .plan-card{background:linear-gradient(145deg,#07111f,#102238)!important;border:1px solid rgba(47,214,192,.22)!important;color:var(--profile-text)!important}.dark .profile-toast{background:#0f1d31!important;border-color:rgba(47,214,192,.34)!important;color:var(--profile-text)!important}
        .email-verification-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;background:var(--sfm-card);border:1px solid rgba(100,116,139,.16);border-radius:16px;padding:12px}.email-verification-card strong{display:flex;align-items:center;gap:7px;color:var(--sfm-foreground);font-size:14px;line-height:1.4}.email-verification-card p{margin:4px 0 0;color:var(--sfm-muted);font-size:12px;font-weight:800;line-height:1.6}.email-verification-card.verified{background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.24)}.email-verification-card.verified strong{color:#047857}.email-verification-card.unverified{background:rgba(245,158,11,.09);border-color:rgba(245,158,11,.30)}.email-verification-card.unverified strong{color:#B45309}.email-verification-card .ghost-btn{height:40px;white-space:nowrap}.dark .email-verification-card{background:rgba(19,36,58,.72)!important;border-color:var(--profile-border)!important}.dark .email-verification-card.verified{background:rgba(16,185,129,.12)!important;border-color:rgba(16,185,129,.28)!important}.dark .email-verification-card.unverified{background:rgba(245,158,11,.13)!important;border-color:rgba(245,158,11,.30)!important}.dark .email-verification-card.verified strong{color:#86efac!important}.dark .email-verification-card.unverified strong{color:#fbbf24!important}
        @media(max-width:1180px){.profile-main{margin-inline-start:0}.profile-layout{grid-template-columns:1fr}.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.profile-main{padding:14px}.profile-top{display:grid}.stats-grid,.form-grid,.pref-grid,.premium-grid{grid-template-columns:1fr}.hero-actions .ghost-btn,.hero-actions .gold-btn,.section-actions .ghost-btn,.section-actions .gold-btn,.section-actions .danger-btn,.modal-fields .gold-btn{width:100%}.setting-row{align-items:flex-start;flex-direction:column}.modal-overlay{place-items:end center;padding:10px}.modal-card{width:100%;border-radius:22px 22px 0 0;max-height:calc(100dvh - 20px)}.email-verification-card{grid-template-columns:1fr}.email-verification-card .ghost-btn{width:100%}.profile-toast{inset-inline:16px;bottom:16px;width:auto;max-width:none}}
      `}</style>
    </div>
  );
}

function ProfileHeroCard({
  initials,
  name,
  username,
  avatarUrl,
  completion,
  language,
  uploadingAvatar,
  labels,
  onEditPhoto,
  onView,
}: {
  initials: string;
  name: string;
  username: string;
  avatarUrl: string;
  completion: number;
  language: string;
  uploadingAvatar: boolean;
  labels: Record<string, string>;
  onEditPhoto: () => void;
  onView: () => void;
}) {
  const avatarStyle = avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined;

  return (
    <aside className="hero-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div className="avatar" style={avatarStyle}>{avatarUrl ? null : initials}</div>
        <span className="premium-pill"><Crown size={15} />{labels.premium}</span>
      </div>
      <h2 style={{ margin: '18px 0 4px', fontSize: 24 }}>{name}</h2>
      <p style={{ margin: 0, color: 'rgba(255,255,255,.62)', direction: 'ltr' }}>@{username || 'sfm-user'}</p>
      <div style={{ margin: '16px 0', display: 'grid', gap: 9 }}>
        <MiniInfo label={labels.elite} value={labels.lastActivity} />
        <MiniInfo label={labels.selectedLanguage} value={language} />
        <MiniInfo label={labels.completion} value={`${completion}%`} />
      </div>
      <div style={{ height: 9, background: 'rgba(255,255,255,.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${completion}%`, height: '100%', background: 'linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent))', borderRadius: 99 }} />
      </div>
      <div className="hero-actions">
        <button className="ghost-btn dark-ghost" onClick={onEditPhoto} disabled={uploadingAvatar}>
          <Camera size={16} />
          {uploadingAvatar ? labels.uploadingPhoto : labels.editPhoto}
        </button>
        <button className="gold-btn" onClick={onView}><Eye size={16} />{labels.viewProfile}</button>
      </div>
    </aside>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}><span style={{ color: 'var(--sfm-soft-cyan)', fontWeight: 900 }}>{label}</span><strong>{value}</strong></div>;
}

function ProfileStatsCards({ labels, stats }: { labels: Record<string, string>; stats: { goals: number; investments: number; completion: number; health: number } }) {
  const cards = [
    { icon: <CheckCircle2 size={20} />, label: labels.goals, value: String(stats.goals) },
    { icon: <WalletCards size={20} />, label: labels.investmentStatus, value: stats.investments > 0 ? labels.active : labels.inactive },
    { icon: <BadgeCheck size={20} />, label: labels.completion, value: `${stats.completion}%` },
    { icon: <Activity size={20} />, label: labels.health, value: `${stats.health} / 100` },
  ];
  return <section className="stats-grid">{cards.map(card => <div className="stat-card" key={card.label}><div className="stat-icon">{card.icon}</div><span>{card.label}</span><strong>{card.value}</strong></div>)}</section>;
}

function PersonalInfoForm({ lang, profile, setProfile, preferences, setPreferences, saving, labels, onSave }: { lang: Lang; profile: ProfileState; setProfile: (next: ProfileState) => void; preferences: PreferencesState; setPreferences: (next: PreferencesState) => void; saving: boolean; labels: Record<string, string>; onSave: () => void }) {
  const update = (key: keyof ProfileState, value: string) => setProfile({ ...profile, [key]: value });
  const updateCountry = (value: string) => {
    const nextPhoneCode = phoneCodeForCountry(value) || profile.phoneCode || '+965';
    setProfile({
      ...profile,
      country: value,
      phoneCode: nextPhoneCode,
      city: value === 'KW' ? profile.city : '',
    });
  };
  const selectedCountry = normalizeCountry(profile.country);
  const isKuwait = selectedCountry === 'KW';
  return (
    <Section title={labels.title} icon={<User size={19} />}>
      <div className="form-grid">
        <Field icon={<User size={16} />} label={labels.fullName}><input value={profile.displayName} onChange={event => update('displayName', event.target.value)} placeholder={labels.fullName} /></Field>
        <Field icon={<BadgeCheck size={16} />} label={labels.username}><input value={profile.username} onChange={event => update('username', event.target.value)} placeholder={labels.username} /></Field>
        <Field icon={<Mail size={16} />} label={labels.email}><input value={profile.email} readOnly dir="ltr" /></Field>
        <Field icon={<Phone size={16} />} label={labels.phone}><input value={profile.phone} onChange={event => update('phone', event.target.value)} placeholder={isKuwait ? labels.phoneExample : labels.enterPhone} inputMode="tel" dir="ltr" /></Field>
        <Field icon={<Globe2 size={16} />} label={labels.phoneCode}><select value={profile.phoneCode} onChange={event => update('phoneCode', event.target.value)}>{phoneCodes.map(code => <option key={code}>{code}</option>)}</select></Field>
        <Field icon={<CalendarDays size={16} />} label={labels.age}><input type="number" min={13} max={100} value={profile.age} onChange={event => update('age', event.target.value)} placeholder={labels.enterAge} inputMode="numeric" /></Field>
        <Field icon={<User size={16} />} label={labels.gender}>
          <select value={profile.gender} onChange={event => update('gender', event.target.value)} aria-label={labels.selectGender}>
            <option value="">{labels.selectGender}</option>
            {genderOptions.map(option => <option key={option.value} value={option.value}>{optionLabel(option, lang)}</option>)}
          </select>
        </Field>
        <SearchableProfileSelect
          icon={<MapPin size={16} />}
          label={labels.country}
          placeholder={labels.selectCountry}
          value={selectedCountry}
          options={countryOptions}
          lang={lang}
          onChange={updateCountry}
        />
        {isKuwait ? (
          <Field icon={<MapPin size={16} />} label={labels.city}>
            <select value={profile.city} onChange={event => update('city', event.target.value)} aria-label={labels.selectCity}>
              <option value="">{labels.selectCity}</option>
              {kuwaitCityOptions.map(option => <option key={option.value} value={option.value}>{optionLabel(option, lang)}</option>)}
            </select>
          </Field>
        ) : (
          <Field icon={<MapPin size={16} />} label={labels.city}><input value={profile.city} onChange={event => update('city', event.target.value)} placeholder={labels.selectCity} /></Field>
        )}
        <SearchableProfileSelect
          icon={<WalletCards size={16} />}
          label={labels.profession}
          placeholder={labels.selectProfession}
          value={profile.profession}
          options={professionOptions}
          lang={lang}
          onChange={value => {
            setProfile({
              ...profile,
              profession: value,
              professionOther: value === 'other' ? profile.professionOther : '',
            });
          }}
        />
        {profile.profession === 'other' && (
          <Field icon={<WalletCards size={16} />} label={labels.other}><input value={profile.professionOther} onChange={event => update('professionOther', event.target.value)} placeholder={labels.enterProfession} /></Field>
        )}
        <Field icon={<WalletCards size={16} />} label={labels.currency}><CurrencySelect value={preferences.currency || 'KWD'} onChange={code => setPreferences({ ...preferences, currency: code })} lang={lang} ariaLabel={labels.selectCurrency} /></Field>
      </div>
      <div style={{ marginTop: 16 }}><button className="gold-btn" onClick={onSave} disabled={saving}><Save size={16} />{saving ? '...' : labels.save}</button></div>
    </Section>
  );
}

function SearchableProfileSelect({
  icon,
  label,
  placeholder,
  value,
  options,
  lang,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  placeholder: string;
  value: string;
  options: ProfileOption[];
  lang: Lang;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);
  const displayValue = selected ? optionLabel(selected, lang) : '';
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(option => {
      const haystack = `${option.value} ${option.search || ''} ${option.labels.ar} ${option.labels.en} ${option.labels.fr}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [activeIndex, filtered.length]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function selectOption(option: ProfileOption) {
    onChange(option.value);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="field profile-select-field" ref={rootRef}>
      <label>{label}</label>
      <div className={`input-wrap profile-combobox ${open ? 'open' : ''}`}>
        {icon}
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={`${label}-profile-options`}
          aria-autocomplete="list"
          value={open ? query : displayValue}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={event => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setActiveIndex(index => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex(index => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
              event.preventDefault();
              selectOption(filtered[activeIndex]);
            }
          }}
          placeholder={placeholder}
        />
        <ChevronDownIcon open={open} />
        {open && (
          <div className="profile-combobox-menu" id={`${label}-profile-options`} role="listbox">
            {filtered.map((option, index) => {
              const selectedOption = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${selectedOption ? 'selected' : ''} ${index === activeIndex ? 'active' : ''}`}
                  role="option"
                  aria-selected={selectedOption}
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <span>{optionLabel(option, lang)}</span>
                  {selectedOption && <CheckCircle2 size={15} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg className={open ? 'profile-combobox-chevron open' : 'profile-combobox-chevron'} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SecuritySettings({
  labels,
  currentEmail,
  pendingEmail,
  emailVerified,
  emailTwoFactorEnabled,
  emailTwoFactorEnabledAt,
  onModal,
  onChangeEmail,
  onTwoFactor,
  onSignOutAll,
}: {
  labels: Record<string, string>;
  currentEmail: string;
  pendingEmail: string;
  emailVerified: boolean;
  emailTwoFactorEnabled: boolean;
  emailTwoFactorEnabledAt: string;
  onModal: (modal: ModalKind) => void;
  onChangeEmail: () => void;
  onTwoFactor: () => void;
  onSignOutAll: () => void;
}) {
  const twoFactorStatus = [
    `${labels.emailTwoFactor}: ${emailTwoFactorEnabled ? labels.twoFactorEnabled : labels.twoFactorDisabled}`,
    emailTwoFactorEnabledAt ? `${labels.lastEnabled}: ${new Date(emailTwoFactorEnabledAt).toLocaleDateString()}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <Section title={labels.title} icon={<ShieldCheck size={19} />}>
      <SettingRow
        icon={<Mail />}
        title={labels.emailAddress}
        subtitle={[currentEmail, emailVerified ? labels.emailVerified : labels.emailNotVerified, pendingEmail ? `${labels.pendingConfirmation}: ${pendingEmail}` : ''].filter(Boolean).join(' · ')}
        action={labels.changeEmail}
        onClick={onChangeEmail}
      />
      <SettingRow icon={<KeyRound />} title={labels.changePassword} action={labels.open} onClick={() => onModal('password')} />
      <SettingRow
        icon={<ShieldCheck />}
        title={labels.twoFactor}
        subtitle={twoFactorStatus}
        action={emailTwoFactorEnabled ? labels.disable : labels.enable}
        onClick={onTwoFactor}
      />
      <SettingRow icon={<Smartphone />} title={labels.devices} action={labels.view} onClick={() => onModal('devices')} />
      <SettingRow icon={<Activity />} title={labels.lastLogin} subtitle={labels.today} action={labels.view} onClick={() => onModal('devices')} />
      <SettingRow icon={<LogOut />} title={labels.signOutAll} action={labels.execute} onClick={onSignOutAll} />
    </Section>
  );
}

function PreferenceSettings({ lang, preferences, onChange, labels }: { lang: Lang; preferences: PreferencesState; onChange: (next: PreferencesState) => void; labels: Record<string, string> }) {
  const set = (patch: Partial<PreferencesState>) => onChange({ ...preferences, ...patch });
  return (
    <Section id="preferences" title={labels.title} icon={<Palette size={19} />}>
      <div className="pref-grid">
        <div>
          <div className="mini-label" style={{ marginBottom: 7 }}>{labels.language}</div>
          <LanguageSwitcher value={preferences.language} onChange={value => set({ language: value })} variant="gold" />
        </div>
        <Choice label={labels.theme} value={preferences.theme} options={[['light', labels.light], ['dark', labels.dark], ['system', labels.system]]} onChange={value => set({ theme: value as ThemeMode })} />
        <div><div className="mini-label" style={{ marginBottom: 7 }}>{labels.currency}</div><CurrencySelect value={preferences.currency} onChange={value => set({ currency: value })} lang={lang} ariaLabel={labels.currency} /></div>
        <Field icon={<CalendarDays size={16} />} label={labels.cycleStart}><input type="date" value={preferences.cycleStart} onChange={event => set({ cycleStart: event.target.value })} /></Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <ToggleRow label={labels.luxury} checked={preferences.luxury} onChange={value => set({ luxury: value })} />
        <ToggleRow label={labels.reports} checked={preferences.reports} onChange={value => set({ reports: value })} />
        <ToggleRow label={labels.expenseAlerts} checked={preferences.expenses} onChange={value => set({ expenses: value })} />
        <ToggleRow label={labels.investmentAlerts} checked={preferences.investments} onChange={value => set({ investments: value })} />
        <ToggleRow label={labels.aiAlerts} checked={preferences.ai} onChange={value => set({ ai: value })} />
      </div>
    </Section>
  );
}

function PremiumFeatures({ labels, onManage }: { labels: Record<string, string>; onManage: () => void }) {
  const features = [labels.advancedAi, labels.smartAdvice, labels.pdf, labels.protection, labels.sync, labels.goals, labels.reports, labels.support];
  return (
    <Section title={labels.title} icon={<Crown size={19} />}>
      <div className="profile-layout" style={{ gridTemplateColumns: '280px 1fr' }}>
        <div className="plan-card"><span>{labels.plan}</span><h3>{labels.premium}</h3><p>{labels.start}: 2026-05-01</p><p>{labels.renewal}: 2027-05-01</p><button className="gold-btn" onClick={onManage}>{labels.manage}</button></div>
        <div className="premium-grid">{features.map(feature => <div className="feature-card" key={feature}><Star size={16} />{feature}</div>)}</div>
      </div>
    </Section>
  );
}

function AccountActivity({
  labels,
  items,
  lang,
  loading,
  error,
  onRetry,
}: {
  labels: Record<string, string>;
  items: AccountActivityRow[];
  lang: Lang;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <Section title={labels.title} icon={<Activity size={19} />}>
      <div className="activity-list" aria-live="polite">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div className="activity-item activity-skeleton" key={`activity-loading-${index}`}>
              <span aria-hidden="true" />
              <div>
                <strong />
                <p />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="activity-empty" role="alert">
            <strong>{labels.error}</strong>
            <button type="button" className="ghost-btn" onClick={onRetry}>{labels.retry}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="activity-empty">
            <strong>{labels.noActivity}</strong>
            <p>{labels.noActivityHelp}</p>
          </div>
        ) : (
          items.map(item => (
            <div className="activity-item" key={item.id}>
              <Activity size={16} />
              <div>
                <strong>{accountActivityLabel(item.event_type, lang, item.title)}</strong>
                <p style={{ margin: '3px 0 0', color: 'var(--sfm-muted)', fontSize: 12 }}>
                  {formatAccountActivityTimestamp(item.created_at, lang)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}

function DangerZone({ labels, onExport, onDelete }: { labels: Record<string, string>; onExport: () => void; onDelete: () => void }) {
  return <Section title={labels.title} icon={<AlertTriangle size={19} />} className="danger-zone"><div className="section-actions"><button className="ghost-btn" onClick={onExport}><Download size={16} />{labels.exportData}</button><button className="danger-btn" onClick={onDelete}><Trash2 size={16} />{labels.deleteAccount}</button></div><p style={{ margin: '12px 0 0', color: '#B91C1C', fontWeight: 800 }}>{labels.deleteHint}</p></Section>;
}

function Section({ id, title, icon, children, className = '' }: { id?: string; title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return <section id={id} className={`profile-card profile-section ${className}`}><div className="section-head">{icon}<h2>{title}</h2></div>{children}</section>;
}

function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span><div className="input-wrap">{icon}{children}</div></label>;
}

function SettingRow({ icon, title, subtitle, action, onClick }: { icon: ReactNode; title: string; subtitle?: string; action: string; onClick: () => void }) {
  return <div className="setting-row"><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="stat-icon">{icon}</span><div><strong>{title}</strong>{subtitle && <p>{subtitle}</p>}</div></div><button className="ghost-btn" onClick={onClick}>{action}</button></div>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="setting-row"><strong>{label}</strong><button className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><i /></button></div>;
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return <div><div className="mini-label" style={{ marginBottom: 7 }}>{label}</div><div className="segmented">{options.map(([id, name]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{name}</button>)}</div></div>;
}

function ConfirmationModal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;
  return <div className="modal-overlay"><div className="modal-card"><div className="modal-head"><h3>{title}</h3><button className="ghost-btn" onClick={onClose}>×</button></div>{children}</div></div>;
}

function InfoBox({ icon, text, danger }: { icon: ReactNode; text: string; danger?: boolean }) {
  return <div className={`info-box ${danger ? 'danger' : ''}`}>{icon}<p style={{ margin: 0 }}>{text}</p></div>;
}
