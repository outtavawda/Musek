import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.musek.app",
  appName: "MUSEK",
  webDir: "out",
  server: {
    // Native builds must point to the deployed MUSEK origin until a
    // static-export-compatible native build is configured.
    androidScheme: "https"
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#080711",
      showSpinner: false
    }
  }
};

export default config;
