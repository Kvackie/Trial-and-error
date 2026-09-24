import { openHelpDialog } from '../../../shared/help-dialog.js';
import { getLang, t } from '../../../shared/i18n.js';

export const THEME = { accent: '#6fb3e0', heading: '#ffd98a', panel: '#1b2a36' };

const HTML = {
  en: () => `
      <p>Build a town on your island, gather resources, train an army and hold out against the monsters.</p>
      <h3>Building</h3>
      <ul>
        <li>Tap an empty tile near your town and pick a building. It takes a little while to build.</li>
        <li><b>Homes</b> house people. Every workplace needs workers, and every unit counts as one person.</li>
        <li><b>Farms</b>, <b>windmills</b> and <b>watermills</b> (next to water) make food. <b>Lumber mills</b> next to forest make wood, more with more forest around. <b>Mines</b> on hills make stone. <b>Markets</b> and homes make gold.</li>
        <li>Tap a building to upgrade it (up to level 3). Upgrading the castle lets you store more.</li>
        <li>Rivers can't be crossed or built on. Build a <b>bridge</b> over them, or out across the sea to the small islands nearby, each with forest, hills and a dungeon of its own.</li>
        <li><b>Walls</b> join up with each other and stop monsters, which have to break through if there's no way round. Your units can walk through <b>gates</b>.</li>
        <li>A <b>tavern</b> makes every home hold more people. At the <b>market</b> you can trade one resource for another.</li>
        <li><b>Goals</b> (in the bottom bar) give rewards and show what to try next.</li>
      </ul>
      <h3>Army and monsters</h3>
      <ul>
        <li>The <b>barracks</b> trains knights and barbarians, the <b>archery range</b> crossbow rogues and fast scouts, the <b>chapel</b> mages. <b>Towers</b> shoot monsters by themselves; <b>catapult towers</b> hurl boulders further, hitting several at once.</li>
        <li>Units gain experience from fights and dungeons and level up to 5 (a star each). The <b>blacksmith</b> researches better weapons and armour for all of them.</li>
        <li>Tap a unit (or <b>Army</b> to pick several), then tap a tile to send them there. They explore the dark as they go and fight monsters they meet.</li>
        <li>After ten minutes monsters start coming from the shore at night, every few minutes and stronger each time; every fifth wave a stone titan leads them. They attack buildings; repair what they destroy.</li>
      </ul>
      <h3>Dungeons</h3>
      <p>Dark doorways hide dungeons. Tap one and send a party. They come back after a while: with loot if they win, fewer of them if they don't. Each win makes that dungeon harder and richer.</p>
      <h3>While you're away</h3>
      <p>Your town keeps producing for up to 8 hours, and building, training and dungeon runs finish. Monsters only come while you play.</p>
      <h3>Controls</h3>
      <p>Phone: drag to move, pinch to zoom, twist with two fingers to turn. Computer: drag with the left mouse button to move, the right button to turn, and the wheel to zoom.</p>`,
  sv: () => `
      <p>Bygg en stad på din ö, samla resurser, träna en armé och stå emot monstren.</p>
      <h3>Bygga</h3>
      <ul>
        <li>Tryck på en tom ruta nära staden och välj en byggnad. Det tar en stund att bygga.</li>
        <li><b>Hem</b> ger plats åt folk. Varje arbetsplats behöver arbetare, och varje enhet räknas som en person.</li>
        <li><b>Gårdar</b>, <b>väderkvarnar</b> och <b>vattenkvarnar</b> (vid vatten) ger mat. <b>Sågverk</b> vid skog ger trä, mer ju mer skog runt omkring. <b>Gruvor</b> på kullar ger sten. <b>Marknader</b> och hem ger guld.</li>
        <li>Tryck på en byggnad för att uppgradera den (upp till nivå 3). En uppgraderad borg rymmer mer.</li>
        <li>Floder går inte att korsa eller bygga på. Bygg en <b>bro</b> över dem, eller ut över havet till de små öarna i närheten, som var och en har skog, kullar och en egen grotta.</li>
        <li><b>Murar</b> sitter ihop med varandra och stoppar monster, som måste slå sig igenom om det inte finns någon väg runt. Dina enheter kan gå genom <b>portar</b>.</li>
        <li>En <b>krog</b> gör att varje hem rymmer fler personer. På <b>marknaden</b> kan du byta en resurs mot en annan.</li>
        <li><b>Mål</b> (i nedre raden) ger belöningar och visar vad du kan prova härnäst.</li>
      </ul>
      <h3>Armé och monster</h3>
      <ul>
        <li><b>Kasernen</b> tränar riddare och barbarer, <b>skjutbanan</b> armborstskyttar och snabba spejare, <b>kapellet</b> magiker. <b>Torn</b> skjuter monster av sig själva; <b>katapulttorn</b> slungar stenblock längre och träffar flera på en gång.</li>
        <li>Enheter får erfarenhet av strider och grottor och går upp till nivå 5 (en stjärna per nivå). <b>Smedjan</b> forskar fram bättre vapen och rustningar åt alla.</li>
        <li>Tryck på en enhet (eller <b>Armé</b> för att välja flera) och sedan på en ruta för att skicka dem dit. De utforskar mörkret på vägen och slåss mot monster de möter.</li>
        <li>Efter tio minuter börjar monster komma från stranden på natten, med några minuters mellanrum och starkare varje gång; var femte våg leds av en stentitan. De anfaller byggnader; reparera det de förstör.</li>
      </ul>
      <h3>Grottor</h3>
      <p>Mörka portar döljer grottor. Tryck på en och skicka in en grupp. De kommer tillbaka efter en stund: med byte om de vinner, färre om de förlorar. Varje seger gör grottan svårare och rikare.</p>
      <h3>När du är borta</h3>
      <p>Staden fortsätter producera i upp till 8 timmar, och byggen, träning och grottbesök blir klara. Monster kommer bara medan du spelar.</p>
      <h3>Styrning</h3>
      <p>Telefon: dra för att flytta, nyp för att zooma, vrid med två fingrar för att vända. Dator: dra med vänster musknapp för att flytta, höger för att vända och scrolla för att zooma.</p>`,
};

export function openHelp(onClose) {
  openHelpDialog({ title: t('help.title'), ...THEME, onClose, html: HTML[getLang()]() });
}
