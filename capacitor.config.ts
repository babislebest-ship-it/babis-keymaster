import type { CapacitorConfig } from "@capacitor/cli";

const hostedAppUrl = process.env["CAPACITOR_SERVER_URL"] ?? "https://babis-keymaster.lovable.app";

const config: CapacitorConfig = {
  appId: "com.babis.keymaster",
  appName: "Babis Hub",
  webDir: ".output/public",
  server: {
    url: hostedAppUrl,
    cleartext: false,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#18201a",
      showSpinner: false,
    },
  },
};

export default config;
