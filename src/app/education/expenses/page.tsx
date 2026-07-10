'use client';
import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, Plus, X } from 'lucide-react';
import { formatCurrency, formatDate, normalizeDigits } from '@/lib/locale';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';

interface ExpItem { id: string; name: string; amount: number; created_at?: string; }

const CATS = {
  ar: ['السكن 🏠','الطعام 🍽','المواصلات 🚗','الصحة 💊','التعليم 📚','الترفيه 🎮','التسوق 🛒','الكهرباء والماء 💡','الاتصالات 📱','الملابس 👗','الرعاية الصحية 🏥','الأعمال الخيرية 🤲','الديون والأقساط 💳','أخرى ✨'],
  en: ['Housing 🏠','Food 🍽','Transport 🚗','Health 💊','Education 📚','Entertainment 🎮','Shopping 🛒','Electricity and water 💡','Telecommunications 📱','Clothing 👗','Healthcare 🏥','Charity 🤲','Debts and instalments 💳','Other ✨'],
  fr: ['Logement 🏠','Alimentation 🍽','Transport 🚗','Santé 💊','Formation 📚','Loisirs 🎮','Achats 🛒','Électricité et eau 💡','Télécommunications 📱','Vêtements 👗','Soins de santé 🏥','Dons caritatifs 🤲','Dettes et échéances 💳','Autre ✨'],
};

const COPY = {
  ar: { home:'الرئيسية', title:'المصروفات', subtitle:'إدارة وتتبع مصروفاتك الشهرية', close:'إغلاق', add:'إضافة مصروف', count:'عدد المصروفات', total:'إجمالي المصروفات', charity:'الأعمال الخيرية', average:'متوسط المصروف', required:'أدخل الاسم والمبلغ', updated:'تم التعديل بنجاح', added:'تمت إضافة', saveError:'تعذر حفظ المصروف', editTitle:'تعديل المصروف', addTitle:'إضافة مصروف جديد', name:'اسم المصروف أو الفئة', namePlaceholder:'مثال: فاتورة الكهرباء', amount:'المبلغ', cancel:'إلغاء', saving:'جارٍ الحفظ...', confirmEdit:'تأكيد التعديل', save:'حفظ المصروف', list:'قائمة المصروفات', search:'بحث في المصروفات...', noResults:'لا توجد نتائج لهذا البحث', empty:'لا توجد مصروفات مسجلة بعد', nameColumn:'الاسم / الفئة', date:'التاريخ', edit:'تعديل المصروف', delete:'حذف المصروف', footer:'تُحتسب جميع المصروفات المسجلة تلقائياً في لوحة التحكم الرئيسية.' },
  en: { home:'Home', title:'Expenses', subtitle:'Manage and track your monthly expenses', close:'Close', add:'Add expense', count:'Expense count', total:'Total expenses', charity:'Charity', average:'Average expense', required:'Enter a name and amount', updated:'Expense updated successfully', added:'Added', saveError:'Unable to save the expense', editTitle:'Edit expense', addTitle:'Add new expense', name:'Expense name or category', namePlaceholder:'Example: electricity bill', amount:'Amount', cancel:'Cancel', saving:'Saving...', confirmEdit:'Confirm changes', save:'Save expense', list:'Expense list', search:'Search expenses...', noResults:'No results match this search', empty:'No expenses recorded yet', nameColumn:'Name / category', date:'Date', edit:'Edit expense', delete:'Delete expense', footer:'All recorded expenses are included automatically in the main dashboard.' },
  fr: { home:'Accueil', title:'Dépenses', subtitle:'Gérez et suivez vos dépenses mensuelles', close:'Fermer', add:'Ajouter une dépense', count:'Nombre de dépenses', total:'Total des dépenses', charity:'Dons caritatifs', average:'Dépense moyenne', required:'Saisissez un nom et un montant', updated:'Dépense modifiée avec succès', added:'Ajout effectué', saveError:'Impossible d’enregistrer la dépense', editTitle:'Modifier la dépense', addTitle:'Ajouter une dépense', name:'Nom ou catégorie de la dépense', namePlaceholder:'Exemple : facture d’électricité', amount:'Montant', cancel:'Annuler', saving:'Enregistrement...', confirmEdit:'Confirmer les modifications', save:'Enregistrer la dépense', list:'Liste des dépenses', search:'Rechercher dans les dépenses...', noResults:'Aucun résultat pour cette recherche', empty:'Aucune dépense enregistrée', nameColumn:'Nom / catégorie', date:'Date', edit:'Modifier la dépense', delete:'Supprimer la dépense', footer:'Toutes les dépenses enregistrées sont automatiquement intégrées au tableau de bord principal.' },
};

function currentYM() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

export default function ExpensesPage() {
  const { user, loading } = useAuth();
  const { lang, dir } = useLanguage();
  const text = COPY[lang];
  const router = useRouter();
  const [items, setItems] = useState<ExpItem[]>([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [msg, setMsg] = useState<{type:'ok'|'err';text:string}|null>(null);
  const [filter, setFilter] = useState('');
  const [editId, setEditId] = useState<string|null>(null);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('expense_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setItems(data.map((r: any) => ({ id: r.id, name: r.name, amount: parseFloat(r.amount)||0, created_at: r.created_at })));
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 60);
    if (user) void load();
    return () => window.clearTimeout(timer);
  }, [user, load]);

  const save = async () => {
    const amt = parseFloat(normalizeDigits(amount).replace(/[^\d.]/g, ''));
    if (!name.trim() || !amt) { setMsg({ type: 'err', text: text.required }); return; }
    setSaving(true); setMsg(null);
    if (editId) {
      const { error } = await supabase.from('expense_items').update({ name: name.trim(), amount: amt }).eq('id', editId);
      if (!error) { setItems(prev => prev.map(i => i.id === editId ? { ...i, name: name.trim(), amount: amt } : i)); setMsg({ type: 'ok', text: text.updated }); }
      else setMsg({ type: 'err', text: text.saveError });
      setEditId(null);
    } else {
      const { data, error } = await supabase.from('expense_items').insert({ user_id: user!.id, name: name.trim(), amount: amt }).select().single();
      if (!error && data) { setItems(prev => [{ id: data.id, name: data.name, amount: parseFloat(data.amount)||0, created_at: data.created_at }, ...prev]); setMsg({ type: 'ok', text: `${text.added}: "${name.trim()}" — ${formatCurrency(amt, 'KWD', lang)}` }); }
      else setMsg({ type: 'err', text: text.saveError });
    }
    setName(''); setAmount(''); setShowForm(false); setSaving(false);
  };

  const remove = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('expense_items').delete().eq('id', id);
    if (!error) setItems(prev => prev.filter(i => i.id !== id));
    setDeleting(null);
  };

  const startEdit = (item: ExpItem) => { setName(item.name); setAmount(String(item.amount)); setEditId(item.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const filtered = items.filter(i => !filter || i.name.toLowerCase().includes(filter.toLowerCase()));
  const total = filtered.reduce((s, i) => s + i.amount, 0);
  const charityTotal = items.filter(i => i.name.startsWith('خيرية:')).reduce((s, i) => s + i.amount, 0);
  const S = (d: number) => ({ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: `opacity .5s ease ${d}ms, transform .5s ease ${d}ms` });

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--sfm-light-card)' }}><div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '3px solid rgba(167,243,240,.2)', borderTopColor: 'var(--sfm-soft-cyan)', animation: 'spin 1s linear infinite' }} /></div>;

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      @keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      .ep{font-family:'Tajawal',sans-serif;direction:inherit;background:var(--sfm-light-card);min-height:100vh;color:var(--sfm-foreground)}
      .ep ::-webkit-scrollbar{width:4px}.ep ::-webkit-scrollbar-thumb{background:rgba(167,243,240,.3);border-radius:10px}
      .ec{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:22px;box-shadow:0 4px 22px rgba(3,18,37,.06);transition:all .25s}
      .ec:hover:not(.no-h){transform:translateY(-2px);box-shadow:0 10px 34px rgba(3,18,37,.10)}
      .ei{width:100%;background:rgba(247,243,234,.7);border:1.5px solid rgba(167,243,240,.22);border-radius:13px;padding:12px 15px;font-family:'Tajawal',sans-serif;font-size:15px;color:var(--sfm-foreground);outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
      .ei:focus{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 3px rgba(167,243,240,.14)}
      .esel{background:rgba(247,243,234,.7) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231D8CFF' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat left 14px center;cursor:pointer;padding-left:36px}
      .ebtn{display:inline-flex;align-items:center;gap:8px;border:none;border-radius:13px;font-family:'Tajawal',sans-serif;font-weight:700;cursor:pointer;transition:all .2s;padding:11px 22px;font-size:14px}
      .ebtn-g{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 4px 14px rgba(167,243,240,.25)}
      .ebtn-g:hover:not(:disabled){background:linear-gradient(135deg,#E4BC73,#A87C4C);transform:translateY(-1px)}
      .ebtn-g:disabled{opacity:.55;cursor:not-allowed}
      .ebtn-d{background:var(--sfm-foreground);color:var(--sfm-soft-cyan)}.ebtn-d:hover{background:#222;transform:translateY(-1px)}
      .ebtn-o{background:transparent;border:1.5px solid rgba(167,243,240,.28);color:var(--sfm-muted)}.ebtn-o:hover{border-color:var(--sfm-soft-cyan);color:var(--sfm-muted)}
      .row-h:hover{background:rgba(167,243,240,.04)!important}
      @media(max-width:768px){.kg{grid-template-columns:1fr 1fr!important}.g2{grid-template-columns:1fr!important}}
    `}</style>
    <main className="ep" dir={dir}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 20px 60px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Header */}
        <div style={S(0)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px', background: 'var(--sfm-card)', border: '1.5px solid rgba(167,243,240,.22)', borderRadius: '12px', cursor: 'pointer', color: 'var(--sfm-muted)', fontSize: '13px', fontWeight: '700', fontFamily: 'Tajawal,sans-serif' }}>{dir === 'rtl' ? '←' : '→'} {text.home}</button>
              <div>
                <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: '900', color: 'var(--sfm-foreground)' }}>🛒 {text.title}</h1>
                <p style={{ fontSize: '13px', color: 'var(--sfm-muted)', marginTop: '2px' }}>{text.subtitle}</p>
              </div>
            </div>
            <LanguageSwitcher variant="gold" compact />
            <button className="ebtn ebtn-g" onClick={() => { setShowForm(!showForm); setEditId(null); setName(''); setAmount(''); }}>
              {showForm ? <><X className="w-4 h-4" />{text.close}</> : <><Plus className="w-4 h-4" />{text.add}</>}
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="kg" style={{ ...S(40), display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
          {[
            { icon: '📋', label: text.count, val: items.length, color: 'var(--sfm-soft-cyan)', isN: true },
            { icon: '💰', label: text.total, val: total, color: '#EF4444' },
            { icon: '🤲', label: text.charity, val: charityTotal, color: '#22C55E' },
            { icon: '📊', label: text.average, val: items.length > 0 ? total / items.length : 0, color: '#3B82F6' },
          ].map((k, i) => (
            <div key={i} className="ec no-h" style={{ padding: '18px 20px' }}>
              <div style={{ width: '38px', height: '38px', background: `${k.color}14`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', marginBottom: '10px' }}>{k.icon}</div>
              <div style={{ fontSize: '11px', color: 'var(--sfm-muted)', marginBottom: '4px', fontWeight: '600' }}>{k.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: k.color, fontFamily: "'IBM Plex Sans Arabic',sans-serif", lineHeight: 1 }}>
                {(k as any).isN ? k.val : formatCurrency(k.val as number, 'KWD', lang)}
              </div>
            </div>
          ))}
        </div>

        {/* Message */}
        {msg && <div style={{ padding: '13px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px', background: msg.type === 'ok' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', border: `1.5px solid ${msg.type === 'ok' ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`, color: msg.type === 'ok' ? '#16A34A' : '#DC2626', animation: 'fadeUp .3s ease', fontFamily: 'Tajawal,sans-serif', fontSize: '14px', fontWeight: '600' }}>{msg.text}</div>}

        {/* Add/Edit form */}
        {showForm && (
          <div className="ec" style={{ ...S(60), padding: '26px 28px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--sfm-foreground)', marginBottom: '20px' }}>{editId ? `✏️ ${text.editTitle}` : `➕ ${text.addTitle}`}</h3>
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>{text.name}</label>
                <input className="ei" list="cats-dl" placeholder={text.namePlaceholder} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} style={{ height: '48px' }} />
                <datalist id="cats-dl">{CATS[lang].map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--sfm-muted)', display: 'block', marginBottom: '7px' }}>{text.amount}</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid rgba(167,243,240,.22)', borderRadius: '13px', overflow: 'hidden', background: 'rgba(247,243,234,.7)' }}>
                  <span dir="ltr" style={{ padding: '0 10px', fontSize: '12px', fontWeight: '700', color: '#EF4444', borderInlineEnd: '1px solid rgba(167,243,240,.15)', height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0, fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>KWD</span>
                  <input type="text" inputMode="decimal" placeholder="0.000" dir="ltr" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} style={{ flex: 1, height: '48px', padding: '0 12px', background: 'transparent', border: 'none', outline: 'none', fontSize: '17px', fontWeight: '700', color: 'var(--sfm-foreground)', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="ebtn ebtn-o" onClick={() => { setShowForm(false); setEditId(null); setName(''); setAmount(''); }}>{text.cancel}</button>
              <button className="ebtn ebtn-g" onClick={save} disabled={saving || !name.trim() || !amount}>
                {saving ? <><span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(0,0,0,.2)', borderTopColor: 'var(--sfm-foreground)', animation: 'spin 1s linear infinite', display: 'inline-block' }} />{text.saving}</> : editId ? `✅ ${text.confirmEdit}` : `💾 ${text.save}`}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="ec" style={{ ...S(120), padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--sfm-foreground)' }}>{text.list} ({items.length})</h3>
            <input placeholder={`🔍 ${text.search}`} value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 14px', borderRadius: '12px', border: '1.5px solid rgba(167,243,240,.22)', background: 'var(--sfm-card)', fontFamily: 'Tajawal,sans-serif', fontSize: '13px', color: 'var(--sfm-foreground)', outline: 'none', width: '220px' }} />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
              <p style={{ color: 'var(--sfm-muted)', fontSize: '14px' }}>{filter ? text.noResults : text.empty}</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(167,243,240,.12)' }}>
                  {[text.nameColumn, text.amount, text.date, ''].map(h => <th key={h} style={{ padding: '9px 10px', textAlign: 'start', fontSize: '11.5px', fontWeight: '700', color: 'var(--sfm-muted)' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const isCharity = item.name.startsWith('خيرية:');
                  const displayName = isCharity ? '🤲 ' + item.name.split(':')[2] : item.name;
                  const date = item.created_at ? new Date(item.created_at) : null;
                  return (
                    <tr key={item.id} className="row-h" style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(167,243,240,.07)' : 'none', background: 'transparent', transition: 'background .15s' }}>
                      <td style={{ padding: '12px 10px', fontSize: '13.5px', color: 'var(--sfm-muted)', fontWeight: '600' }}>
                        <span style={{ fontSize: '14px', marginLeft: '6px' }}>{item.name.includes('السكن') || item.name.includes('إيجار') ? '🏠' : item.name.includes('طعام') || item.name.includes('مطعم') ? '🍽' : item.name.includes('مواصلات') || item.name.includes('سيارة') ? '🚗' : item.name.includes('صحة') ? '💊' : item.name.includes('كهرباء') ? '💡' : item.name.includes('تعليم') ? '📚' : isCharity ? '' : '💳'}</span>
                        {displayName}
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '14px', fontWeight: '800', color: '#EF4444', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>
                        <span dir="ltr">{formatCurrency(item.amount, 'KWD', lang)}</span>
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '11.5px', color: 'var(--sfm-muted)' }}>
                        {date ? formatDate(date, lang, { month: 'long', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {!isCharity && <button aria-label={text.edit} onClick={() => startEdit(item)} style={{ width: '32px', height: '32px', background: 'rgba(167,243,240,.10)', border: '1px solid rgba(167,243,240,.22)', borderRadius: '9px', cursor: 'pointer', color: 'var(--sfm-soft-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil className="w-3.5 h-3.5" /></button>}
                          <button aria-label={text.delete} onClick={() => remove(item.id)} disabled={deleting === item.id} style={{ width: '32px', height: '32px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.18)', borderRadius: '9px', cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {deleting === item.id ? <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(239,68,68,.3)', borderTopColor: '#EF4444', animation: 'spin 1s linear infinite', display: 'inline-block' }} /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid rgba(167,243,240,.12)' }}>
                  <td style={{ padding: '12px 10px', fontSize: '14px', fontWeight: '800', color: 'var(--sfm-foreground)' }}>{text.total}</td>
                  <td style={{ padding: '12px 10px', fontSize: '16px', fontWeight: '900', color: '#EF4444', fontFamily: "'IBM Plex Sans Arabic',sans-serif" }}>
                    <span dir="ltr">{formatCurrency(total, 'KWD', lang)}</span>
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--sfm-muted)', paddingTop: '8px' }}>
          {text.footer} • <span style={{ color: 'var(--sfm-soft-cyan)', fontWeight: '700' }}>THE SFM</span>
        </div>
      </div>
    </main>
  </>);
}

function Pencil({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
