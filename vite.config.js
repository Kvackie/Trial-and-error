import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the same build works on a GitHub Pages project URL
  // (/<repo>/) and inside the Capacitor Android WebView.
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
  },
});
