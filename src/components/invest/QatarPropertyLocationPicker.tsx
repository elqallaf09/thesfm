'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { OfficialPropertyLocation } from '@/lib/investments/intelligence/official-context';
import type { RealEstateAssetInput } from '@/lib/investments/intelligence/real-estate';

export function QatarPropertyLocationPicker({ asset, onChange }: { asset: RealEstateAssetInput; onChange: (patch: Partial<RealEstateAssetInput>) => void }) {
  const { session, isGuest } = useAuth();
  const { lang } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const token = session?.access_token;
  const [locations, setLocations] = useState<OfficialPropertyLocation[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLocations([]);
    if (!token || isGuest) { setState('error'); return () => controller.abort(); }
    setState('loading');
    void fetch('/api/investments/real-estate/locations?countryCode=QA', { cache: 'no-store', signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(async response => { const payload = await response.json(); if (!response.ok || !payload.ok || !Array.isArray(payload.locations)) throw new Error('UNAVAILABLE'); return payload.locations as OfficialPropertyLocation[]; })
      .then(items => { if (!controller.signal.aborted) { setLocations(items); setState('ready'); } })
      .catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [token, isGuest, attempt]);
  const city = asset.municipality ?? asset.city ?? '';
  const municipalities = [...new Map(locations.map(item => [item.municipality, item])).values()];
  const districts = locations.filter(item => item.municipality === city);
  return <>
    <label>{L('البلدية من المصدر الرسمي', 'Official municipality', 'Municipalité officielle')}
      <select disabled={state !== 'ready'} value={city} onChange={event => onChange({ city: event.target.value, municipality: event.target.value, district: '' })}>
        <option value="">{state === 'loading' ? L('جارٍ تحميل الدليل…', 'Loading directory…', 'Chargement…') : L('اختر البلدية', 'Choose municipality', 'Choisir la municipalité')}</option>
        {city && !municipalities.some(item => item.municipality === city) ? <option value={city}>{city}</option> : null}
        {municipalities.map(item => <option key={item.municipality} value={item.municipality}>{lang === 'ar' ? item.municipalityAr || item.municipality : item.municipality}</option>)}
      </select>
    </label>
    <label>{L('الحي من المصدر الرسمي', 'Official district', 'Quartier officiel')}
      <select disabled={state !== 'ready' || districts.length === 0} value={asset.district ?? ''} onChange={event => onChange({ district: event.target.value })}>
        <option value="">{L('اختر الحي', 'Choose district', 'Choisir le quartier')}</option>
        {asset.district && !districts.some(item => item.district === asset.district) ? <option value={asset.district}>{asset.district}</option> : null}
        {districts.map(item => <option key={item.district} value={item.district}>{lang === 'ar' ? item.districtAr || item.district : item.district}</option>)}
      </select>
    </label>
    {state === 'error' ? <p role="status">{L('تعذر تحميل دليل المناطق الرسمي. لا نستخدم مناطق وهمية.', 'Official location directory unavailable. No invented locations.', 'Annuaire officiel indisponible. Aucun lieu inventé.')} <button type="button" onClick={() => setAttempt(value => value + 1)}>{L('إعادة المحاولة', 'Retry', 'Réessayer')}</button></p> : null}
  </>;
}
