'use client';

import { useMemo, useState } from 'react';
import { Building2, Database, Globe2, LandPlot, Search, ShieldCheck } from 'lucide-react';
import { assessRealEstateReadiness } from '@/lib/investments/intelligence/readiness';
import type { RealEstateAssetInput } from '@/lib/investments/intelligence/real-estate';

const COUNTRIES = [
  ['KW','Kuwait'],['SA','Saudi Arabia'],['AE','United Arab Emirates'],['QA','Qatar'],['BH','Bahrain'],['OM','Oman'],
  ['TR','Türkiye'],['BA','Bosnia and Herzegovina'],['EG','Egypt'],['JO','Jordan'],['MA','Morocco'],['GB','United Kingdom'],['US','United States'],['CA','Canada'],
] as const;

export function RealEstateLandAnalyst() {
  const [asset, setAsset] = useState<RealEstateAssetInput>({ countryCode: 'KW', propertyType: 'LAND', landAreaUnit: 'M2' });
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseCurrency, setPurchaseCurrency] = useState('KWD');
  const readiness = useMemo(() => assessRealEstateReadiness(asset, []), [asset]);
  const update = (patch: Partial<RealEstateAssetInput>) => setAsset(current => ({ ...current, ...patch }));

  return <section className="real-estate-analyst" aria-labelledby="real-estate-analyst-title">
    <header className="real-estate-analyst__hero">
      <div className="real-estate-analyst__eyebrow"><LandPlot size={17} /> Real Estate Intelligence</div>
      <div>
        <h2 id="real-estate-analyst-title">Land & Real Estate Analyst</h2>
        <p>Register an asset anywhere in the world. THE SFM will only show a current valuation when enough auditable evidence is available.</p>
      </div>
      <div className={`real-estate-analyst__readiness real-estate-analyst__readiness--${readiness.state.toLowerCase()}`}>
        <ShieldCheck size={18} /> {readiness.state}
      </div>
    </header>

    <div className="real-estate-analyst__layout">
      <form className="real-estate-analyst__form" onSubmit={event => event.preventDefault()}>
        <div className="real-estate-analyst__section-title"><Globe2 size={18}/><span>Asset identity</span></div>
        <div className="real-estate-analyst__grid">
          <label>Country<select value={asset.countryCode} onChange={e => update({ countryCode: e.target.value })}>{COUNTRIES.map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></label>
          <label>Asset type<select value={asset.propertyType} onChange={e => update({ propertyType: e.target.value })}><option value="LAND">Land</option><option value="APARTMENT">Apartment</option><option value="HOUSE">House / Villa</option><option value="COMMERCIAL">Commercial</option><option value="BUILDING">Building</option></select></label>
          <label>Region / state<input value={asset.region ?? ''} onChange={e => update({ region: e.target.value })} placeholder="Region, state or governorate" /></label>
          <label>City / municipality<input value={asset.city ?? ''} onChange={e => update({ city: e.target.value })} placeholder="City or municipality" /></label>
          <label>District / area<input value={asset.district ?? ''} onChange={e => update({ district: e.target.value })} placeholder="District, neighborhood or area" /></label>
          <label>Parcel / plot ID<input value={asset.parcelIdentifier ?? ''} onChange={e => update({ parcelIdentifier: e.target.value })} placeholder="Optional official identifier" /></label>
        </div>

        <div className="real-estate-analyst__section-title"><Building2 size={18}/><span>Purchase & size</span></div>
        <div className="real-estate-analyst__grid">
          <label>Purchase date<input type="date" value={asset.purchaseDate ?? ''} onChange={e => update({ purchaseDate: e.target.value })}/></label>
          <label>Purchase price<input inputMode="decimal" value={purchasePrice} onChange={e => { setPurchasePrice(e.target.value); const n=Number(e.target.value); update({ purchasePrice: Number.isFinite(n) ? n : undefined }); }} placeholder="0.00" /></label>
          <label>Purchase currency<input value={purchaseCurrency} maxLength={3} onChange={e => { const currency=e.target.value.toUpperCase(); setPurchaseCurrency(currency); update({ purchaseCurrency: currency }); }} /></label>
          <label>Land area<input inputMode="decimal" value={asset.landArea ?? ''} onChange={e => { const n=Number(e.target.value); update({ landArea: Number.isFinite(n) && n>0 ? n : undefined }); }} placeholder="e.g. 500" /></label>
          <label>Area unit<select value={asset.landAreaUnit ?? 'M2'} onChange={e => update({ landAreaUnit: e.target.value as 'M2'|'FT2' })}><option value="M2">m²</option><option value="FT2">ft²</option></select></label>
          <label>Address / notes<input value={asset.address ?? ''} onChange={e => update({ address: e.target.value })} placeholder="Optional location description" /></label>
        </div>

        <button className="real-estate-analyst__analyze" type="button" disabled={!readiness.checks.assetIdentity || !readiness.checks.area}>
          <Search size={18}/> Search verified evidence
        </button>
        <p className="real-estate-analyst__guardrail">This action will never invent a market value. Unsupported or insufficient coverage is shown explicitly.</p>
      </form>

      <aside className="real-estate-analyst__results" aria-live="polite">
        <div className="real-estate-analyst__section-title"><Database size={18}/><span>Evidence readiness</span></div>
        <div className="real-estate-analyst__checks">
          {Object.entries(readiness.checks).map(([key, ok]) => <div key={key} className={ok ? 'is-ready' : 'is-missing'}><span>{key.replace(/([A-Z])/g,' $1')}</span><strong>{ok ? 'Ready' : 'Needed'}</strong></div>)}
        </div>
        <div className="real-estate-analyst__empty-result">
          <LandPlot size={30}/><h3>No valuation yet</h3>
          <p>Complete the asset details, then THE SFM can search available official and permitted market evidence. A valuation range will appear only after evidence checks pass.</p>
        </div>
        <div className="real-estate-analyst__future-grid">
          <div><span>Estimated value</span><strong>—</strong><small>Low — Mid — High</small></div>
          <div><span>Confidence</span><strong>—</strong><small>Evidence quality, not probability</small></div>
          <div><span>Evidence</span><strong>0</strong><small>Official / market / listing</small></div>
          <div><span>Last valuation</span><strong>—</strong><small>Historical snapshots</small></div>
        </div>
      </aside>
    </div>
  </section>;
}
