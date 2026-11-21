import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { currentStatus, formatQuotePrice, hasPrice, type Quote } from './api';
import { quoteLabel } from './copy';
import { usePresentation } from './presentation';
import { readTicker } from './receiverApi';
import { useResource } from './useResource';

export const NativeTickerMotion = createContext(true);
const CELL = 386;
export function NativeTicker({ path, quotes, revision = 0 }: { path?: string | null; quotes?: Quote[]; revision?: number }) {
  const { language, colors } = usePresentation();
  const playing = useContext(NativeTickerMotion);
  const offset = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(true);
  const [width, setWidth] = useState(0);
  const load = useCallback(async (signal: AbortSignal) => {
    if (!path) return [];
    return readTicker(path, signal);
  }, [path]);
  const feed = useResource((path || '') + ':' + revision, load, 60000, Boolean(path));
  const available = (quotes ?? feed.data ?? []).filter(quote => hasPrice(quote));
  const items = [...new Map(available.map(q => [[q.symbol, q.exchange, q.currency].join(':'), q])).values()];
  const identity = items.map(q => q.symbol + ':' + q.exchange).join('|');
  const distance = items.length * CELL;
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    offset.setValue(0);
    if (!playing || reduced || !distance) return;
    const motion = Animated.loop(Animated.timing(offset, { toValue: -distance, duration: distance / 64 * 1000,
      easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    motion.start();
    return () => motion.stop();
  }, [offset, distance, identity, playing, reduced]);
  if (!items.length) return null;
  const copies = reduced ? 1 : Math.max(2, Math.ceil(width / distance) + 1);
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={[styles.clip, { borderColor: colors.muted }]}>
    <Animated.View style={[styles.track, { width: copies * distance, transform: [{ translateX: offset }] }]}>
      {Array.from({ length: copies }, (_, copy) => items.map(quote => {
        const change = quote.changePercent;
        const trend = change === null || change === 0 ? colors.muted : change > 0 ? colors.up : colors.down;
        const label = ['COMEX:GC1!', 'COMEX:SI1!'].includes(quote.symbol)
          ? (language === 'ar' ? quote.nameAr : quote.name).split(' · ')[0] : quote.symbol;
        return <View key={[copy, quote.exchange, quote.symbol, quote.currency].join(':')} style={styles.cell}
          accessibilityElementsHidden={copy > 0} importantForAccessibility={copy ? 'no-hide-descendants' : 'auto'}>
          <Text numberOfLines={1} style={[styles.text, { color: colors.text }]}>{label}  {formatQuotePrice(quote)} {quote.currency}</Text>
          <Text style={[styles.text, { color: trend }]}>{change === null ? '—' : (change > 0 ? '+' : '') + change.toFixed(2) + '%'}</Text>
          <Text numberOfLines={1} style={[styles.source, { color: colors.muted }]}>{quoteLabel(language, currentStatus(quote))}</Text>
        </View>;
      }))}
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  clip: { height: 38, overflow: 'hidden', borderTopWidth: 1, justifyContent: 'center', direction: 'ltr' },
  track: { flexDirection: 'row', alignItems: 'center' },
  cell: { width: CELL, paddingHorizontal: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  text: { fontSize: 18, fontVariant: ['tabular-nums'], flexShrink: 1 }, source: { fontSize: 14, flexShrink: 1 },
});
