import { openHelpDialog } from '../../../shared/help-dialog.js';
import { getLang, t } from '../../../shared/i18n.js';

// Colours for the shared dialogs (help, settings).
export const THEME = { accent: '#b56cff', heading: '#ffd166', panel: '#1f1128' };

const CREDITS = `<p class="credits">Art: <b>0x72</b> “Dungeon Tileset II” (CC0) and <b>DawnLike</b> by DragonDePlatino,
  palette by DawnBringer (CC-BY-SA 3.0). Somewhere in the dungeon hides Platino.</p>`;

const HTML = {
  en: () => `
      <p>Heroes storm the dungeon from the right. Keep them away from your <b>demon lord</b>.</p>
      <ul>
        <li><b>Waves</b> come one after another. A cleared wave repeats until you tap <b>Next wave</b>, so you can farm it. Every 10th wave brings a boss.</li>
        <li>If the demon lord falls, you go back 3 waves and keep everything else.</li>
        <li><b>Souls</b> from slain heroes pay for everything. Heroes also give XP to the lord and your deployed monsters, and sometimes drop a <b>rune</b>.</li>
        <li><b>Monsters:</b> recruit them, then tap a glowing cell to deploy them. Melee monsters stand in front of the wall, ranged ones on it. Undeployed monsters wait in the inventory. A slain monster returns at the next wave.</li>
        <li><b>The wall</b> is bought with souls. Ranged monsters on it add a quarter of their health to it. A broken wall rebuilds itself; meanwhile its structures stop and the ranged monsters step back.</li>
        <li><b>Structures:</b> attack structures go on the wall, support behind it, traps in front of it.</li>
        <li><b>Runes</b> go in rune slots on the lord and monsters (more slots at levels 10 and 25). Merge 3 of the same kind and rarity into a better one, or break them for souls.</li>
        <li>Each lord level gives a <b>talent point</b> and unlocks new monsters and spells.</li>
        <li>While the game is closed, your monsters keep holding the wave you left on, for up to 8 hours.</li>
        <li>Tap anything on the field to see it, or an empty cell to put something there.</li>
      </ul>
      <p>On a computer: <b>A</b>/<b>D</b> switch tabs, <b>W</b>/<b>S</b> move between buttons and <b>Space</b> presses one.
        When placing or aiming, <b>W A S D</b> move the cursor and <b>Space</b> confirms.</p>
      ${CREDITS}`,
  sv: () => `
      <p>Hjältar stormar fängelsehålan från höger. Håll dem borta från din <b>demonfurste</b>.</p>
      <ul>
        <li><b>Vågor</b> kommer en efter en. En klarad våg upprepas tills du trycker på <b>Nästa våg</b>, så att du kan samla på den. Var tionde våg har en boss.</li>
        <li>Om demonfursten faller går du tillbaka 3 vågor och behåller allt annat.</li>
        <li><b>Själar</b> från dödade hjältar betalar allt. Hjältar ger också XP till fursten och dina utplacerade monster, och tappar ibland en <b>runa</b>.</li>
        <li><b>Monster:</b> rekrytera dem och tryck sedan på en lysande ruta för att placera ut dem. Närstridsmonster står framför muren, avståndsmonster på den. Monster som inte är utplacerade väntar i förrådet. Ett dödat monster kommer tillbaka nästa våg.</li>
        <li><b>Muren</b> köps med själar. Avståndsmonster på den ger den en fjärdedel av sin hälsa. En raserad mur bygger upp sig själv; under tiden stannar byggnaderna på den och avståndsmonstren backar.</li>
        <li><b>Byggnader:</b> anfallsbyggnader står på muren, stöd bakom den och fällor framför den.</li>
        <li><b>Runor</b> sätts i runplatser på fursten och monstren (fler platser på nivå 10 och 25). Slå ihop 3 av samma sort och sällsynthet till en bättre, eller krossa dem för själar.</li>
        <li>Varje furstenivå ger en <b>talangpoäng</b> och låser upp nya monster och besvärjelser.</li>
        <li>När spelet är stängt fortsätter dina monster att hålla vågen du lämnade, i upp till 8 timmar.</li>
        <li>Tryck på något på slagfältet för att se det, eller på en tom ruta för att placera något där.</li>
      </ul>
      <p>På en dator: <b>A</b>/<b>D</b> byter flik, <b>W</b>/<b>S</b> flyttar mellan knappar och <b>mellanslag</b> trycker på en.
        När du placerar eller siktar flyttar <b>W A S D</b> markören och <b>mellanslag</b> bekräftar.</p>
      ${CREDITS}`,
};

export function openHelp(onClose) {
  openHelpDialog({ title: t('help.title'), ...THEME, onClose, html: HTML[getLang()]() });
}
