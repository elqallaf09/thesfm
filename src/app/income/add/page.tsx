'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { CurrencySelect } from '@/components/CurrencySelect';
import { useCurrency } from '@/lib/useCurrency';

const INCOME_TYPES = [
  { id: 'salary', label_ar: 'الراتب', label_en: 'Salary', label_fr: 'Salaire', icon: '💼' },
  { id: 'freelance', label_ar: 'عمل حر', label_en: 'Freelance', label_fr: 'Freelance', icon: '💻' },
  { id: 'investment', label_ar: 'استثمار', label_en: 'Investment', label_fr: 'Investissement', icon: '📈' },
  { id: 'bonus', label_ar: 'مكافأة', label_en: 'Bonus', label_fr: 'Prime', icon: '🎁' },
  { id: 'gift', label_ar: 'هدية', label_en: 'Gift', label_fr: 'Cadeau', icon: '🎀' },
  { id: 'rental', label_ar: 'إيجار', label_en: 'Rental', label_fr: 'Loyer', icon: '🏠' },
  { id: 'pension', label_ar: 'دخل تقاعدي', label_en: 'Pension', label_fr: 'Pension', icon: '👴' },
  { id: 'other', label_ar: 'دخل آخر', label_en: 'Other Income', label_fr: 'Autre revenu', icon: '💰' },
];

export default function AddIncomePage() {
  const { user, loading: authLoading } = useAuth();
  const { dir, isAr, isEn, isFr, lang } = useLanguage();
  const { currency: defaultCurrency } = useCurrency();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [incomeType, setIncomeType] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency || 'KWD');
  const [isKwdEquivalent, setIsKwdEquivalent] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const getLabel = (item: typeof INCOME_TYPES[0]) => {
    if (isAr) return item.label_ar;
    if (isFr) return item.label_fr;
    return item.label_en;
  };

  const formatAmount = (val: string) => {
    const num = val.replace(/[^\d.]/g, '');
    const parts = num.split('.');
    if (parts.length > 1) {
      return parts[0] + '.' + parts[1].slice(0, 3);
    }
    return num;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseConfigError) {
      alert(supabaseConfigError);
      return;
    }
    if (!user || !incomeType || !amount) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('monthly_income_sources').insert({
        user_id: user.id,
        category: incomeType,
        amount: parseFloat(amount),
        currency,
        amount_kwd: currency === 'KWD' ? parseFloat(amount) : null,
        label: description || getLabel(INCOME_TYPES.find(t => t.id === incomeType)!),
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        router.push('/income');
      }, 1500);
    } catch {
      alert('حدث خطأ أثناء إضافة الدخل');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !mounted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--sfm-light-card)'
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          border: '3px solid rgba(167,243,240,.2)', borderTopColor: 'var(--sfm-soft-cyan)',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  const pageTitle = isAr ? 'إضافة دخل جديد' : isFr ? 'Ajouter un revenu' : 'Add New Income';
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Tajawal', sans-serif; background: var(--sfm-light-card); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .page-container { min-height: 100vh; background: var(--sfm-light-card); padding: 24px; }
        .form-card { background: var(--sfm-card); border-radius: 24px; max-width: 600px; margin: 0 auto; padding: 32px; box-shadow: 0 8px 40px rgba(3,18,37,.08); border: 1px solid rgba(167,243,240,.12); }
        .form-title { font-size: 24px; font-weight: 900; color: var(--sfm-foreground); margin-bottom: 8px; text-align: center; }
        .form-subtitle { font-size: 14px; color: var(--sfm-muted); text-align: center; margin-bottom: 28px; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 13px; font-weight: 700; color: var(--sfm-muted); margin-bottom: 8px; }
        .form-input { width: 100%; padding: 14px 16px; border: 1.5px solid rgba(167,243,240,.25); border-radius: 14px; font-size: 15px; font-family: 'Tajawal', sans-serif; background: var(--sfm-card); color: var(--sfm-foreground); transition: all .2s; outline: none; }
        .form-input:focus { border-color: var(--sfm-soft-cyan); box-shadow: 0 0 0 3px rgba(167,243,240,.12); }
        .form-input::placeholder { color: #BFB5A8; }
        .form-select { width: 100%; padding: 14px 16px; border: 1.5px solid rgba(167,243,240,.25); border-radius: 14px; font-size: 15px; font-family: 'Tajawal', sans-serif; background: var(--sfm-card); color: var(--sfm-foreground); transition: all .2s; outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%231D8CFF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: left 14px center; }
        .form-select:focus { border-color: var(--sfm-soft-cyan); box-shadow: 0 0 0 3px rgba(167,243,240,.12); }
        .amount-section { background: linear-gradient(135deg, rgba(34,197,94,.06), rgba(34,197,94,.03)); border: 1.5px solid rgba(34,197,94,.15); border-radius: 18px; padding: 20px; margin-bottom: 20px; }
        .amount-input-wrapper { display: grid; grid-template-columns: minmax(0, 1fr) minmax(170px, 200px); gap: 12px; align-items: end; }
        .amount-input { width: 100%; min-width: 0; padding: 16px; border: 1.5px solid rgba(34,197,94,.3); border-radius: 14px; font-size: 20px; font-weight: 700; font-family: 'Tajawal', sans-serif; background: var(--sfm-card); color: var(--sfm-foreground); transition: all .2s; outline: none; text-align: center; }
        .amount-input:focus { border-color: #22C55E; box-shadow: 0 0 0 3px rgba(34,197,94,.12); }
        .currency-select { width: 100%; min-width: 170px; padding: 0; border: 0; border-radius: 0; background: transparent; color: inherit; outline: none; }
        .converted-display { margin-top: 12px; padding: 12px 16px; background: rgba(34,197,94,.08); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; }
        .converted-label { font-size: 12px; color: var(--sfm-muted); font-weight: 500; }
        .converted-value { font-size: 16px; font-weight: 800; color: #22C55E; font-family: 'Tajawal', sans-serif; }
        .btn-submit { width: 100%; padding: 16px; background: linear-gradient(135deg, #22C55E, #16A34A); border: none; border-radius: 16px; font-size: 16px; font-weight: 800; color: #FFF; cursor: pointer; font-family: 'Tajawal', sans-serif; transition: all .25s; margin-top: 24px; }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(34,197,94,.35); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .btn-cancel { width: 100%; padding: 14px; background: transparent; border: 1.5px solid rgba(167,243,240,.25); border-radius: 14px; font-size: 14px; font-weight: 600; color: var(--sfm-muted); cursor: pointer; font-family: 'Tajawal', sans-serif; transition: all .2s; margin-top: 12px; }
        .btn-cancel:hover { background: rgba(167,243,240,.08); border-color: var(--sfm-soft-cyan); }
        .income-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .income-type-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border: 1.5px solid rgba(167,243,240,.2); border-radius: 14px; background: var(--sfm-card); cursor: pointer; transition: all .2s; }
        .income-type-btn:hover { border-color: #22C55E; background: rgba(34,197,94,.03); }
        .income-type-btn.selected { border-color: #22C55E; background: rgba(34,197,94,.08); box-shadow: 0 0 0 3px rgba(34,197,94,.15); }
        .income-type-icon { font-size: 24px; }
        .income-type-label { font-size: 11px; font-weight: 600; color: var(--sfm-muted); text-align: center; }
        .success-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeUp .3s ease; }
        .success-card { background: var(--sfm-card); border-radius: 24px; padding: 40px; text-align: center; max-width: 320px; margin: 20px; }
        .success-icon { width: 80px; height: 80px; background: linear-gradient(135deg, #22C55E, #16A34A); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 20px; }
        .success-title { font-size: 20px; font-weight: 800; color: var(--sfm-foreground); margin-bottom: 8px; }
        .success-msg { font-size: 14px; color: var(--sfm-muted); }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .back-btn { width: 44px; height: 44px; background: var(--sfm-card); border: 1.5px solid rgba(167,243,240,.25); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; transition: all .2s; }
        .back-btn:hover { background: rgba(167,243,240,.08); }
        .header-title { font-size: 20px; font-weight: 800; color: var(--sfm-foreground); }
        .currency-info { font-size: 11px; color: var(--sfm-muted); margin-top: 6px; }
        @media (max-width: 640px) {
          .page-container { padding: 16px; }
          .form-card { padding: 22px; }
          .amount-input-wrapper { grid-template-columns: 1fr; }
          .currency-select { min-width: 0; }
        }
      `}</style>

      <div className="page-container" dir={dir}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Header */}
          <div className="header">
            <button className="back-btn" onClick={() => router.back()}>
              {isAr ? '→' : '←'}
            </button>
            <h1 className="header-title">{pageTitle}</h1>
          </div>

          {/* Form Card */}
          <div className="form-card" style={{ animation: mounted ? 'fadeUp 0.5s ease' : 'none', opacity: mounted ? 1 : 0 }}>
            <h2 className="form-title">
              {isAr ? 'سجّل دخلك' : isFr ? 'Enregistrer votre revenu' : 'Record your income'}
            </h2>
            <p className="form-subtitle">
              {isAr ? 'أدخل تفاصيل الدخل الجديد' : isFr ? 'Entrez les détails du nouveau revenu' : 'Enter details for the new income'}
            </p>

            <form onSubmit={handleSubmit}>
              {/* Income Type Selection */}
              <div className="form-group">
                <label className="form-label">
                  {isAr ? 'نوع الدخل *' : isFr ? 'Type de revenu *' : 'Income Type *'}
                </label>
                <div className="income-type-grid">
                  {INCOME_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      className={`income-type-btn ${incomeType === type.id ? 'selected' : ''}`}
                      onClick={() => setIncomeType(type.id)}
                    >
                      <span className="income-type-icon">{type.icon}</span>
                      <span className="income-type-label">{getLabel(type)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Section */}
              <div className="amount-section">
                <label className="form-label">
                  {isAr ? 'المبلغ *' : isFr ? 'Montant *' : 'Amount *'}
                </label>
                <div className="amount-input-wrapper">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="amount-input"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(formatAmount(e.target.value))}
                    required
                  />
                  <div className="currency-select">
                    <CurrencySelect value={currency} onChange={setCurrency} lang={lang} label={isAr ? 'العملة' : isFr ? 'Devise' : 'Currency'} ariaLabel={isAr ? 'العملة' : isFr ? 'Devise' : 'Currency'} />
                  </div>
                </div>
                {amount && currency !== 'KWD' && <div className="converted-display"><span className="converted-label">{isAr ? 'التحويل إلى الدينار الكويتي غير مفعّل حالياً.' : isFr ? 'La conversion vers le KWD n’est pas encore activée.' : 'Conversion to KWD is not enabled yet.'}</span></div>}
                <p className="currency-info">
                  {isAr ? 'سيتم تحويل المبلغ تلقائياً إلى دينار كويتي للمتابعة' :
                    isFr ? 'Le montant sera automatiquement converti en dinar koweïtien' :
                    'Amount will be automatically converted to Kuwaiti Dinar'}
                </p>
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">
                  {isAr ? 'التاريخ' : isFr ? 'Date' : 'Date'}
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">
                  {isAr ? 'الوصف' : isFr ? 'Description' : 'Description'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={isAr ? 'أدخل وصف الدخل...' : isFr ? 'Entrez la description...' : 'Enter income description...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">
                  {isAr ? 'ملاحظات إضافية' : isFr ? 'Notes supplémentaires' : 'Additional Notes'}
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={isAr ? 'ملاحظات إضافية (اختياري)...' : isFr ? 'Notes supplémentaires (optionnel)...' : 'Additional notes (optional)...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn-submit"
                disabled={loading || !incomeType || !amount}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#FFF', animation: 'spin 1s linear infinite' }} />
                    {isAr ? 'جاري الحفظ...' : isFr ? 'Enregistrement...' : 'Saving...'}
                  </span>
                ) : (
                  isAr ? 'حفظ الدخل' : isFr ? 'Enregistrer le revenu' : 'Save Income'
                )}
              </button>

              <button
                type="button"
                className="btn-cancel"
                onClick={() => router.back()}
              >
                {isAr ? 'إلغاء' : isFr ? 'Annuler' : 'Cancel'}
              </button>
            </form>
          </div>
        </div>

        {/* Success Overlay */}
        {showSuccess && (
          <div className="success-overlay">
            <div className="success-card">
              <div className="success-icon">✓</div>
              <h3 className="success-title">
                {isAr ? 'تم بنجاح!' : isFr ? 'Succès!' : 'Success!'}
              </h3>
              <p className="success-msg">
                {isAr ? 'تم إضافة الدخل بنجاح' : isFr ? 'Revenu ajouté avec succès' : 'Income added successfully'}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
