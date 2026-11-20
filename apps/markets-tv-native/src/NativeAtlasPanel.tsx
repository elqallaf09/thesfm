import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TVFocusGuideView, View } from 'react-native';
import type { TvAtlasRegion } from '../../../src/lib/markets-tv/atlas';
import { tvText } from '../../../src/lib/markets-tv/i18n';
import { Label, usePresentation } from './presentation';
import { nativeAtlasFormatters, nativeAtlasSize } from './nativeAtlas';
import kuwaitArtwork from '../assets/kuwait-atlas.png';
import worldArtwork from '../assets/world-atlas.png';

export function NativeAtlasPanel({ now, selected, onSelect }: { now: number; selected?: TvAtlasRegion; onSelect: (region: TvAtlasRegion) => void }) {
  const { language, colors, row, align } = usePresentation();
  const [focused, setFocused] = useState<TvAtlasRegion | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const cities = useMemo(() => nativeAtlasFormatters(language), [language]);
  const date = useMemo(() => new Intl.DateTimeFormat(`${language}-u-ca-gregory-nu-latn`, {
    timeZone: 'Asia/Kuwait', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }), [language]);
  const active = focused || selected;
  const projection = nativeAtlasSize(chartSize.width, chartSize.height);
  return <View style={s.root}>
    <View style={[s.heading, row]}><Label large>{tvText(language, 'map')}</Label><Label muted>{date.format(now)}</Label></View>
    <View style={[s.stage, row]}>
      <View style={s.cover}><Image source={kuwaitArtwork} style={s.artwork} resizeMode="cover" alt="" accessible={false}/></View>
      <View style={[s.chart, { backgroundColor: colors.panel }]} onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setChartSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
      }}>
        <View style={[s.projection, projection]}>
          <Image source={worldArtwork} style={[s.artwork, { tintColor: colors.muted, opacity: .6 }]} resizeMode="stretch" alt="" accessible={false}/>
          {cities.map(city => <View key={city.group} pointerEvents="none" accessible={false} style={[s.pin, { left: `${city.x}%`, top: `${city.y}%` }]}>
            <View style={[s.dot, { backgroundColor: active === city.group ? colors.border : colors.text }]}/>
            <Text style={[s.pinLabel, { color: colors.text, backgroundColor: colors.panel }]}>{tvText(language, city.city)}</Text>
          </View>)}
        </View>
      </View>
    </View>
    <View style={[s.heading, row]}><Label>{tvText(language, 'localTime')}</Label><Label muted>{tvText(language, 'atlasHint')}</Label></View>
    <TVFocusGuideView autoFocus style={[s.clocks, row]}>
      {cities.map(city => <Pressable key={city.group} accessibilityRole="button"
        accessibilityLabel={`${tvText(language, city.group)} · ${tvText(language, city.city)} · ${city.clock.format(now)} · ${city.weekday.format(now)}`}
        accessibilityState={{ selected: selected === city.group }} onFocus={() => setFocused(city.group)} onBlur={() => setFocused(null)} onPress={() => onSelect(city.group)}
        style={[s.clock, { backgroundColor: colors.panel, borderColor: active === city.group ? colors.border : colors.muted }, focused === city.group && s.focused]}>
        <Text style={[s.region, align, { color: colors.text }]}>{tvText(language, city.group)}</Text>
        <Text style={[s.city, align, { color: colors.muted }]}>{tvText(language, city.city)}</Text>
        <Text style={[s.time, { color: colors.text }]}>{city.clock.format(now)}</Text>
        <Text style={[s.city, align, { color: colors.muted }]}>{city.weekday.format(now)}</Text>
      </Pressable>)}
    </TVFocusGuideView>
  </View>;
}

const s = StyleSheet.create({
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
