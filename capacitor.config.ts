import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.navios',
  appName: 'navios',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    hostname: 'localhost'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
