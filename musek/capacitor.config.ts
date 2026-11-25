import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.musek.app",
  appName: "YASUH",
  webDir: "capacitor-web",
  server: {
    url: process.env.CAPACITOR_SERVER_URL,
    cleartext: false,
    androidScheme: "https"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#080711",
      showSpinner: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#080711"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
  ios: {
    contentInset: "automatic",
    scheme: "musek"
  }
};

export default config;
