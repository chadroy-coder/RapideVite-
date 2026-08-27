import type { CapacitorConfig } from "@capacitor/cli";

// RapidVite is a server-rendered Next.js app (server actions, cookies,
// Stripe webhooks) - it can't be statically bundled into the app like a
// typical Capacitor project. Instead this points the native WebView at the
// live production site, same approach used by most "wrap an existing web
// app" mobile apps. Update `server.url` if the production domain changes.
//
// Point directly at the FINAL domain, not one that redirects elsewhere -
// Capacitor treats a cross-host redirect as "external" and hands off to the
// system browser instead of rendering in-app (bit us once already when this
// pointed at the bare rapidevite.com domain that 308-redirects to www).
const config: CapacitorConfig = {
  appId: "com.rapidvitht.app",
  appName: "RapidVit",
  webDir: "public",
  server: {
    url: "https://www.rapidvit.ht",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
