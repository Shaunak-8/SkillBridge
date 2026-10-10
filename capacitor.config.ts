import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillbridge.app',
  appName: 'SkillBridge',
  webDir: 'out',
  server: {
    url: 'https://skillbridge-production-e381.up.railway.app',
    cleartext: false
  },
  android: {
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
  }
};

export default config;
