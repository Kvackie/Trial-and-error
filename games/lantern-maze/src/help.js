import { CHECKPOINT_EVERY, MAX_LIVES } from './progress.js';

export const HELP_HTML = `
  <ul>
    <li>Find the <b>golden goblet</b> to go one level deeper. Every maze is a little bigger than the last.</li>
    <li>Your lantern only lights the square you stand on and the open squares next to it. You can't see round
      corners, or what's on a square until you step onto it.</li>
    <li>Squares you've walked through stay on your map, faded.</li>
    <li>Move by swiping on the maze, or with the arrow buttons. Hold a button to keep walking.</li>
    <li>On a computer: <b>W A S D</b> walk. At a chest, <b>W A S D</b> pick an answer and <b>Space</b> confirms it.</li>
  </ul>
  <h3>Dead ends</h3>
  <ul>
    <li>Every dead end holds a <b>locked chest</b>. Pick the right answer of four to open it and walk on.</li>
    <li>A wrong answer costs a life (♥) and the chest asks a new question.</li>
    <li>Lose all ${MAX_LIVES} lives and your lantern goes out: you go back to your last checkpoint.</li>
  </ul>
  <h3>Checkpoints</h3>
  <ul>
    <li>Levels ${CHECKPOINT_EVERY}, ${CHECKPOINT_EVERY * 2}, ${CHECKPOINT_EVERY * 3} and so on are checkpoints,
      marked by a campfire. Reaching one saves your progress and refills your lives.</li>
    <li><b>Reset</b> (top left) clears every checkpoint and starts again from level 1.</li>
  </ul>`;
