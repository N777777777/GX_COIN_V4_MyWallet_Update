import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2d7cfa0492674cc89b9c7b0a2531b69d',
  appName: 'arabian-coin-bot',
  webDir: 'dist',
  server: {
    url: 'https://gcoinv3.com/?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a1a',
      showSpinner: false
    }
  }
};

export default config;