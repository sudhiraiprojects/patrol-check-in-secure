import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.229eb4f2a67149d19daa1e8d02634d3d',
  appName: 'patrol-check-in-secure',
  webDir: 'dist',
  server: {
    url: 'https://229eb4f2-a671-49d1-9daa-1e8d02634d3d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;