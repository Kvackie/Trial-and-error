import { openHelpDialog } from '../../../shared/help-dialog.js';

export function openHelp(onClose) {
  openHelpDialog({
    title: 'How to play',
    accent: '#4d7cff',
    panel: '#161a3d',
    onClose,
    html: `
      <ul>
        <li>Blocks fall one at a time. Fit them together to fill complete rows.</li>
        <li>A full row disappears and everything above it moves down.</li>
        <li>The game ends when the stack reaches the top.</li>
      </ul>
      <h3>Buttons</h3>
      <div class="help-row"><b style="width:56px;text-align:center">◀ ▶</b><span>Move the block left or right. Hold to keep moving.</span></div>
      <div class="help-row"><b style="width:56px;text-align:center">↻</b><span>Rotate the block.</span></div>
      <div class="help-row"><b style="width:56px;text-align:center">DROP</b><span>Drop the block straight down.</span></div>
      <p>On a computer: <b>A</b> / <b>D</b> move, <b>W</b> rotates and <b>Space</b> drops.</p>
      <p>The faint outline on the board shows where the block will land, and the box at the top shows the next block.</p>
      <h3>Scoring</h3>
      <ul>
        <li>Clearing 1, 2, 3 or 4 rows at once scores 100, 300, 500 or 800 points, times the level.</li>
        <li>DROP adds 2 points for every row the block falls.</li>
        <li>Every 10 rows cleared the level goes up and blocks fall faster.</li>
      </ul>`,
  });
}
