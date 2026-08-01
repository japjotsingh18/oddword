import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const firebaseEnvironmentKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY",
] as const;

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const firebaseDefinitions = Object.fromEntries(
    firebaseEnvironmentKeys.map((key) => [
      `process.env.${key}`,
      JSON.stringify(environment[key] ?? ""),
    ]),
  );

  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(process.cwd()) } },
    define: firebaseDefinitions,
    publicDir: "public",
    build: {
      outDir: "firebase-dist",
      emptyOutDir: true,
      rollupOptions: { input: path.resolve(process.cwd(), "firebase-index.html") },
    },
  };
});
