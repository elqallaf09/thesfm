'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

const EXPENSE_CATEGORIES = [
  { id: 'transport', label_ar: 'المواصلات', label_en: 'Transport', label_fr: 'Transport', icon: '🚌' },
  { id: 'food', label_ar: 'الطعام', label_en: 'Food', label_fr: 'Alimentation', icon: '🍽️' },
  { id: 'housing', label_ar: 'السكن', label_en: 'Housing', label_fr: 'Logement', icon: '🏠' },
  { id: 'shopping', label_ar: 'التسوق', label_en: 'Shopping', label_fr: 'Shopping', icon: '🛍️' },
  { id: 'entertainment', label_ar: 'الترفيه', label_en: 'Entertainment', label_fr: 'Divertissement', icon: '🎬' },
  { id: 'utilities', label_ar: 'الخدمات', label_en: 'Utilities', label_fr: 'Services', icon: '💡' },
  { id: 'health', label_ar: 'الصحة', label_en: 'Health', label_fr: 'Santé', icon: '🏥' },
  { id: 'education', label_ar: 'التعليم', label_en: 'Education', label_fr: 'Éducation', icon: '📚' },
  { id: 'other', label_ar: 'أخرى', label_en: 'Other', label_fr: 'Autre', icon: '📦' },
];

const CURRENCIES = [
  { code: 'KWD', symbol: 'د.ك', label_ar: 'دينار كويتي', label_en: 'Kuwaiti Dinar', label_fr: 'Dinar koweïtien' },
  { code: 'SAR', symbol: 'ر.س', label_ar: 'ريال سعودي', label_en: 'Saudi Riyal', label_fr: 'Riyal saoudien' },
  { code: 'AED', symbol: 'د.إ', label_ar: 'درهم إماراتي', label_en: 'UAE Dirham', label_fr: 'Dirham émirati' },
  { code: 'USD', symbol: '$', label_ar: 'دولار أمريكي', label_en: 'US Dollar', label_fr: 'Dollar américain' },
  { code: 'EUR', symbol: '€', label_ar: 'يورو', label_en: 'Euro', label_fr: 'Euro' },
];

export default function AddExpensePage() {
  const { user, loading: authLoading } = useAuth();
  const { dir, isAr, isEn, isFr, t } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('KWD');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMounted(true);
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const getLabel = (item: typeof EXPENSE_CATEGORIES[0]) => {
    if (isAr) return item.label_ar;
    if (isFr) return item.label_fr;
    return item.label_en;
  };

  const getCurrencyLabel = (curr: typeof CURRENCIES[0]) => {
    if (isAr) return curr.label_ar;
    if (isFr) return curr.label_fr;
    return curr.label_en;
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
    if (!user || !category || !amount) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('expense_items').insert({
        user_id: user.id,
        category,
        amount: parseFloat(amount),
        currency,
        date,
        description: description || getLabel(EXPENSE_CATEGORIES.find(c => c.id === category)!),
        notes,
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      console.error('Error adding expense:', err);
      alert('حدث خطأ أثناء إضافة المصروف');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !mounted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#F7F3EA'
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          border: '3px solid rgba(216,174,99,.2)', borderTopColor: '#D8AE63',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  const pageTitle = isAr ? 'إضافة مصروف جديد' : isFr ? 'Ajouter une dépense' : 'Add New Expense';
  const currentCurrency = CURRENCIES.find(c => c.code === currency)!;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Tajawal', sans-serif; background: #F7F3EA; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .page-container { min-height: 100vh; background: #F7F3EA; padding: 24px; }
        .form-card { background: #FFFDFC; border-radius: 24px; max-width: 600px; margin: 0 auto; padding: 32px; box-shadow: 0 8px 40px rgba(90,67,51,.08); border: 1px solid rgba(216,174,99,.12); }
        .form-title { font-size: 24px; font-weight: 900; color: #111; margin-bottom: 8px; text-align: center; }
        .form-subtitle { font-size: 14px; color: #9A6C3C; text-align: center; margin-bottom: 28px; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 13px; font-weight: 700; color: #5B4332; margin-bottom: 8px; }
        .form-input { width: 100%; padding: 14px 16px; border: 1.5px solid rgba(216,174,99,.25); border-radius: 14px; font-size: 15px; font-family: 'Tajawal', sans-serif; background: #FFFDFC; color: #111; transition: all .2s; outline: none; }
        .form-input:focus { border-color: #D8AE63; box-shadow: 0 0 0 3px rgba(216,174,99,.12); }
        .form-input::placeholder { color: #BFB5A8; }
        .form-select { width: 100%; padding: 14px 16px; border: 1.5px solid rgba(216,174,99,.25); border-radius: 14px; font-size: 15px; font-family: 'Tajawal', sans-serif; background: #FFFDFC; color: #111; transition: all .2s; outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23D8AE63' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: left 14px center; }
        .form-select:focus { border-color: #D8AE63; box-shadow: 0 0 0 3px rgba(216,174,99,.12); }
        .amount-input-wrapper { display: flex; gap: 10px; }
        .amount-input { flex: 1; padding: 14px 16px; border: 1.5px solid rgba(216,174,99,.25); border-radius: 14px; font-size: 18px; font-weight: 700; font-family: 'Tajawal', sans-serif; background: #FFFDFC; color: #111; transition: all .2s; outline: none; text-align: center; }
        .amount-input:focus { border-color: #D8AE63; box-shadow: 0 0 0 3px rgba(216,174,99,.12); }
        .currency-select { width: 120px; padding: 14px 12px; border: 1.5px solid rgba(216,174,99,.25); border-radius: 14px; font-size: 14px; font-weight: 700; font-family: 'Tajawal', sans-serif; background: linear-gradient(135deg, #D8AE63, #9A6C3C); color: #111; transition: all .2s; outline: none; cursor: pointer; }
        .btn-submit { width: 100%; padding: 16px; background: linear-gradient(135deg, #D8AE63, #9A6C3C); border: none; border-radius: 16px; font-size: 16px; font-weight: 800; color: #111; cursor: pointer; font-family: 'Tajawal', sans-serif; transition: all .25s; margin-top: 24px; }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(216,174,99,.35); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .btn-cancel { width: 100%; padding: 14px; background: transparent; border: 1.5px solid rgba(216,174,99,.25); border-radius: 14px; font-size: 14px; font-weight: 600; color: #9A6C3C; cursor: pointer; font-family: 'Tajawal', sans-serif; transition: all .2s; margin-top: 12px; }
        .btn-cancel:hover { background: rgba(216,174,99,.08); border-color: #D8AE63; }
        .category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .category-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 1.5px solid rgba(216,174,99,.2); border-radius: 14px; background: #FFFDFC; cursor: pointer; transition: all .2s; }
        .category-btn:hover { border-color: #D8AE63; background: rgba(216,174,99,.05); }
        .category-btn.selected { border-color: #D8AE63; background: rgba(216,174,99,.1); box-shadow: 0 0 0 3px rgba(216,174,99,.15); }
        .category-icon { font-size: 24px; }
        .category-label { font-size: 12px; font-weight: 600; color: #5B4332; text-align: center; }
        .success-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeUp .3s ease; }
        .success-card { background: #FFFDFC; border-radius: 24px; padding: 40px; text-align: center; max-width: 320px; margin: 20px; }
        .success-icon { width: 80px; height: 80px; background: linear-gradient(135deg, #22C55E, #16A34A); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 20px; }
        .success-title { font-size: 20px; font-weight: 800; color: #111; margin-bottom: 8px; }
        .success-msg { font-size: 14px; color: #9A6C3C; }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .back-btn { width: 44px; height: 44px; background: #FFFDFC; border: 1.5px solid rgba(216,174,99,.25); border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; transition: all .2s; }
        .back-btn:hover { background: rgba(216,174,99,.08); }
        .header-title { font-size: 20px; font-weight: 800; color: #111; }
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
              {isAr ? 'سجّل مصروفك' : isFr ? 'Enregistrer votre dépense' : 'Record your expense'}
            </h2>
            <p className="form-subtitle">
              {isAr ? 'أدخل تفاصيل المصروف الجديد' : isFr ? 'Entrez les détails de la nouvelle dépense' : 'Enter details for the new expense'}
            </p>

            <form onSubmit={handleSubmit}>
              {/* Category Selection */}
              <div className="form-group">
                <label className="form-label">
                  {isAr ? 'نوع المصروف *' : isFr ? 'Type de dépense *' : 'Expense Type *'}
                </label>
                <div className="category-grid">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-btn ${category === cat.id ? 'selected' : ''}`}
                      onClick={() => setCategory(cat.id)}
                    >
                      <span className="category-icon">{cat.icon}</span>
                      <span className="category-label">{getLabel(cat)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Currency */}
              <div className="form-group">
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
                  <select
                    className="currency-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
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
                  max={new Date().toISOString().split('T')[0]}
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
                  placeholder={isAr ? 'أدخل وصف المصروف...' : isFr ? 'Entrez la description...' : 'Enter expense description...'}
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
                disabled={loading || !category || !amount}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(0,0,0,.2)', borderTopColor: '#111', animation: 'spin 1s linear infinite' }} />
                    {isAr ? 'جاري الحفظ...' : isFr ? 'Enregistrement...' : 'Saving...'}
                  </span>
                ) : (
                  isAr ? 'حفظ المصروف' : isFr ? 'Enregistrer la dépense' : 'Save Expense'
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
                {isAr ? 'تم إضافة المصروف بنجاح' : isFr ? 'Dépense ajoutée avec succès' : 'Expense added successfully'}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
