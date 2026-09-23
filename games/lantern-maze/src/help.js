import { getLang } from '../../../shared/i18n.js';
import { CHECKPOINT_EVERY, MAX_LIVES } from './progress.js';

const c = CHECKPOINT_EVERY;

const HTML = {
  en: () => `
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
    <li>A wrong answer costs a life (♥): your pick turns red, the right answer green, and the chest asks a new question.</li>
    <li>Lose all ${MAX_LIVES} lives and your lantern goes out: you go back to your last checkpoint.</li>
  </ul>
  <h3>Checkpoints</h3>
  <ul>
    <li>Levels ${c}, ${c * 2}, ${c * 3} and so on are checkpoints, marked by a campfire. Reaching one saves your
      progress and refills your lives.</li>
    <li><b>Reset</b> (top right, under ?) clears every checkpoint and starts again from level 1.</li>
  </ul>`,
  sv: () => `
  <ul>
    <li>Hitta den <b>gyllene bägaren</b> för att gå en nivå djupare. Varje labyrint är lite större än den förra.</li>
    <li>Din lykta lyser bara upp rutan du står på och de öppna rutorna bredvid. Du kan inte se runt hörn, eller vad
      som finns på en ruta förrän du kliver på den.</li>
    <li>Rutor du har gått igenom finns kvar på din karta, blekta.</li>
    <li>Gå genom att svepa på labyrinten, eller med pilknapparna. Håll inne en knapp för att fortsätta gå.</li>
    <li>På en dator: <b>W A S D</b> går. Vid en kista väljer <b>W A S D</b> ett svar och <b>mellanslag</b> bekräftar.</li>
  </ul>
  <h3>Återvändsgränder</h3>
  <ul>
    <li>Varje återvändsgränd har en <b>låst kista</b>. Välj rätt svar av fyra för att öppna den och gå vidare.</li>
    <li>Ett fel svar kostar ett liv (♥): ditt val blir rött, rätt svar grönt, och kistan ställer en ny fråga.</li>
    <li>Förlorar du alla ${MAX_LIVES} liv slocknar lyktan: du går tillbaka till din senaste kontrollpunkt.</li>
  </ul>
  <h3>Kontrollpunkter</h3>
  <ul>
    <li>Nivå ${c}, ${c * 2}, ${c * 3} och så vidare är kontrollpunkter, markerade med en lägereld. När du når en
      sparas dina framsteg och dina liv fylls på.</li>
    <li><b>Börja om</b> (uppe till höger, under ?) rensar alla kontrollpunkter och börjar om från nivå 1.</li>
  </ul>`,
};

export const helpHtml = () => HTML[getLang()]();
