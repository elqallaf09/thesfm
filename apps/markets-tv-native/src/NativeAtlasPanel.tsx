import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TVFocusGuideView, View } from 'react-native';
import { ATLAS_INTERVAL, atlasRepresentatives, atlasStep, initialAtlasIndex, type TvAtlasRegion } from '../../../src/lib/markets-tv/atlas';
import { tvText } from '../../../src/lib/markets-tv/i18n';
import { Label, usePresentation } from './presentation';
import { nativeAtlasFormatters, nativeAtlasSize } from './nativeAtlas';
import kuwaitArtwork from '../assets/kuwait-atlas.png';
import artGB from '../../../public/markets-tv/assets/atlas/gb.jpg';
import artUS from '../../../public/markets-tv/assets/atlas/us.jpg';
import artJP from '../../../public/markets-tv/assets/atlas/jp.jpg';
import artBH from '../../../public/markets-tv/assets/atlas/bh.jpg';
import artFR from '../../../public/markets-tv/assets/atlas/fr.jpg';
import artIT from '../../../public/markets-tv/assets/atlas/it.jpg';
import artSA from '../../../public/markets-tv/assets/atlas/sa.jpg';
import artAE from '../../../public/markets-tv/assets/atlas/ae.jpg';
import artQA from '../../../public/markets-tv/assets/atlas/qa.jpg';
import artOM from '../../../public/markets-tv/assets/atlas/om.jpg';
import artIN from '../../../public/markets-tv/assets/atlas/in.jpg';
import worldArtwork from '../assets/world-atlas.png';

const artwork = { kw: kuwaitArtwork, gb: artGB, us: artUS, jp: artJP, bh: artBH, fr: artFR, it: artIT, sa: artSA, ae: artAE, qa: artQA, om: artOM, in: artIN };

export function NativeAtlasPanel({ now, selected, suspended, autoRotate, onSelect }: { now: number; selected?: TvAtlasRegion; suspended: boolean; autoRotate: boolean; onSelect: (region: TvAtlasRegion) => void }) {
  const { language, colors, row, align } = usePresentation();
  const [index, setIndex] = useState(() => initialAtlasIndex(selected, Intl.DateTimeFormat().resolvedOptions().timeZone));
  const [playing, setPlaying] = useState(autoRotate);
  useEffect(() => {
    if (!playing || suspended) return;
    const timer = setInterval(() => setIndex(current => atlasStep(current, 1)), ATLAS_INTERVAL);
    return () => clearInterval(timer);
  }, [playing, suspended]);
  const [focused, setFocused] = useState<TvAtlasRegion | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const cities = useMemo(() => nativeAtlasFormatters(language), [language]);
  const active = cities[index];
  const representatives = atlasRepresentatives(cities, active);
  const date = useMemo(() => new Intl.DateTimeFormat(`${language}-u-ca-gregory-nu-latn`, {
    timeZone: active.zone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }), [language, active.zone]);
  const projection = nativeAtlasSize(chartSize.width, chartSize.height);
  return <View style={s.root}>
    <View style={[s.heading, row]}><Label large>{tvText(language, 'map')}</Label><Label muted>{date.format(now)}</Label></View>
    <View style={[s.stage, row]}>
      <View style={s.cover}><Image source={artwork[active.code]} style={s.artwork} resizeMode="cover" alt="" accessible={false}/>
        <View style={s.caption}><Text style={[s.country, align]}>{tvText(language, active.country)}</Text>
          <Text style={[s.landmark, align]}>{tvText(language, active.landmark)}</Text></View>
      </View>
      <View style={[s.chart, { backgroundColor: colors.panel }]} onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setChartSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
      }}>
        <View style={[s.projection, projection]}>
          <Image source={worldArtwork} style={[s.artwork, { tintColor: colors.muted, opacity: .6 }]} resizeMode="stretch" alt="" accessible={false}/>
          {cities.map(city => <View key={city.code} pointerEvents="none" accessible={false} style={[s.pin, { left: `${city.x}%`, top: `${city.y}%`, zIndex: city === active ? 2 : representatives.includes(city) ? 1 : 0 }]}>
            <View style={[s.dot, !representatives.includes(city) && s.minorDot, { backgroundColor: active === city ? colors.border : colors.text }]}/>
            {representatives.includes(city) && <Text style={[s.pinLabel, { color: colors.text, backgroundColor: colors.panel }]}>{tvText(language, city.city)}</Text>}
          </View>)}
        </View>
      </View>
    </View>
    <View style={[s.heading, row]}><Label>{tvText(language, 'localTime')}</Label>
      <View style={[s.tour, row]}>
        <TourButton title={tvText(language, 'previous')} onPress={() => { setPlaying(false); setIndex(current => atlasStep(current, -1)); }}/>
        <Label muted>{index + 1} / {cities.length}</Label>
        <TourButton title={tvText(language, 'next')} onPress={() => { setPlaying(false); setIndex(current => atlasStep(current, 1)); }}/>
        <TourButton title={tvText(language, playing ? 'pause' : 'resume')} onPress={() => setPlaying(value => !value)}/>
      </View>
    </View>
    <TVFocusGuideView autoFocus style={[s.clocks, row]}>
      {representatives.map(city => <Pressable key={city.group} accessibilityRole="button"
        accessibilityLabel={`${tvText(language, city.group)} · ${tvText(language, city.city)} · ${city.clock.format(now)} · ${city.weekday.format(now)}`}
        accessibilityState={{ selected: active.code === city.code }} onFocus={() => { setFocused(city.group); setIndex(cities.indexOf(city)); setPlaying(false); }} onBlur={() => setFocused(null)} onPress={() => onSelect(city.group)}
        style={[s.clock, { backgroundColor: colors.panel, borderColor: active.group === city.group ? colors.border : colors.muted }, focused === city.group && s.focused]}>
        <Text style={[s.region, align, { color: colors.text }]}>{tvText(language, city.group)}</Text>
        <Text style={[s.city, align, { color: colors.muted }]}>{tvText(language, city.city)}</Text>
        <Text style={[s.time, { color: colors.text }]}>{city.clock.format(now)}</Text>
        <Text style={[s.city, align, { color: colors.muted }]}>{city.weekday.format(now)}</Text>
      </Pressable>)}
    </TVFocusGuideView>
  </View>;
}

function TourButton({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors } = usePresentation();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress}
    style={[s.tourButton, { borderColor: focused ? colors.border : colors.muted, backgroundColor: colors.panel }]}>
    <Text style={[s.city, { color: colors.text }]}>{title}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  artwork: { width: '100%', height: '100%' }, caption: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,.68)', padding: 18 },
  country: { fontFamily: 'SfmArabic', fontSize: 31, color: 'white' }, landmark: { fontFamily: 'SfmArabic', fontSize: 23, color: 'white' },
  minorDot: { transform: [{ scale: .5 }] }, tour: { gap: 12, alignItems: 'center' }, tourButton: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4 },
  root: { flex: 1, gap: 14 }, heading: { alignItems: 'center', justifyContent: 'space-between', gap: 24 },
  stage: { flex: 1, minHeight: 280, gap: 24 }, cover: { width: '32%', overflow: 'hidden', borderRadius: 18 },
  // Bundled images otherwise retain their intrinsic width and height despite the insets.
  artwork: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  chart: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18, padding: 20, overflow: 'hidden' },
  projection: { direction: 'ltr' }, pin: { position: 'absolute', transform: [{ translateX: -8 }, { translateY: -8 }], gap: 3 },
  dot: { width: 16, height: 16, borderRadius: 8 }, pinLabel: { fontFamily: 'SfmArabic', fontSize: 22, borderRadius: 4, paddingHorizontal: 4 },
  clocks: { gap: 18 }, clock: { flex: 1, borderWidth: 2, borderRadius: 16, padding: 18, gap: 4 }, focused: { borderWidth: 4, padding: 16 },
  region: { fontFamily: 'SfmArabic', fontSize: 28 }, city: { fontFamily: 'SfmArabic', fontSize: 24 }, time: { fontSize: 46, fontVariant: ['tabular-nums'], writingDirection: 'ltr', textAlign: 'center' },
});
