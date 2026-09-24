import { openHelpDialog } from '../../../shared/help-dialog.js';
import { getLang, t } from '../../../shared/i18n.js';

export const THEME = { accent: '#6fb3e0', heading: '#ffd98a', panel: '#1b2a36' };

const HTML = {
  en: () => `
      <p>Build a town on your island, gather resources, train an army and hold out against the monsters.</p>
      <h3>Building</h3>
      <ul>
        <li>Tap an empty tile near your town and pick a building. It takes a little while to build.</li>
        <li>You start with one <b>builder</b>, and get one more for every two homes (up to 6). Extra building work waits in a queue until a builder is free.</li>
        <li><b>Homes</b> house people. Every workplace needs workers, and every unit counts as one person.</li>
        <li><b>Farms</b>, <b>windmills</b> and <b>watermills</b> (next to water) make food. <b>Lumber mills</b> next to forest make wood, more with more forest around. <b>Mines</b> on hills make stone. <b>Markets</b> and homes make gold. The castle itself makes a little wood and stone, even with no workers.</li>
        <li>Tap a building to upgrade it (up to level 3). Upgrading the castle lets you store more.</li>
        <li>Rivers can't be crossed or built on. Build a <b>bridge</b> over them, or out across the sea to the small islands nearby, each with forest, hills and a dungeon of its own.</li>
        <li><b>Walls</b> join up with each other and stop monsters, which have to break through if there's no way round. Your units can walk through <b>gates</b>.</li>
        <li>A <b>tavern</b> makes every home hold more people. At the <b>market</b> you can trade one resource for another.</li>
        <li><b>Goals</b> (in the bottom bar) give rewards and show what to try next.</li>
      </ul>
      <h3>Army and monsters</h3>
      <ul>
        <li>Every unit eats a little food; without food they weaken.</li>
        <li>The <b>barracks</b> trains knights and barbarians, the <b>archery range</b> crossbow rogues and fast scouts, the <b>chapel</b> mages. <b>Towers</b> (and the castle itself) shoot monsters by themselves; <b>catapult towers</b> hurl boulders further, hitting several at once.</li>
        <li>Units gain experience from fights and dungeons and level up to 5 (a star each). The <b>blacksmith</b> researches better weapons and armour for all of them.</li>
        <li>Tap a unit (or <b>Army</b> to pick several), then tap a tile to send them there. They explore the dark as they go and fight monsters they meet.</li>
        <li>Combat follows hex rules: one unit or monster per hex, melee fighters attack from the next hex and hit back when struck, and ranged units shoot from a distance. Units on forest, hills or one of your buildings take less damage. Monsters can't walk through buildings; they have to break them down. Units only chase monsters they can see near where you sent them.</li>
        <li>After ten minutes waves of monsters start coming, every few minutes and stronger each time; every fifth wave a stone titan leads them. They attack buildings; repair what they destroy.</li>
        <li>An alarm warns you 30 seconds before a wave. When a building or unit out of view is attacked, a red arrow at the screen edge points to it: tap it to look there.</li>
        <li>If the castle falls, it rebuilds itself for free once the wave is over. Too few workers because of a big army? Select units and <b>Send home</b> to put them back to work.</li>
      </ul>
      <h3>Monster nests</h3>
      <p>Glowing nests hide in the dark. The waves come out of them, and a nest grows bigger (up to level 5) the longer it's left alone, making its waves bigger too. Send your army to destroy one for a big reward, but its guards will fight back. With no nest left, waves are smaller and come from the sea, until a new nest takes root.</p>
      <h3>Wonders</h3>
      <p>With the castle at level 3 you can build four gilded wonders, one of each. They cost a lot but help the whole island: the <b>Wishing well</b> makes every building produce 25% more; the <b>Cathedral</b> heals units anywhere and gives them 50% more experience; the <b>Beacon tower</b> shows the whole map and makes towers and the castle hit 50% harder; the <b>Grand bazaar</b> makes gold and better market trades.</p>
      <h3>Dungeons</h3>
      <p>Dark doorways hide dungeons. Tap one and send a party. They come back after a while: with loot if they win, fewer of them if they don't. Each win makes that dungeon harder and richer.</p>
      <h3>While you're away</h3>
      <p>Your town keeps producing for up to 8 hours, and building, training and dungeon runs finish. Monsters only come while you play.</p>
      <h3>Controls</h3>
      <p>Phone: drag to move, pinch to zoom, twist with two fingers to turn. Computer: drag with the left mouse button to move, the right button to turn, and the wheel to zoom.</p>
      <p>The speed button in the top bar switches between normal speed, double speed and pause.</p>`,
  sv: () => `
      <p>Bygg en stad på din ö, samla resurser, träna en armé och stå emot monstren.</p>
      <h3>Bygga</h3>
      <ul>
        <li>Tryck på en tom ruta nära staden och välj en byggnad. Det tar en stund att bygga.</li>
        <li>Du börjar med en <b>byggare</b> och får en till för varannat hem (upp till 6). Övriga byggen väntar i kö tills en byggare blir ledig.</li>
        <li><b>Hem</b> ger plats åt folk. Varje arbetsplats behöver arbetare, och varje enhet räknas som en person.</li>
        <li><b>Gårdar</b>, <b>väderkvarnar</b> och <b>vattenkvarnar</b> (vid vatten) ger mat. <b>Sågverk</b> vid skog ger trä, mer ju mer skog runt omkring. <b>Gruvor</b> på kullar ger sten. <b>Marknader</b> och hem ger guld. Borgen själv ger lite trä och sten, även utan arbetare.</li>
        <li>Tryck på en byggnad för att uppgradera den (upp till nivå 3). En uppgraderad borg rymmer mer.</li>
        <li>Floder går inte att korsa eller bygga på. Bygg en <b>bro</b> över dem, eller ut över havet till de små öarna i närheten, som var och en har skog, kullar och en egen grotta.</li>
        <li><b>Murar</b> sitter ihop med varandra och stoppar monster, som måste slå sig igenom om det inte finns någon väg runt. Dina enheter kan gå genom <b>portar</b>.</li>
        <li>En <b>krog</b> gör att varje hem rymmer fler personer. På <b>marknaden</b> kan du byta en resurs mot en annan.</li>
        <li><b>Mål</b> (i nedre raden) ger belöningar och visar vad du kan prova härnäst.</li>
      </ul>
      <h3>Armé och monster</h3>
      <ul>
        <li>Varje enhet äter lite mat; utan mat blir de svagare.</li>
        <li><b>Kasernen</b> tränar riddare och barbarer, <b>skjutbanan</b> armborstskyttar och snabba spejare, <b>kapellet</b> magiker. <b>Torn</b> (och själva borgen) skjuter monster av sig själva; <b>katapulttorn</b> slungar stenblock längre och träffar flera på en gång.</li>
        <li>Enheter får erfarenhet av strider och grottor och går upp till nivå 5 (en stjärna per nivå). <b>Smedjan</b> forskar fram bättre vapen och rustningar åt alla.</li>
        <li>Tryck på en enhet (eller <b>Armé</b> för att välja flera) och sedan på en ruta för att skicka dem dit. De utforskar mörkret på vägen och slåss mot monster de möter.</li>
        <li>Striderna följer hexregler: en enhet eller ett monster per ruta, närstridare anfaller från rutan intill och slår tillbaka när de blir träffade, och avståndsenheter skjuter på håll. Enheter i skog, på kullar eller på dina byggnader tar mindre skada. Monster kan inte gå genom byggnader; de måste slå sönder dem. Enheter jagar bara monster de ser nära där du skickade dem.</li>
        <li>Efter tio minuter börjar vågor av monster komma, med några minuters mellanrum och starkare varje gång; var femte våg leds av en stentitan. De anfaller byggnader; reparera det de förstör.</li>
        <li>Ett larm varnar 30 sekunder före en våg. När en byggnad eller enhet utanför bilden anfalls pekar en röd pil vid skärmkanten mot den: tryck på den för att titta dit.</li>
        <li>Om borgen faller byggs den upp igen gratis när vågen är över. För få arbetare för att armén är stor? Välj enheter och <b>Skicka hem</b> dem så att de börjar arbeta igen.</li>
      </ul>
      <h3>Monsterbon</h3>
      <p>Glödande bon gömmer sig i mörkret. Vågorna kommer därifrån, och ett bo växer (upp till nivå 5) ju längre det får vara ifred, så att vågorna också blir större. Skicka armén för att förstöra ett och få en stor belöning, men dess vakter slår tillbaka. När inga bon finns kvar blir vågorna mindre och kommer från havet, tills ett nytt bo slår rot.</p>
      <h3>Underverk</h3>
      <p>När borgen är på nivå 3 kan du bygga fyra förgyllda underverk, ett av varje. De kostar mycket men hjälper hela ön: <b>Önskebrunnen</b> får varje byggnad att producera 25 % mer; <b>Katedralen</b> läker enheter var de än är och ger dem 50 % mer erfarenhet; <b>Fyrtornet</b> visar hela kartan och får torn och borgen att slå 50 % hårdare; <b>Stora basaren</b> ger guld och bättre byten på marknaden.</p>
      <h3>Grottor</h3>
      <p>Mörka portar döljer grottor. Tryck på en och skicka in en grupp. De kommer tillbaka efter en stund: med byte om de vinner, färre om de förlorar. Varje seger gör grottan svårare och rikare.</p>
      <h3>När du är borta</h3>
      <p>Staden fortsätter producera i upp till 8 timmar, och byggen, träning och grottbesök blir klara. Monster kommer bara medan du spelar.</p>
      <h3>Styrning</h3>
      <p>Telefon: dra för att flytta, nyp för att zooma, vrid med två fingrar för att vända. Dator: dra med vänster musknapp för att flytta, höger för att vända och scrolla för att zooma.</p>
      <p>Hastighetsknappen i övre raden växlar mellan normal hastighet, dubbel hastighet och paus.</p>`,
};

export function openHelp(onClose) {
  openHelpDialog({ title: t('help.title'), ...THEME, onClose, html: HTML[getLang()]() });
}
