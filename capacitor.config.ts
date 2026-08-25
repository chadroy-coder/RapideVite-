import type { CapacitorConfig } from "@capacitor/cli";

// RapidVite is a server-rendered Next.js app (server actions, cookies,
// Stripe webhooks) - it can't be statically bundled into the app like a
// typical Capacitor project. Instead this points the native WebView at the
// live production site, same approach used by most "wrap an existing web
// app" mobile apps. Update `server.url` if the production domain changes
// (e.g. once rapidvit.ht is live).
const config: CapacitorConfig = {
  appId: "com.rapidvitht.app",
  appName: "RapidVit",
  webDir: "public",
  server: {
    url: "https://www.rapidevite.com",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
