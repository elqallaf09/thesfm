'use client';

import { useState } from 'react';
import { Calculator, Lock, UserPlus, KeyRound, AlertCircle, User, Languages, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const SECURITY_QUESTIONS = [
  { id: 'pet_name', questionAr: 'ما اسم حيوانك الأليف؟', questionEn: 'What is your pet name?', questionFr: "Comment s'appelle votre animal de compagnie?", questionZh: '你宠物的名字是什么？' },
  { id: 'school_name', questionAr: 'ما اسم مدرستك الأساسية؟', questionEn: 'What is your primary school name?', questionFr: "Quel est le nom de votre école primaire?", questionZh: '你小学的名字是什么？' },
  { id: 'city_born', questionAr: 'في أي مدينة ولدت؟', questionEn: 'In which city were you born?', questionFr: "Dans quelle ville êtes-vous né?", questionZh: '你在哪个城市出生？' },
  { id: 'father_name', questionAr: 'ما اسم والدك الأول؟', questionEn: "What is your father's first name?", questionFr: "Quel est le prénom de votre père?", questionZh: '你父亲的名字是什么？' },
  { id: 'favorite_color', questionAr: 'ما هو لونك المفضل؟', questionEn: 'What is your favorite color?', questionFr: 'Quelle est votre couleur préférée?', questionZh: '你最喜欢的颜色是什么？' },
];

const FINANCIAL_WISDOM_TIPS = [
  { titleAr: 'ادفع لنفسك أولاً', contentAr: 'ادخر جزءاً من دخلك قبل أي مصروف.', titleEn: 'Pay yourself first', contentEn: 'Save part of your income before spending.', titleFr: 'Payez-vous d\'abord', contentFr: 'Épargnez une partie de votre revenu avant de dépenser.', titleZh: '先支付给自己', contentZh: '在消费前先存下一部分收入。' },
  { titleAr: 'السلوك أهم من الذكاء', contentAr: 'الصبر والاستمرار يصنعان الفرق المالي.', titleEn: 'Behavior beats intelligence', contentEn: 'Patience and consistency create financial progress.', titleFr: 'Le comportement compte plus', contentFr: 'La patience et la constance créent le progrès financier.', titleZh: '行为比智力更重要', contentZh: '耐心和坚持会带来财务进步。' },
  { titleAr: 'تجنب ديون الكماليات', contentAr: 'كل قسط يقلل حريتك المستقبلية.', titleEn: 'Avoid lifestyle debt', contentEn: 'Every installment reduces your future freedom.', titleFr: 'Évitez les dettes de luxe', contentFr: 'Chaque mensualité réduit votre liberté future.', titleZh: '避免消费债务', contentZh: '每一笔分期都会减少未来自由。' },
  { titleAr: 'استثمر باستمرار', contentAr: 'المبالغ الصغيرة تكبر مع الوقت.', titleEn: 'Invest consistently', contentEn: 'Small amounts can grow over time.', titleFr: 'Investissez régulièrement', contentFr: 'Les petits montants grandissent avec le temps.', titleZh: '持续投资', contentZh: '小金额也会随着时间增长。' },
  { titleAr: 'لا تقارن نفسك بالناس', contentAr: 'ركز على خطتك لا على المظاهر.', titleEn: 'Do not compare yourself', contentEn: 'Focus on your plan, not appearances.', titleFr: 'Ne vous comparez pas', contentFr: 'Concentrez-vous sur votre plan, pas sur les apparences.', titleZh: '不要与他人比较', contentZh: '专注自己的计划，而不是外表。' },
  { titleAr: 'ارفع دخلك بالمهارات', contentAr: 'تعلم البيع والتفاوض والإدارة.', titleEn: 'Grow income with skills', contentEn: 'Learn sales, negotiation, and management.', titleFr: 'Augmentez vos revenus', contentFr: 'Apprenez la vente, la négociation et la gestion.', titleZh: '用技能增加收入', contentZh: '学习销售、谈判和管理。' },
  { titleAr: 'اصنع صندوق طوارئ', contentAr: 'احتفظ بمبلغ يحميك وقت الأزمات.', titleEn: 'Build an emergency fund', contentEn: 'Keep money that protects you in crises.', titleFr: 'Créez un fonds d\'urgence', contentFr: 'Gardez une somme qui vous protège en cas de crise.', titleZh: '建立应急基金', contentZh: '保留一笔钱应对危机。' },
  { titleAr: 'راقب مصروفاتك', contentAr: 'ما لا تقيسه يصعب تحسينه.', titleEn: 'Track your expenses', contentEn: 'What you do not measure is hard to improve.', titleFr: 'Suivez vos dépenses', contentFr: 'Ce que vous ne mesurez pas est difficile à améliorer.', titleZh: '记录你的支出', contentZh: '无法衡量的事情很难改善。' },
];

export function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [language, setLanguage] = useState<'ar' | 'en' | 'fr' | 'zh'>('ar');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [resetStep, setResetStep] = useState<'username' | 'question' | 'reset'>('username');
  const [storedQuestion, setStoredQuestion] = useState('');
  const [resetUsername, setResetUsername] = useState('');

  const isRegister = mode === 'register';
  const isArabic = language === 'ar';
  const isFrench = language === 'fr';
  const isChinese = language === 'zh';

  const t = {
    title: isArabic ? 'المدير المالي الذكي' : isFrench ? 'Gestionnaire Financier Intelligent' : isChinese ? '智能财务管理器' : 'Smart Financial Manager',
    subtitle: isArabic ? 'سجّل دخولك لإدارة أنواع دخلك الشهري ثم احصل على توزيع واضح للمصروفات والمدخرات والاستثمار.' : isFrench ? "Connectez-vous pour gérer vos revenus mensuels et obtenir une répartition claire des dépenses, économies et investissements." : isChinese ? '登录以管理您的月收入，获得清晰的支出、储蓄和投资分配。' : 'Sign in to manage your monthly income and get a clear distribution of expenses, savings, and investments.',
    createAccount: isArabic ? 'إنشاء حساب جديد' : isFrench ? 'Créer un nouveau compte' : isChinese ? '创建新账户' : 'Create new account',
    login: isArabic ? 'تسجيل الدخول' : isFrench ? 'Connexion' : isChinese ? '登录' : 'Sign in',
    forgotPassword: isArabic ? 'استعادة كلمة المرور' : isFrench ? 'Récupérer le mot de passe' : isChinese ? '找回密码' : 'Recover password',
    username: isArabic ? 'اسم المستخدم' : isFrench ? "Nom d'utilisateur" : isChinese ? '用户名' : 'Username',
    usernameOrEmail: isArabic ? 'اسم المستخدم أو البريد الإلكتروني' : isFrench ? "Nom d'utilisateur ou email" : isChinese ? '用户名或邮箱' : 'Username or email',
    password: isArabic ? 'كلمة المرور' : isFrench ? 'Mot de passe' : isChinese ? '密码' : 'Password',
    confirmPassword: isArabic ? 'تأكيد كلمة المرور' : isFrench ? 'Confirmer le mot de passe' : isChinese ? '确认密码' : 'Confirm password',
    email: isArabic ? 'البريد الإلكتروني' : isFrench ? 'Email' : isChinese ? '电子邮件' : 'Email',
    age: isArabic ? 'العمر' : isFrench ? 'Âge' : isChinese ? '年龄' : 'Age',
    gender: isArabic ? 'الجنس' : isFrench ? 'Genre' : isChinese ? '性别' : 'Gender',
    male: isArabic ? 'ذكر' : isFrench ? 'Homme' : isChinese ? '男性' : 'Male',
    female: isArabic ? 'أنثى' : isFrench ? 'Femme' : isChinese ? '女性' : 'Female',
    securityQuestion: isArabic ? 'سؤال الأمان' : isFrench ? 'Question de sécurité' : isChinese ? '安全问题' : 'Security question',
    securityAnswer: isArabic ? 'إجابة سؤال الأمان' : isFrench ? 'Réponse de sécurité' : isChinese ? '安全答案' : 'Security answer',
    next: isArabic ? 'التالي' : isFrench ? 'Suivant' : isChinese ? '下一步' : 'Next',
    verify: isArabic ? 'التحقق' : isFrench ? 'Vérifier' : isChinese ? '验证' : 'Verify',
    changePassword: isArabic ? 'تغيير كلمة المرور' : isFrench ? 'Changer le mot de passe' : isChinese ? '更改密码' : 'Change password',
    createBtn: isArabic ? 'إنشاء الحساب' : isFrench ? 'Créer le compte' : isChinese ? '创建账户' : 'Create account',
    loginBtn: isArabic ? 'تسجيل الدخول' : isFrench ? 'Se connecter' : isChinese ? '登录' : 'Sign in',
    haveAccount: isArabic ? 'لديك حساب؟' : isFrench ? 'Vous avez un compte?' : isChinese ? '已有账户？' : 'Have an account?',
    noAccount: isArabic ? 'ليس لديك حساب؟' : isFrench ? "Vous n'avez pas de compte?" : isChinese ? '没有账户？' : "Don't have an account?",
    createNew: isArabic ? 'إنشاء حساب جديد' : isFrench ? 'Créer un nouveau compte' : isChinese ? '创建新账户' : 'Create new account',
    back: isArabic ? 'العودة لتسجيل الدخول' : isFrench ? 'Retour à la connexion' : isChinese ? '返回登录' : 'Back to login',
    selectQuestion: isArabic ? 'اختر سؤالاً للأمان' : isFrench ? 'Choisir une question' : isChinese ? '选择安全问题' : 'Select a security question',
    enterAnswer: isArabic ? 'أدخل إجابتك' : isFrench ? 'Entrez votre réponse' : isChinese ? '输入您的答案' : 'Enter your answer',
    processing: isArabic ? 'جار المعالجة...' : isFrench ? 'Traitement...' : isChinese ? '处理中...' : 'Processing...',
    enterUsername: isArabic ? 'مثال: ahmad' : isFrench ? 'Exemple: jean' : isChinese ? '示例：张三' : 'Example: john',
    enterUsernameOrEmail: isArabic ? 'مثال: ahmad أو ahmad@email.com' : isFrench ? 'Exemple: jean ou jean@email.com' : isChinese ? '示例：张三 或 zhangsan@email.com' : 'Example: john or john@email.com',
    newPassword: isArabic ? 'كلمة المرور الجديدة' : isFrench ? 'Nouveau mot de passe' : isChinese ? '新密码' : 'New password',
    enterUsernameFirst: isArabic ? 'أدخل اسم المستخدم أولاً' : isFrench ? "Entrez d'abord le nom d'utilisateur" : isChinese ? '首先输入用户名' : 'Enter username first',
    noEmailFound: isArabic ? 'لا يوجد بريد إلكتروني مسجل لهذا الحساب' : isFrench ? "Aucun email trouvé pour ce compte" : isChinese ? '未找到该账户的邮箱' : 'No email found for this account',
    noSecurityQuestion: isArabic ? 'هذا الحساب ليس لديه سؤال أمان' : isFrench ? "Ce compte n'a pas de question de sécurité" : isChinese ? '此账户没有安全问题' : 'This account has no security question',
    contactSupport: isArabic ? 'تواصل مع الدعم' : isFrench ? 'Contactez le support' : isChinese ? '请联系支持' : 'Contact support',
    enterSecurityAnswer: isArabic ? 'أدخل إجابة سؤال الأمان' : isFrench ? 'Entrez la réponse de sécurité' : isChinese ? '输入安全答案' : 'Enter security answer',
    wrongSecurityAnswer: isArabic ? 'إجابة سؤال الأمان غير صحيحة' : isFrench ? 'Réponse de sécurité incorrecte' : isChinese ? '安全答案错误' : 'Wrong security answer',
    passwordMinLength: isArabic ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : isFrench ? 'Le mot de passe doit contenir au moins 6 caractères' : isChinese ? '密码必须至少6个字符' : 'Password must be at least 6 characters',
    passwordMismatch: isArabic ? 'كلمة المرور وتأكيدها غير متطابقين' : isFrench ? 'Les mots de passe ne correspondent pas' : isChinese ? '密码和确认密码不匹配' : 'Password and confirm do not match',
    errorOccurred: isArabic ? 'حدث خطأ، حاول مرة أخرى' : isFrench ? 'Une erreur est survenue, réessayez' : isChinese ? '发生错误，请重试' : 'An error occurred, try again',
    verificationError: isArabic ? 'حدث خطأ في التحقق' : isFrench ? "Erreur de vérification" : isChinese ? '验证错误' : 'Verification error',
    passwordChanged: isArabic ? 'تم تغيير كلمة المرور بنجاح' : isFrench ? 'Mot de passe changé avec succès' : isChinese ? '密码更改成功' : 'Password changed successfully',
    tryNow: isArabic ? 'يمكنك الآن تسجيل الدخول' : isFrench ? 'Vous pouvez maintenant vous connecter' : isChinese ? '您现在可以登录了' : 'You can now sign in',
    usernameRequired: isArabic ? 'اسم المستخدم مطلوب' : isFrench ? "Nom d'utilisateur requis" : isChinese ? '用户名是必填项' : 'Username is required',
    usernameMinLength: isArabic ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : isFrench ? "Le nom d'utilisateur doit contenir au moins 3 caractères" : isChinese ? '用户名必须至少3个字符' : 'Username must be at least 3 characters',
    passwordRequired: isArabic ? 'كلمة المرور مطلوبة' : isFrench ? 'Mot de passe requis' : isChinese ? '密码是必填项' : 'Password is required',
    emailRequired: isArabic ? 'البريد الإلكتروني مطلوب' : isFrench ? 'Email requis' : isChinese ? '邮箱是必填项' : 'Email is required',
    invalidEmail: isArabic ? 'البريد الإلكتروني يجب أن يحتوي على @' : isFrench ? "L'email doit contenir @" : isChinese ? '邮箱必须包含@' : 'Email must contain @',
    ageRequired: isArabic ? 'العمر مطلوب' : isFrench ? 'Âge requis' : isChinese ? '年龄是必填项' : 'Age is required',
    invalidAge: isArabic ? 'العمر يجب أن يكون بين 10 و 120' : isFrench ? 'L\'âge doit être entre 10 et 120' : isChinese ? '年龄必须在10到120之间' : 'Age must be between 10 and 120',
    genderRequired: isArabic ? 'الجنس مطلوب' : isFrench ? 'Genre requis' : isChinese ? '性别是必填项' : 'Gender is required',
    securityQuestionRequired: isArabic ? 'سؤال الأمان مطلوب' : isFrench ? 'Question de sécurité requise' : isChinese ? '安全问题是必填项' : 'Security question is required',
    securityAnswerRequired: isArabic ? 'إجابة سؤال الأمان مطلوبة' : isFrench ? 'Réponse de sécurité requise' : isChinese ? '安全答案是必填项' : 'Security answer is required',
    operationFailed: isArabic ? 'تعذر تنفيذ العملية' : isFrench ? 'Opération impossible' : isChinese ? '无法执行操作' : 'Unable to complete operation',
    guestLogin: isArabic ? 'الدخول بدون تسجيل (ضيف)' : isFrench ? 'Entrer sans inscription (invité)' : isChinese ? '无需注册进入（访客）' : 'Continue without registration (Guest)',
  };

  const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@smart-finance.local`;

  const handleForgotPassword = async () => {
    if (resetStep === 'username') {
      if (!resetUsername.trim()) { setError(t.enterUsernameFirst); return; }
      setLoading(true); setError('');
      const { data: profileData } = await supabase.from('profiles').select('email, security_question').eq('username', resetUsername.trim().toLowerCase()).maybeSingle();
      if (!profileData || !profileData.email) { setError(t.noEmailFound + '. ' + t.contactSupport); setLoading(false); return; }
      if (!profileData.security_question) { setError(t.noSecurityQuestion + '. ' + t.contactSupport); setLoading(false); return; }
      setStoredQuestion(profileData.security_question);
      setResetStep('question');
      setLoading(false);
      return;
    }
    if (resetStep === 'question') {
      if (!securityAnswer.trim()) { setError(t.enterSecurityAnswer); return; }
      setLoading(true); setError('');
      const { data: profileData } = await supabase.from('profiles').select('security_answer').eq('username', resetUsername.trim().toLowerCase()).maybeSingle();
      if (!profileData || profileData.security_answer?.toLowerCase() !== securityAnswer.trim().toLowerCase()) { setError(t.wrongSecurityAnswer); setLoading(false); return; }
      setResetStep('reset');
      setLoading(false);
      return;
    }
    if (resetStep === 'reset') {
      if (password.length < 6) { setError(t.passwordMinLength); return; }
      if (password !== confirmPassword) { setError(t.passwordMismatch); return; }
      setLoading(true); setError('');
      const { data: profileData } = await supabase.from('profiles').select('email').eq('username', resetUsername.trim().toLowerCase()).maybeSingle();
      if (!profileData || !profileData.email) { setError(t.errorOccurred); setLoading(false); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: profileData.email, password: securityAnswer });
      if (signInError) { setError(t.verificationError + ', ' + t.tryNow); setLoading(false); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError('Error updating password'); setLoading(false); return; }
      await supabase.auth.signOut();
      setForgotPasswordSuccess(t.passwordChanged + '. ' + t.tryNow);
      setResetStep('username');
      setShowForgotPassword(false);
      setLoading(false);
    }
  };

  const validateEmail = (email: string) => email.includes('@');
  const validateAge = (age: string) => { const ageNum = parseInt(age, 10); return !isNaN(ageNum) && ageNum >= 10 && ageNum <= 120; };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (username.trim().length < 3) { setError(t.usernameMinLength); return; }
    if (password.length < 6) { setError(t.passwordMinLength); return; }
    if (isRegister) {
      if (!email.trim()) { setError(t.emailRequired); return; }
      if (!validateEmail(email)) { setError(t.invalidEmail); return; }
      if (!age.trim()) { setError(t.ageRequired); return; }
      if (!validateAge(age)) { setError(t.invalidAge); return; }
      if (!gender) { setError(t.genderRequired); return; }
      if (!securityQuestion) { setError(t.securityQuestionRequired); return; }
      if (!securityAnswer.trim()) { setError(t.securityAnswerRequired); return; }
      if (password !== confirmPassword) { setError(t.passwordMismatch); return; }
    }
    setLoading(true);
    if (!isRegister) {
      const loginIdentifier = username.trim();
      const isEmail = loginIdentifier.includes('@');
      if (isEmail) {
        const { error } = await supabase.auth.signInWithPassword({ email: loginIdentifier, password });
        if (error) { setError(error.message || t.operationFailed); setLoading(false); return; }
      } else {
        const { error } = await signIn(loginIdentifier, password);
        if (error) setError(error.message || t.operationFailed);
        setLoading(false);
        return;
      }
    } else {
      const result = await signUp(username, password, email, age, gender, securityQuestion, securityAnswer);
      if (result.error) setError(result.error.message || t.operationFailed);
    }
    setLoading(false);
  };

  const getSecurityQuestionText = (questionId: string) => {
    const q = SECURITY_QUESTIONS.find(sq => sq.id === questionId);
    if (!q) return '';
    if (isArabic) return q.questionAr;
    if (isFrench) return q.questionFr;
    if (isChinese) return q.questionZh;
    return q.questionEn;
  };

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4 py-10 dark:from-blue-950 dark:via-slate-900 dark:to-blue-900">
      <div className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-10" style={{backgroundImage: 'linear-gradient(120deg,rgba(30,58,138,0.15)_0,rgba(30,58,138,0.15)_1px,transparent_1px,transparent_42px),linear-gradient(160deg,rgba(59,130,246,0.15)_0,rgba(59,130,246,0.15)_1px,transparent_1px,transparent_68px)'}} />
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="order-2 min-w-0 flex-1 overflow-hidden rounded-xl border border-blue-200 bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur sm:order-1 dark:border-blue-800 dark:bg-slate-900/85">
          <div className="flex animate-[wisdom-scroll_52s_linear_infinite] items-center gap-4 whitespace-nowrap text-xs">
            {[...FINANCIAL_WISDOM_TIPS, ...FINANCIAL_WISDOM_TIPS].map((tip, index) => {
              const title = isArabic ? tip.titleAr : isFrench ? tip.titleFr : isChinese ? tip.titleZh : tip.titleEn;
              const content = isArabic ? tip.contentAr : isFrench ? tip.contentFr : isChinese ? tip.contentZh : tip.contentEn;
              return (
                <span key={`${title}-${index}`} className="inline-flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
                  <strong>{title}</strong>
                  <span className="text-slate-600 dark:text-slate-300">{content}</span>
                </span>
              );
            })}
          </div>
        </div>
        <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
          <SelectTrigger className="order-1 w-[140px] bg-white/80 backdrop-blur border-blue-200 sm:order-2">
            <Languages className="h-4 w-4 me-2 text-blue-600" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ar">العربية</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">Francais</SelectItem>
            <SelectItem value="zh">中文</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-12 md:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-8 text-center md:text-start">
            <div className="inline-flex h-40 w-40 items-center justify-center rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/30 dark:shadow-blue-950/50">
              <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=300&fit=crop" alt="Financial Manager" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight text-blue-900 dark:text-blue-100 md:text-6xl">{t.title}</h1>
              <p className="max-w-xl text-xl leading-relaxed text-slate-700 dark:text-slate-300">{t.subtitle}</p>
            </div>
          </section>
          <Card className="border-blue-200/50 bg-white/95 shadow-[0_24px_80px_rgba(30,58,138,0.15)] backdrop-blur-2xl dark:border-blue-800/50 dark:bg-slate-900/90">
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl text-blue-900 dark:text-blue-100">{isRegister ? <UserPlus className="h-6 w-6" /> : <Lock className="h-6 w-6" />}{showForgotPassword ? t.forgotPassword : isRegister ? t.createAccount : t.login}</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">{isRegister ? (isArabic ? 'إن لم يكن لديك حساب، املأ البيانات التالية للبدء.' : isFrench ? "Si vous n'avez pas de compte, remplissez les informations suivantes pour commencer." : isChinese ? '如果您没有账户，请填写以下信息开始。' : 'If you do not have an account, fill in the following information to get started.') : showForgotPassword ? '' : (isArabic ? 'أدخل اسم المستخدم أو البريد الإلكتروني وكلمة المرور للمتابعة.' : isFrench ? "Entrez votre nom d'utilisateur ou email et mot de passe pour continuer." : isChinese ? '输入您的用户名或邮箱和密码继续。' : 'Enter your username or email and password to continue.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
                {forgotPasswordSuccess && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{forgotPasswordSuccess}</div>}
                {!showForgotPassword ? (
                  <>
                    <div className="space-y-2"><Label htmlFor="username">{isRegister ? t.username : t.usernameOrEmail}</Label><Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={isRegister ? t.enterUsername : t.enterUsernameOrEmail} dir="ltr" autoComplete="username" className="border-blue-200 focus:border-blue-500" /></div>
                    <div className="space-y-2"><Label htmlFor="password">{t.password}</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" autoComplete={isRegister ? 'new-password' : 'current-password'} className="border-blue-200 focus:border-blue-500" /></div>
                    {!isRegister && <Button type="button" variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 text-sm" onClick={() => { setShowForgotPassword(true); setError(''); setForgotPasswordSuccess(''); setResetStep('username'); }}><KeyRound className="h-4 w-4 ms-1" />{isArabic ? 'نسيت كلمة المرور؟' : isFrench ? 'Mot de passe oublié?' : isChinese ? '忘记密码？' : 'Forgot password?'}</Button>}
                  </>
                ) : (
                  <>
                    {resetStep === 'username' && <div className="space-y-2"><Label htmlFor="reset-username">{t.username}</Label><Input id="reset-username" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} placeholder={t.enterUsername} dir="ltr" autoComplete="username" className="border-blue-200 focus:border-blue-500" /></div>}
                    {resetStep === 'question' && <div className="space-y-4"><div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800"><p className="text-sm font-medium text-blue-900 dark:text-blue-100">{getSecurityQuestionText(storedQuestion)}</p></div><div className="space-y-2"><Label htmlFor="security-answer">{t.securityAnswer}</Label><Input id="security-answer" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} dir={isArabic ? 'rtl' : 'ltr'} className="border-blue-200 focus:border-blue-500" /></div></div>}
                    {resetStep === 'reset' && <div className="space-y-4"><div className="space-y-2"><Label htmlFor="new-password">{t.newPassword || 'كلمة المرور الجديدة'}</Label><Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} dir="ltr" autoComplete="new-password" className="border-blue-200 focus:border-blue-500" /></div><div className="space-y-2"><Label htmlFor="confirm-password">{t.confirmPassword}</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} dir="ltr" autoComplete="new-password" className="border-blue-200 focus:border-blue-500" /></div></div>}
                  </>
                )}
                {isRegister && !showForgotPassword && (
                  <>
                    <div className="space-y-2"><Label htmlFor="confirm-password">{t.confirmPassword}</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} dir="ltr" autoComplete="new-password" className="border-blue-200 focus:border-blue-500" /></div>
                    <div className="space-y-2"><Label htmlFor="email">{t.email}</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@domain.com" dir="ltr" autoComplete="email" className="border-blue-200 focus:border-blue-500" /></div>
                    <div className="space-y-2"><Label htmlFor="age">{t.age}</Label><Input id="age" type="number" value={age} onChange={(event) => setAge(event.target.value)} placeholder="25" dir="ltr" min="10" max="120" className="border-blue-200 focus:border-blue-500" /></div>
                    <div className="space-y-2"><Label>{t.gender}</Label><RadioGroup value={gender} onValueChange={setGender} className="flex gap-6"><div className="flex items-center gap-2"><RadioGroupItem value="male" id="male" className="text-blue-600" /><Label htmlFor="male" className="cursor-pointer">{t.male}</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="female" id="female" className="text-blue-600" /><Label htmlFor="female" className="cursor-pointer">{t.female}</Label></div></RadioGroup></div>
                    <div className="space-y-2"><Label>{t.securityQuestion}</Label><Select value={securityQuestion} onValueChange={setSecurityQuestion}><SelectTrigger className="border-blue-200 focus:border-blue-500"><SelectValue placeholder={t.selectQuestion} /></SelectTrigger><SelectContent>{SECURITY_QUESTIONS.map((q) => (<SelectItem key={q.id} value={q.id}>{isArabic ? q.questionAr : q.questionEn}</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="security-answer-reg">{t.securityAnswer}</Label><Input id="security-answer-reg" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} placeholder={t.enterAnswer} className="border-blue-200 focus:border-blue-500" /></div>
                  </>
                )}
                <Button type="submit" className="h-12 w-full bg-blue-600 text-base hover:bg-blue-700" disabled={loading}>{loading ? t.processing : showForgotPassword ? (resetStep === 'username' ? t.next : resetStep === 'question' ? t.verify : t.changePassword) : isRegister ? t.createBtn : t.loginBtn}</Button>
                {!showForgotPassword && <Button type="button" variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>{isRegister ? t.haveAccount : t.noAccount} {isRegister ? t.login : t.createNew}</Button>}
                {!showForgotPassword && (
                  <>
                    <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-slate-700" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-slate-950 px-2 text-slate-500">أو</span></div></div>
                    <Button type="button" variant="outline" className="w-full border-blue-600 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/30" onClick={() => { window.location.href = '/guest'; }}><User className="h-4 w-4 ms-2" />{t.guestLogin}</Button>
                  </>
                )}
              </form>
              {showForgotPassword && <div className="mt-4 space-y-3"><Button type="button" variant="ghost" className="w-full text-sm text-blue-600 hover:text-blue-700" onClick={() => { setShowForgotPassword(false); setForgotPasswordSuccess(''); setResetStep('username'); }}>{t.back}</Button></div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
