'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { trackEvent } from '@/lib/analytics';
import { normalizeDigits } from '@/lib/locale';

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', pct: 30, cpm: 3.8, cpc: 0.42, color: '#EC4899' },
  { id: 'tiktok', name: 'TikTok', pct: 25, cpm: 2.9, cpc: 0.35, color: 'var(--sfm-foreground)' },
  { id: 'snapchat', name: 'Snapchat', pct: 15, cpm: 3.2, cpc: 0.38, color: '#FACC15' },
  { id: 'twitter', name: 'Twitter/X', pct: 10, cpm: 4.1, cpc: 0.48, color: '#3B82F6' },
  { id: 'facebook', name: 'Facebook', pct: 10, cpm: 3.5, cpc: 0.40, color: '#2563EB' },
  { id: 'youtube', name: 'YouTube', pct: 5, cpm: 5.5, cpc: 0.62, color: '#EF4444' },
  { id: 'google', name: 'Google Ads', pct: 5, cpm: 6.2, cpc: 0.70, color: '#22C55E' },
];

const INDUSTRIES = [
  { id: 'ecommerce', labelKey: 'ad_industry_ecommerce' },
  { id: 'services', labelKey: 'ad_industry_services' },
  { id: 'saas', labelKey: 'ad_industry_saas' },
  { id: 'restaurant', labelKey: 'ad_industry_restaurant' },
];

function amountOf(value: string) {
  return parseFloat(normalizeDigits(value).replace(/[^\d.]/g, '')) || 0;
}

export default function AdCampaignCalculatorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { dir, lang, t } = useLanguage();
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('30');
  const [industry, setIndustry] = useState('ecommerce');
  const [allocations, setAllocations] = useState<Record<string, number>>(
    Object.fromEntries(PLATFORMS.map(platform => [platform.id, platform.pct])),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'ok' | 'error'>('ok');

  const totalPct = useMemo(() => Object.values(allocations).reduce((sum, pct) => sum + pct, 0), [allocations]);
  const totalBudget = amountOf(budget);
  const days = Math.max(1, parseInt(duration, 10) || 1);

  const rows = PLATFORMS.map(platform => {
    const pct = allocations[platform.id] || 0;
    const platformBudget = totalBudget * (pct / 100);
    const daily = platformBudget / days;
    const reach = Math.round((platformBudget / platform.cpm) * 1000);
    const clicks = Math.round(platformBudget / platform.cpc);
    return { ...platform, pct, platformBudget, daily, reach, clicks, conversions: Math.round(clicks * 0.02) };
  });

  const totals = rows.reduce((acc, row) => ({
    reach: acc.reach + row.reach,
    clicks: acc.clicks + row.clicks,
    conversions: acc.conversions + row.conversions,
  }), { reach: 0, clicks: 0, conversions: 0 });

  async function saveCampaign() {
    if (!user || !totalBudget || totalPct !== 100) return;
    setSaving(true);
    setMessage('');
    try {
      const projectNotes = {
        type: 'ad_campaign',
        total_budget: totalBudget,
        duration_days: days,
        platforms: allocations,
        industry,
        estimated_reach: totals.reach,
        estimated_clicks: totals.clicks,
      };
      const { data: project, error: projectError } = await supabase.from('projects').insert({
        user_id: user.id,
        name: t('ad_campaign_name'),
        emoji: '🎯',
        budget: String(totalBudget),
        timeline: `${days} days`,
        duration_unit: 'day',
        steps: [],
        notes: projectNotes,
      }).select().single();
      if (projectError) throw projectError;

      const { error } = await supabase.from('ad_campaigns').insert({
        user_id: user.id,
        project_id: project.id,
        name: t('ad_campaign_name'),
        total_budget: totalBudget,
        duration_days: days,
        platforms: allocations,
        industry,
        estimated_reach: totals.reach,
        estimated_clicks: totals.clicks,
      }).select().single();
      if (error) throw error;
      void trackEvent('use_calculator', { module: 'projects', metadata: { calculator_type: 'ad_campaign', industry } });
      void trackEvent('create_project', { module: 'projects', metadata: { source: 'ad_campaign_calculator' } });
      setMessageTone('ok');
      setMessage(t('ad_saved'));
    } catch {
      setMessageTone('error');
      setMessage(t('ad_save_error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir={dir} className="ad-page">
      <style>{`
        .ad-page{min-height:100vh;background:var(--sfm-light-card);color:var(--sfm-foreground);font-family:Tajawal,Arial,sans-serif;padding:24px}
        .wrap{max-width:1120px;margin:0 auto}
        .top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}
        .home{border:0;border-radius:var(--r-md);background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;padding:10px 16px;font-weight:800;cursor:pointer;font-family:Tajawal,Arial,sans-serif}
        .panel{background:var(--sfm-card);border:1px solid rgba(167,243,240,.14);border-radius:var(--r-2xl);box-shadow:0 4px 22px rgba(3,18,37,.06);padding:22px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        label{display:block;font-size:13px;font-weight:800;color:var(--sfm-muted);margin-bottom:7px}
        input,select{width:100%;height:var(--control-h-lg);border:1.5px solid rgba(167,243,240,.24);border-radius:var(--r-md);background:var(--sfm-card);padding:0 13px;font:700 15px Tajawal,Arial,sans-serif;outline:none}
        input:focus,select:focus{border-color:var(--sfm-soft-cyan);box-shadow:0 0 0 3px rgba(167,243,240,.12)}
        .platform{display:grid;grid-template-columns:130px 1fr 54px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid rgba(167,243,240,.08)}
        .bar{height:24px;border-radius:999px;overflow:hidden;background:rgba(167,243,240,.10);display:flex;margin-top:14px}
        .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
        .kpi{background:rgba(167,243,240,.08);border-radius:var(--r-lg);padding:16px;text-align:center}
        .kpi strong{display:block;font-size:22px;color:var(--sfm-foreground)}
        .kpi span{font-size:12px;color:var(--sfm-muted);font-weight:800}
        table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:10px;border-bottom:1px solid rgba(167,243,240,.10);text-align:start;font-size:13px}th{color:var(--sfm-muted)}
        .save{margin-top:16px;width:100%;height:50px;border:0;border-radius:var(--r-md);background:var(--sfm-foreground);color:var(--sfm-soft-cyan);font-weight:900;cursor:pointer;font-family:Tajawal,Arial,sans-serif}
        .save:disabled{opacity:.55;cursor:not-allowed}
        @media(max-width:760px){.grid,.kpis{grid-template-columns:1fr}.platform{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}}
      `}</style>
      <div className="wrap">
        <div className="top">
          <button className="home" onClick={() => router.push('/dashboard')}>{dir === 'rtl' ? '←' : '→'} {t('ad_home')}</button>
          <LanguageSwitcher variant="gold" compact />
        </div>
        <div className="panel" style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>🎯 {t('ad_title')}</h1>
          <p style={{ color: 'var(--sfm-muted)', lineHeight: 1.8 }}>{t('ad_description')}</p>
        </div>
        <div className="grid">
          <div className="panel">
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label>{t('ad_total_budget')}</label>
                <input inputMode="decimal" value={budget} onChange={e => setBudget(normalizeDigits(e.target.value).replace(/[^\d.]/g, ''))} placeholder="0.000" />
              </div>
              <div>
                <label>{t('ad_duration_days')}</label>
                <input inputMode="numeric" value={duration} onChange={e => setDuration(normalizeDigits(e.target.value).replace(/\D/g, ''))} />
              </div>
              <div>
                <label>{t('ad_industry')}</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)}>
                  {INDUSTRIES.map(item => <option key={item.id} value={item.id}>{t(item.labelKey)}</option>)}
                </select>
              </div>
              <div style={{ color: totalPct === 100 ? '#22C55E' : '#EF4444', fontWeight: 900 }}>
                {t('ad_total_allocation')}: {totalPct}%
              </div>
              {PLATFORMS.map(platform => (
                <div className="platform" key={platform.id}>
                  <strong>{platform.name}</strong>
                  <input type="range" min={0} max={100} value={allocations[platform.id] || 0} onChange={e => setAllocations(prev => ({ ...prev, [platform.id]: Number(e.target.value) }))} />
                  <span style={{ color: platform.color, fontWeight: 900 }}>{allocations[platform.id] || 0}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{t('ad_outputs')}</h2>
            <div className="bar">
              {rows.map(row => <div key={row.id} title={row.name} style={{ width: `${row.pct}%`, background: row.color }} />)}
            </div>
            <div className="kpis">
              <div className="kpi"><strong>{totals.reach.toLocaleString(locale)}</strong><span>{t('ad_reach')}</span></div>
              <div className="kpi"><strong>{totals.clicks.toLocaleString(locale)}</strong><span>{t('ad_clicks')}</span></div>
              <div className="kpi"><strong>{totals.conversions.toLocaleString(locale)}</strong><span>{t('ad_conversions')}</span></div>
            </div>
            <table>
              <thead><tr><th>{t('ad_platform')}</th><th>{t('ad_daily')}</th><th>{t('ad_reach')}</th><th>{t('ad_clicks')}</th></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.daily.toLocaleString(locale, { maximumFractionDigits: 3 })}</td>
                    <td>{row.reach.toLocaleString(locale)}</td>
                    <td>{row.clicks.toLocaleString(locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 14, padding: 14, borderRadius: 'var(--r-md)', background: 'rgba(167,243,240,.08)', color: 'var(--sfm-muted)', lineHeight: 1.8, fontWeight: 700 }}>
              {t('ad_recommendation')}
            </div>
            <button className="save" disabled={!user || !totalBudget || totalPct !== 100 || saving} onClick={saveCampaign}>
              {saving ? t('ad_saving') : t('ad_save')}
            </button>
            {message && <div style={{ marginTop: 12, color: messageTone === 'ok' ? '#22C55E' : '#EF4444', fontWeight: 800 }}>{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
