import { openHelpDialog } from '../../../shared/help-dialog.js';
import { getLang, t } from '../../../shared/i18n.js';

export const THEME = { accent: '#4d7cff', panel: '#161a3d' };

const row = (label, text) => `<div class="help-row"><b style="width:64px;text-align:center">${label}</b><span>${text}</span></div>`;

const HTML = {
  en: () => `
      <ul>
        <li>Blocks fall one at a time. Fit them together to fill complete rows.</li>
        <li>A full row disappears and everything above it moves down.</li>
        <li>The game ends when the stack reaches the top.</li>
      </ul>
      <h3>Buttons</h3>
      ${row('◀ ▶', 'Move the block left or right. Hold to keep moving.')}
      ${row('↻', 'Rotate the block.')}
      ${row('DROP', 'Drop the block straight down.')}
      <p>On a computer: <b>A</b> / <b>D</b> move, <b>W</b> rotates and <b>Space</b> drops.</p>
      <p>The faint outline on the board shows where the block will land, and the box at the top shows the next block.</p>
      <h3>Scoring</h3>
      <ul>
        <li>Clearing 1, 2, 3 or 4 rows at once scores 100, 300, 500 or 800 points, times the level.</li>
        <li>DROP adds 2 points for every row the block falls.</li>
        <li>Every 10 rows cleared the level goes up and blocks fall faster.</li>
      </ul>`,
  sv: () => `
      <ul>
        <li>Blocken faller ett i taget. Passa ihop dem så att de fyller hela rader.</li>
        <li>En full rad försvinner och allt ovanför flyttas ner.</li>
        <li>Spelet är slut när högen når toppen.</li>
      </ul>
      <h3>Knappar</h3>
      ${row('◀ ▶', 'Flytta blocket åt vänster eller höger. Håll inne för att fortsätta flytta.')}
      ${row('↻', 'Vrid blocket.')}
      ${row('SLÄPP', 'Släpp blocket rakt ner.')}
      <p>På en dator: <b>A</b> / <b>D</b> flyttar, <b>W</b> vrider och <b>mellanslag</b> släpper.</p>
      <p>Den svaga konturen på spelplanen visar var blocket landar, och rutan högst upp visar nästa block.</p>
      <h3>Poäng</h3>
      <ul>
        <li>Att rensa 1, 2, 3 eller 4 rader på en gång ger 100, 300, 500 eller 800 poäng, gånger nivån.</li>
        <li>SLÄPP ger 2 poäng för varje rad blocket faller.</li>
        <li>Var tionde rensad rad höjer nivån och blocken faller snabbare.</li>
      </ul>`,
};

export function openHelp(onClose) {
  openHelpDialog({ title: t('help.title'), ...THEME, onClose, html: HTML[getLang()]() });
}
