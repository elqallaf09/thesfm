'use client';

import React, { useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { RealEstateAssetInput } from '@/lib/investments/intelligence/real-estate';
import { parsePropertyCoordinates, propertyMapLinks } from '@/lib/investments/propertyLocation';

export function PropertyLocationMap({ asset, countryName, onChange }: {
  asset: RealEstateAssetInput; countryName: string; onChange: (patch: Partial<RealEstateAssetInput>) => void;
}) {
  const { lang } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [visibleMap, setVisibleMap] = useState<string | null>(null);
  const links = propertyMapLinks(asset, countryName);
  return <div className="property-location-map">
    <label>{L('العنوان', 'Address', 'Adresse')}
      <input value={asset.address ?? ''} maxLength={500} autoComplete="street-address" placeholder={L('الشارع، رقم المبنى، المنطقة', 'Street, building number, neighborhood', 'Rue, numéro, quartier')} onChange={event => { onChange({ address: event.target.value, latitude: undefined, longitude: undefined }); setVisibleMap(null); }} />
    </label>
    <div className="property-location-map__actions">
      <MapPin size={18} aria-hidden="true" />
      {links ? <>
        <a href={links.google} target="_blank" rel="noopener noreferrer">{L('فتح في خرائط Google', 'Open in Google Maps', 'Ouvrir dans Google Maps')} <ExternalLink size={14} aria-hidden="true" /></a>
        <a href={links.osm} target="_blank" rel="noopener noreferrer">OpenStreetMap <ExternalLink size={14} aria-hidden="true" /></a>
      </> : <span>{L('أدخل العنوان أو اختر الدولة لفتح الخريطة.', 'Enter an address or select a country to open the map.', 'Saisissez une adresse ou choisissez un pays pour ouvrir la carte.')}</span>}
    </div>
    <details>
      <summary>{L('تحديد موقع العقار بدقة', 'Pin the property location', 'Positionner le bien précisément')}</summary>
      <p>{L('انسخ إحداثيات النقطة من الخريطة أو رابطًا يحتوي على إحداثياتها. الروابط المختصرة تحتاج فتحها أولًا. الموقع لا يثبت حدود القطعة.', 'Copy the pin coordinates or a link containing them. Open shortened links first. The location does not establish parcel boundaries.', 'Copiez les coordonnées du repère ou un lien les contenant. Ouvrez d’abord les liens courts. La position ne définit pas les limites cadastrales.')}</p>
      <label>{L('إحداثيات أو رابط موقع', 'Coordinates or location link', 'Coordonnées ou lien de position')}
        <input dir="ltr" value={input} maxLength={2048} placeholder="29.3759, 47.9774" onChange={event => { setInput(event.target.value); setInvalid(false); }} aria-invalid={invalid} />
      </label>
      <button type="button" onClick={() => { const point = parsePropertyCoordinates(input); setInvalid(!point); if (point) { onChange(point); setInput(''); setVisibleMap(null); } }}>{L('تثبيت الموقع', 'Set location', 'Définir la position')}</button>
      {invalid ? <p role="alert">{L('استخدم خط العرض، خط الطول أو رابط Google / OpenStreetMap يحتوي على نقطة محددة.', 'Use latitude, longitude or a Google / OpenStreetMap link containing a specific pin.', 'Utilisez latitude, longitude ou un lien Google / OpenStreetMap contenant un repère précis.')}</p> : null}
    </details>
    {links?.embed ? <div className="property-location-map__preview">
      <p><MapPin size={16} aria-hidden="true" /> <bdi>{asset.latitude}, {asset.longitude}</bdi></p>
      <div className="property-location-map__actions">
        <button type="button" onClick={() => setVisibleMap(links.embed)}>{L('عرض الخريطة', 'Show map', 'Afficher la carte')}</button>
        <button type="button" onClick={() => { onChange({ latitude: undefined, longitude: undefined }); setVisibleMap(null); }}>{L('إزالة النقطة', 'Remove pin', 'Retirer le repère')}</button>
      </div>
      {visibleMap === links.embed ? <iframe src={links.embed} title={L('موقع العقار على الخريطة', 'Property location map', 'Carte du bien')} loading="lazy" referrerPolicy="no-referrer" /> : null}
    </div> : null}
  </div>;
}
