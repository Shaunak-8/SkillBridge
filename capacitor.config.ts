import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skillbridge.app',
  appName: 'SkillBridge',
  webDir: 'out',
  server: {
    url: 'http://10.139.203.6:3000',
    cleartext: true
  }
};

export default config;
