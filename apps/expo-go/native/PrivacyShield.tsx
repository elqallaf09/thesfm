import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { disableAppSwitcherProtectionAsync, enableAppSwitcherProtectionAsync, usePreventScreenCapture } from 'expo-screen-capture';

export function PrivacyShield({ children }: { children: ReactNode }) {
  usePreventScreenCapture('sfm-private-workspace');
  const [hidden, setHidden] = useState(AppState.currentState !== 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setHidden(state !== 'active'));
    if (Platform.OS === 'ios') void enableAppSwitcherProtectionAsync(1).catch(() => undefined);
    return () => {
      subscription.remove();
      if (Platform.OS === 'ios') void disableAppSwitcherProtectionAsync().catch(() => undefined);
    };
  }, []);
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1 }} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}>{children}</View>
    {hidden ? <View style={styles.cover}><Text style={styles.label}>THE SFM</Text></View> : null}
  </View>;
}
const styles = StyleSheet.create({
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0B0D12', alignItems: 'center', justifyContent: 'center' },
  label: { color: '#EAF1FB', fontSize: 24, fontWeight: '800' },
});
