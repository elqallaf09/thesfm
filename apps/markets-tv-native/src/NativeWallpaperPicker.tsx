import { Image, StyleSheet, Text, View } from 'react-native';
import { TV_WALLPAPERS, wallpaperIds, type TvWallpaper } from '../../../src/lib/markets-tv/wallpapers';
import { NATIVE_WALLPAPERS, nativeWallpaperText } from './nativeWallpapers';
import { Label, usePresentation } from './presentation';
import { TvButton } from './TvControls';

export function NativeWallpaperPicker({ selected, onSelect }: { selected: TvWallpaper; onSelect: (value: TvWallpaper) => void }) {
  const { language, colors, row, align } = usePresentation();
  return <>
    <Label muted>{nativeWallpaperText(language, 'hint')}</Label>
    <View style={[s.grid, row]}>
      {wallpaperIds.map(id => <TvButton key={id} selected={selected === id} initial={selected === id}
        label={TV_WALLPAPERS[id][language]} onPress={() => onSelect(id)} style={s.tile}>
        <Image source={NATIVE_WALLPAPERS[id]} style={s.preview} resizeMode="cover" alt="" accessible={false}/>
        <View style={[s.caption, row]}>
          <Text numberOfLines={2} style={[s.label, align, { color: colors.text }]}>{TV_WALLPAPERS[id][language]}</Text>
          {selected === id && <Text accessible={false} style={[s.check, { color: colors.border }]}>✓</Text>}
        </View>
      </TvButton>)}
    </View>
  </>;
}

const s = StyleSheet.create({
  grid: { flexWrap: 'wrap', gap: 18 },
  tile: { width: 350, paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden', justifyContent: 'flex-start' },
  preview: { width: '100%', aspectRatio: 16 / 9 },
  caption: { alignItems: 'center', gap: 8, minHeight: 58, paddingVertical: 8, paddingHorizontal: 14 },
  label: { flex: 1, fontSize: 24, fontFamily: 'SfmArabic' },
  check: { fontSize: 26 },
});
