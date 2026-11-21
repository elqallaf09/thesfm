import { Image, StyleSheet, Text, View } from 'react-native';
import { Label, Panel, usePresentation } from './presentation';
import { featureText } from './featureCopy';
import { NATIVE_PROFILE_URL } from './nativeAccount';
import profileQr from '../assets/profile-qr.png';

export function NativeAccountPanel() {
  const { language, colors, row } = usePresentation();
  return <View style={s.container}><Panel><View style={[s.content, row]}>
    <View style={s.details}>
      <Label large>{featureText(language, 'account')}</Label>
      <Label>{featureText(language, 'accountDetails')}</Label>
      <Label>{featureText(language, 'accountSignIn')}</Label>
      <Label muted>{featureText(language, 'accountScan')}</Label>
      <Text selectable={false} style={[s.address, { color: colors.border }]}>{NATIVE_PROFILE_URL}</Text>
    </View>
    <Image source={profileQr} style={s.qr} resizeMode="contain" alt={featureText(language, 'accountScan')} accessibilityLabel={featureText(language, 'accountScan')}/>
  </View></Panel></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' }, content: { alignItems: 'center', gap: 64, padding: 24 },
  details: { flex: 1, gap: 24 }, address: { fontFamily: 'SfmArabic', fontSize: 32, writingDirection: 'ltr', textAlign: 'left' },
  qr: { width: 360, height: 360, borderRadius: 16, backgroundColor: '#FFFFFF' },
});
