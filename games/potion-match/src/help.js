import { openHelpDialog } from '../../../shared/help-dialog.js';
import { getLang, t } from '../../../shared/i18n.js';
import { MOVES } from './logic.js';
import { SPECIAL_ART, artPath } from './art.js';
import { tr } from './strings.js';

const specials = () =>
  Object.entries(SPECIAL_ART)
    .map(
      ([id, s]) => `<div class="help-row"><img src="${artPath(s.key)}" alt="" style="width:48px;height:64px;object-fit:contain">
        <div><b>${tr(`${id}.name`)}</b><span>${tr(`${id}.how`)}. ${tr(`${id}.does`)}</span></div></div>`,
    )
    .join('');

const HTML = {
  en: () => `
      <ul>
        <li>Swap two neighbouring potions to line up <b>3 or more</b> of the same colour.</li>
        <li>Swipe a potion towards its neighbour, or tap one potion and then the other.</li>
        <li>On a computer: <b>W A S D</b> move the gold cursor, <b>Space</b> picks up the potion under it, then
          <b>W A S D</b> swaps it that way.</li>
        <li>Swaps that make a match are free. A swap that <b>doesn't</b> make a match slides back and costs a move.</li>
        <li>You start with <b>${MOVES} moves</b>. When they're gone the game ends, so a careful player can keep going forever.</li>
        <li>Stuck? After a few seconds a possible move starts to wiggle.</li>
      </ul>
      <h3>Special potions</h3>
      <p>A bigger match you make yourself leaves a special potion behind (matches that happen as potions fall don't). Specials don't match by colour: they go off when you swap them
        with a neighbour, or when another special's blast reaches them.</p>
      ${specials()}
      <p>Swapping two rainbows together clears the whole board.</p>
      <h3>Scoring</h3>
      <ul>
        <li>10 points per potion cleared, 50 for each special you make.</li>
        <li>When falling potions make new matches, each step of the chain multiplies the points: ×2, ×3 and so on.</li>
      </ul>`,
  sv: () => `
      <ul>
        <li>Byt plats på två drycker bredvid varandra så att <b>3 eller fler</b> av samma färg hamnar i rad.</li>
        <li>Svep en dryck mot sin granne, eller tryck på en dryck och sedan på den andra.</li>
        <li>På en dator: <b>W A S D</b> flyttar den gyllene markören, <b>mellanslag</b> plockar upp drycken under den,
          och sedan byter <b>W A S D</b> den åt det hållet.</li>
        <li>Byten som ger en matchning är gratis. Ett byte som <b>inte</b> ger någon matchning glider tillbaka och kostar ett drag.</li>
        <li>Du börjar med <b>${MOVES} drag</b>. När de är slut är spelet över, så en noggrann spelare kan fortsätta hur länge som helst.</li>
        <li>Fastnat? Efter några sekunder börjar ett möjligt drag vicka.</li>
      </ul>
      <h3>Specialdrycker</h3>
      <p>En större matchning som du gör själv lämnar kvar en specialdryck (matchningar som uppstår när drycker faller gör det inte). Specialdrycker matchas inte efter färg: de utlöses när du byter
        plats på dem med en granne, eller när en annan specialdrycks explosion når dem.</p>
      ${specials()}
      <p>Byter du plats på två regnbågar rensas hela spelplanen.</p>
      <h3>Poäng</h3>
      <ul>
        <li>10 poäng per rensad dryck, 50 för varje specialdryck du skapar.</li>
        <li>När fallande drycker ger nya matchningar multipliceras poängen för varje steg i kedjan: ×2, ×3 och så vidare.</li>
      </ul>`,
};

export function openHelp(onClose) {
  openHelpDialog({ title: t('help.title'), onClose, html: HTML[getLang()]() });
}
