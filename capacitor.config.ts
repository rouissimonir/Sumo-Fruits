import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mounirrouissi.sumofruits',
  appName: 'Sumo Fruits',
  webDir: 'dist',
  backgroundColor: '#14120E',
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scrollEnabled: false,
  },
};

export default config;
