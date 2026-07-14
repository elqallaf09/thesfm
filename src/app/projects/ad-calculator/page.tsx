'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { trackEvent } from '@/lib/analytics';
import { normalizeDigits } from '@/lib/locale';

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', pct: 30, cpm: 3.8, cpc: 0.42, color: 'var(--chart-5)' },
  { id: 'tiktok', name: 'TikTok', pct: 25, cpm: 2.9, cpc: 0.35, color: 'var(--foreground)' },
  { id: 'snapchat', name: 'Snapchat', pct: 15, cpm: 3.2, cpc: 0.38, color: 'var(--warning)' },
  { id: 'twitter', name: 'Twitter/X', pct: 10, cpm: 4.1, cpc: 0.48, color: 'var(--chart-1)' },
  { id: 'facebook', name: 'Facebook', pct: 10, cpm: 3.5, cpc: 0.40, color: 'var(--primary)' },
  { id: 'youtube', name: 'YouTube', pct: 5, cpm: 5.5, cpc: 0.62, color: 'var(--danger)' },
  { id: 'google', name: 'Google Ads', pct: 5, cpm: 6.2, cpc: 0.70, color: 'var(--success)' },
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
        .ad-page{width:100%;min-width:0;color:var(--foreground);font-family:var(--font-ui)}
        .wrap{width:100%;max-width:none;margin:0}
        .top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}
        .home{min-height:44px;border:1px solid var(--primary);border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);padding:10px 16px;font-weight:600;cursor:pointer;font-family:var(--font-ui)}
        .panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);box-shadow:var(--shadow-card);padding:22px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        label{display:block;font-size:13px;font-weight:500;color:var(--foreground-secondary);margin-bottom:7px}
        input,select{width:100%;height:var(--control-h-lg);border:1px solid var(--border-strong);border-radius:var(--radius-control);background:var(--control-background);color:var(--foreground);padding:0 13px;font:500 15px/1.5 var(--font-ui);outline:none}
        input:focus,select:focus,.home:focus-visible,.save:focus-visible{border-color:var(--focus-ring);outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
        .platform{display:grid;grid-template-columns:130px 1fr 54px;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)}
        .bar{height:24px;border-radius:var(--radius-pill);overflow:hidden;background:var(--surface-muted);display:flex;margin-top:14px}
        .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
        .kpi{background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-card);padding:16px;text-align:center}
        .kpi strong{display:block;font-size:22px;color:var(--foreground);font-family:var(--font-data);font-weight:600}
        .kpi span{font-size:12px;color:var(--foreground-muted);font-weight:500}
        .table-wrap{max-width:100%;overflow-x:auto;margin-top:14px;border:1px solid var(--border);border-radius:var(--radius-card)}table{width:100%;min-width:620px;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid var(--border);text-align:start;font-size:13px}th{background:var(--surface-muted);color:var(--foreground-secondary);font-weight:500}td:not(:first-child){font-family:var(--font-data)}
        .save{margin-top:16px;width:100%;height:50px;border:1px solid var(--primary);border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);font-weight:600;cursor:pointer;font-family:var(--font-ui)}
        .save:hover:not(:disabled),.home:hover{background:var(--primary-hover);border-color:var(--primary-hover)}
        .save:disabled{opacity:.55;cursor:not-allowed}
        @media(max-width:760px){.grid,.kpis{grid-template-columns:1fr}.platform{grid-template-columns:1fr}.top{align-items:flex-start;flex-direction:column}}
      `}</style>
      <div className="wrap">
        <div className="top">
          <button type="button" className="home" onClick={() => router.push('/dashboard')}>{dir === 'rtl' ? '→' : '←'} {t('ad_home')}</button>
        </div>
        <div className="panel" style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>🎯 {t('ad_title')}</h1>
          <p style={{ color: 'var(--foreground-secondary)', lineHeight: 1.8 }}>{t('ad_description')}</p>
        </div>
        <div className="grid">
          <div className="panel">
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label htmlFor="ad-total-budget">{t('ad_total_budget')}</label>
                <input id="ad-total-budget" inputMode="decimal" value={budget} onChange={e => setBudget(normalizeDigits(e.target.value).replace(/[^\d.]/g, ''))} placeholder="0.000" />
              </div>
              <div>
                <label htmlFor="ad-duration-days">{t('ad_duration_days')}</label>
                <input id="ad-duration-days" inputMode="numeric" value={duration} onChange={e => setDuration(normalizeDigits(e.target.value).replace(/\D/g, ''))} />
              </div>
              <div>
                <label htmlFor="ad-industry">{t('ad_industry')}</label>
                <select id="ad-industry" value={industry} onChange={e => setIndustry(e.target.value)}>
                  {INDUSTRIES.map(item => <option key={item.id} value={item.id}>{t(item.labelKey)}</option>)}
                </select>
              </div>
            <div role="status" style={{ color: totalPct === 100 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {t('ad_total_allocation')}: {totalPct}%
              </div>
              {PLATFORMS.map(platform => (
                <div className="platform" key={platform.id}>
                  <strong>{platform.name}</strong>
                  <input aria-label={`${platform.name}: ${t('ad_total_allocation')}`} type="range" min={0} max={100} value={allocations[platform.id] || 0} onChange={e => setAllocations(prev => ({ ...prev, [platform.id]: Number(e.target.value) }))} />
                  <span style={{ color: platform.color, fontWeight: 600, fontFamily: 'var(--font-data)' }}>{allocations[platform.id] || 0}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t('ad_outputs')}</h2>
            <div className="bar">
              {rows.map(row => <div key={row.id} title={row.name} style={{ width: `${row.pct}%`, background: row.color }} />)}
            </div>
            <div className="kpis">
              <div className="kpi"><strong>{totals.reach.toLocaleString(locale)}</strong><span>{t('ad_reach')}</span></div>
              <div className="kpi"><strong>{totals.clicks.toLocaleString(locale)}</strong><span>{t('ad_clicks')}</span></div>
              <div className="kpi"><strong>{totals.conversions.toLocaleString(locale)}</strong><span>{t('ad_conversions')}</span></div>
            </div>
            <div className="table-wrap"><table>
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
            </table></div>
          <div style={{ marginTop: 14, padding: 14, borderRadius: 'var(--radius-control)', background: 'var(--accent-soft)', color: 'var(--foreground-secondary)', lineHeight: 1.8, fontWeight: 500 }}>
              {t('ad_recommendation')}
            </div>
            <button className="save" disabled={!user || !totalBudget || totalPct !== 100 || saving} onClick={saveCampaign}>
              {saving ? t('ad_saving') : t('ad_save')}
            </button>
          {message && <div role={messageTone === 'error' ? 'alert' : 'status'} style={{ marginTop: 12, color: messageTone === 'ok' ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
