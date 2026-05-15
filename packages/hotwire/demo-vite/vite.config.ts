import { defineConfig } from "vite";

export default defineConfig({
  root: "app/javascript",
  build: {
    outDir: "../../public/assets",
    assetsDir: ".",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: "app/javascript/application.js",
    },
  },
  server: {
    origin: "http://localhost:5173",
  },
});
