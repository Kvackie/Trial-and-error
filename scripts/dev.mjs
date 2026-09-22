// Run one game with hot reload.  Usage: npm run dev -- <game>
import { createServer } from 'vite';
import { getGame } from './games.mjs';

const game = getGame(process.argv[2]);
const server = await createServer({
  root: game.dir,
  configFile: false,
  server: { host: true },
});
await server.listen();
server.printUrls();
