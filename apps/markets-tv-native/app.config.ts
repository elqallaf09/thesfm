import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'SFM Markets TV', slug: 'sfm-markets-tv-native', version: '0.2.0',
  orientation: 'landscape',
  platforms: ['ios', 'android'], icon: './assets/icon.png',
  ios: { bundleIdentifier: 'com.thesfm.marketstv.native', buildNumber: '2', supportsTablet: false, infoPlist: { ITSAppUsesNonExemptEncryption: false } },
  android: { package: 'com.thesfm.marketstv.tvnative', versionCode: 2, allowBackup: false,
    permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
    blockedPermissions: ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.VIBRATE', 'android.permission.SYSTEM_ALERT_WINDOW'] },
  plugins: ['expo-secure-store', ['@react-native-tvos/config-tv', { isTV: true, tvosDeploymentTarget: '17.0', androidTVBanner: './assets/banner.png',
    appleTVImages: {
      icon: './assets/tv/icon-1280x768.png', iconSmall: './assets/tv/icon-400x240.png', iconSmall2x: './assets/tv/icon-800x480.png',
      topShelf: './assets/tv/top-shelf-1920x720.png', topShelf2x: './assets/tv/top-shelf-3840x1440.png',
      topShelfWide: './assets/tv/top-shelf-2320x720.png', topShelfWide2x: './assets/tv/top-shelf-4640x1440.png',
    } }]],
  extra: { apiOrigin: 'https://www.the-sfm.com' },
};
export default config;
