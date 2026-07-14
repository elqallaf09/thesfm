'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { CurrencySelect } from '@/components/CurrencySelect';
import { useCurrency } from '@/lib/useCurrency';
import { trackEvent } from '@/lib/analytics';
import { normalizeDigits } from '@/lib/locale';

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

const NECESSITIES = [
  { id: 'essential', ar: 'ضروري', en: 'Essential', fr: 'Essentiel', color: 'var(--danger)', hintAr: 'الإيجار، الفواتير', hintEn: 'Rent, bills', hintFr: 'Loyer, factures' },
  { id: 'important', ar: 'مهم', en: 'Important', fr: 'Important', color: 'var(--warning)', hintAr: 'التأمين، التعليم', hintEn: 'Insurance, education', hintFr: 'Assurance, éducation' },
  { id: 'optional', ar: 'اختياري', en: 'Optional', fr: 'Facultatif', color: 'var(--success)', hintAr: 'الترفيه، التسوق', hintEn: 'Entertainment, shopping', hintFr: 'Divertissement, achats' },
];

export default function AddExpensePage() {
  const { user, loading: authLoading } = useAuth();
  const { dir, isAr, isEn, isFr, lang } = useLanguage();
  const { currency: defaultCurrency } = useCurrency();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [category, setCategory] = useState('');
  const [necessity, setNecessity] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency || 'KWD');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const getLabel = (item: typeof EXPENSE_CATEGORIES[0]) => {
    if (isAr) return item.label_ar;
    if (isFr) return item.label_fr;
    return item.label_en;
  };

  const formatAmount = (val: string) => {
    const num = normalizeDigits(val).replace(/[^\d.]/g, '');
    const parts = num.split('.');
    if (parts.length > 1) {
      return parts[0] + '.' + parts[1].slice(0, 3);
    }
    return num;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseConfigError) {
      alert(isAr ? 'خدمة حفظ البيانات غير مهيأة حالياً.' : isFr ? 'Le service d’enregistrement des données n’est pas configuré actuellement.' : 'The data-saving service is not currently configured.');
      return;
    }
    if (!user || !category || !necessity || !amount) return;

    setLoading(true);
    try {
      const selectedCategory = EXPENSE_CATEGORIES.find(c => c.id === category)!;
      const selectedNecessity = NECESSITIES.find(item => item.id === necessity)!;
      const userText = description.trim() || getLabel(selectedCategory);
      const { error } = await supabase.from('expense_items').insert({
        user_id: user.id,
        amount: parseFloat(amount),
        currency,
        name: `${getLabel(selectedCategory)} | ${isAr ? selectedNecessity.ar : isFr ? selectedNecessity.fr : selectedNecessity.en} | ${userText}${notes.trim() ? ` | ${notes.trim()}` : ''}`,
      }).select().single();

      if (error) throw error;

      void trackEvent('add_expense', { module: 'expenses', metadata: { category, necessity, currency } });
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/expenses');
      }, 1500);
    } catch {
      alert(isAr ? 'تعذر إضافة المصروف.' : isFr ? 'Impossible d’ajouter la dépense.' : 'Unable to add the expense.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !mounted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--surface-muted)'
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: 'var(--radius-pill)',
          border: '3px solid var(--border)', borderTopColor: 'var(--primary)',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  const pageTitle = isAr ? 'إضافة مصروف جديد' : isFr ? 'Ajouter une dépense' : 'Add New Expense';
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--font-ui); background: var(--background); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .page-container { min-height: 100vh; background: var(--background); padding: 24px; color: var(--foreground); }
        .form-card { background: var(--surface); border-radius: var(--radius-panel); max-width: 600px; margin: 0 auto; padding: 32px; box-shadow: var(--shadow-md); border: 1px solid var(--border); }
        .form-title { font-size: 24px; font-weight: 700; color: var(--foreground); margin-bottom: 8px; text-align: center; }
        .form-subtitle { font-size: 14px; color: var(--foreground-secondary); text-align: center; margin-bottom: 28px; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--foreground-secondary); margin-bottom: 8px; }
        .form-input,
        .form-select,
        .amount-input { width: 100%; padding: 14px 16px; border: 1px solid var(--border-strong); border-radius: var(--radius-control); font-size: 15px; font-family: var(--font-ui); background: var(--control-background); color: var(--foreground); transition: border-color var(--duration), box-shadow var(--duration), background var(--duration); outline: none; }
        .form-input:focus,
        .form-select:focus,
        .amount-input:focus { border-color: var(--focus-ring); box-shadow: var(--focus-shadow); }
        .form-input::placeholder,
        .amount-input::placeholder { color: var(--control-placeholder); }
        .form-select { cursor: pointer; }
        .amount-input-wrapper { display: grid; grid-template-columns: minmax(0, 1fr) minmax(170px, 200px); gap: 12px; align-items: end; }
        .amount-input { min-width: 0; font-size: 18px; font-weight: 600; font-family: var(--font-data); text-align: center; }
        .currency-select { width: 100%; min-width: 170px; padding: 0; border: 0; border-radius: 0; background: transparent; color: inherit; outline: none; }
        .btn-submit { width: 100%; padding: 16px; background: var(--primary); border: none; border-radius: var(--radius-card); font-size: 16px; font-weight: 600; color: var(--primary-foreground); cursor: pointer; font-family: var(--font-ui); transition: background var(--duration), transform var(--duration); margin-top: 24px; }
        .btn-submit:hover { background: var(--primary-hover); transform: translateY(-1px); }
        .btn-submit:focus-visible,
        .btn-cancel:focus-visible,
        .category-btn:focus-visible,
        .necessity-btn:focus-visible,
        .back-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .btn-cancel { width: 100%; padding: 14px; background: transparent; border: 1px solid var(--border-strong); border-radius: var(--radius-control); font-size: 14px; font-weight: 600; color: var(--foreground-secondary); cursor: pointer; font-family: var(--font-ui); transition: background var(--duration), border-color var(--duration); margin-top: 12px; }
        .btn-cancel:hover { background: var(--control-hover); border-color: var(--border-strong); }
        .category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .category-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface); cursor: pointer; transition: background var(--duration), border-color var(--duration); }
        .category-btn:hover { border-color: var(--border-strong); background: var(--surface-hover); }
        .category-btn.selected { border-color: var(--primary); background: var(--primary-soft); box-shadow: var(--active-indicator-shadow); }
        .necessity-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .necessity-btn { border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface); padding: 12px; cursor: pointer; text-align: center; font-family: var(--font-ui); transition: background var(--duration), border-color var(--duration); }
        .necessity-btn:hover { background: var(--surface-hover); }
        .necessity-btn.selected { background: var(--surface-active); box-shadow: var(--active-indicator-shadow); }
        .category-icon { font-size: 24px; }
        .category-label { font-size: 12px; font-weight: 500; color: var(--foreground-secondary); text-align: center; }
        .success-overlay { position: fixed; inset: 0; background: var(--background-overlay); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeUp .3s ease; }
        .success-card { background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-panel); box-shadow: var(--shadow-popover); padding: 40px; text-align: center; max-width: 320px; margin: 20px; }
        .success-icon { width: 80px; height: 80px; background: var(--success); color: var(--primary-foreground); border-radius: var(--radius-pill); display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 20px; }
        .success-title { font-size: 20px; font-weight: 600; color: var(--foreground); margin-bottom: 8px; }
        .success-msg { font-size: 14px; color: var(--foreground-secondary); }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .back-btn { width: 44px; height: var(--control-h); background: var(--control-background); color: var(--foreground); border: 1px solid var(--border); border-radius: var(--radius-control); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; transition: background var(--duration), border-color var(--duration); }
        .back-btn:hover { background: var(--control-hover); }
        .header-title { font-size: 20px; font-weight: 600; color: var(--foreground); }
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

              <div className="form-group">
                <label className="form-label">
                  {isAr ? 'درجة الضرورة *' : isFr ? 'Niveau de nécessité *' : 'Necessity *'}
                </label>
                <div className="necessity-row">
                  {NECESSITIES.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`necessity-btn ${necessity === item.id ? 'selected' : ''}`}
                      onClick={() => setNecessity(item.id)}
                      style={{ borderColor: necessity === item.id ? item.color : 'var(--border)' }}
                    >
                      <div style={{ fontWeight: 700, color: item.color }}>{isAr ? item.ar : isFr ? item.fr : item.en}</div>
                      <div style={{ fontSize: '12px', color: 'var(--foreground-muted)', marginTop: '4px' }}>{isAr ? item.hintAr : isFr ? item.hintFr : item.hintEn}</div>
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
                  <div className="currency-select">
                    <CurrencySelect value={currency} onChange={setCurrency} lang={lang} label={isAr ? 'العملة' : isFr ? 'Devise' : 'Currency'} ariaLabel={isAr ? 'العملة' : isFr ? 'Devise' : 'Currency'} />
                  </div>
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
                disabled={loading || !category || !necessity || !amount}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: 'var(--radius-pill)', border: '2px solid color-mix(in srgb, var(--primary-foreground) 35%, transparent)', borderTopColor: 'var(--primary-foreground)', animation: 'spin 1s linear infinite' }} />
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
