// Build one game into dist/<game>/.  Usage: npm run build -- <game>
import { build } from 'vite';
import { getGame } from './games.mjs';

const game = getGame(process.argv[2]);

await build({
  root: game.dir,
  configFile: false,
  // Relative paths so the build works under /<repo>/<game>/ on GitHub Pages
  // and inside the Capacitor Android WebView.
  base: './',
  build: {
    outDir: game.distDir,
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
