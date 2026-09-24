import { openHelpDialog } from '../../../shared/help-dialog.js';
import { getLang, t } from '../../../shared/i18n.js';

export const THEME = { accent: '#e0a84f', heading: '#ffd98a', panel: '#2a1c14' };

const HTML = {
  en: () => `
      <p>Run a potion shop: buy ingredients, brew potions and sell them on a market shared by every player.</p>
      <h3>Brew</h3>
      <ul>
        <li>Pick a recipe at the top, then tap ingredients to add them to the cauldron.</li>
        <li>Every ingredient carries some of five essences: fire, water, earth, air and shadow. The bars show the balance the recipe needs (outline) and what is in the cauldron (filled).</li>
        <li>Get close enough and the cauldron shows <b>Match</b>. The closer the match, the better the potions and the more they sell for. More ingredients make more potions (up to 6).</li>
        <li><b>Empty</b> gives the ingredients back.</li>
        <li>Learn new recipes by tapping a dim one and paying for it.</li>
      </ul>
      <h3>Buy</h3>
      <p>The merchant sells 8 of the 12 ingredients each day, at prices that change daily. Emberroot and dewcap are always in stock, and if you ever run out of gold with nothing to brew or sell, the merchant helps you start again. Tap <b>Sell back</b> to sell ingredients you don't need for half their usual price.</p>
      <h3>Sell</h3>
      <ul>
        <li>Prices are the same for everyone. Every potion sold, by anyone, pushes that potion's price down; prices recover over a few hours.</li>
        <li>So brew what others don't. One potion is in high demand each day and sells for much more.</li>
        <li>The gold you earn from sales goes on the leaderboard. The first player ever to brew a recipe gets their name on it.</li>
      </ul>
      <p>On a computer: <b>W A S D</b> move the frame, <b>Space</b> picks.</p>`,
  sv: () => `
      <p>Driv en trolldrycksbutik: köp ingredienser, brygg drycker och sälj dem på en marknad som alla spelare delar.</p>
      <h3>Brygg</h3>
      <ul>
        <li>Välj ett recept högst upp och tryck sedan på ingredienser för att lägga dem i kitteln.</li>
        <li>Varje ingrediens bär på fem essenser: eld, vatten, jord, luft och skugga. Staplarna visar balansen receptet behöver (kontur) och vad som finns i kitteln (fyllt).</li>
        <li>Kommer du tillräckligt nära visar kitteln <b>Träff</b>. Ju bättre träff, desto bättre drycker och desto mer betalt. Fler ingredienser ger fler drycker (upp till 6).</li>
        <li><b>Töm</b> ger tillbaka ingredienserna.</li>
        <li>Lär dig nya recept genom att trycka på ett nedtonat och betala för det.</li>
      </ul>
      <h3>Köp</h3>
      <p>Handlaren säljer 8 av de 12 ingredienserna varje dag, till priser som ändras dagligen. Glödrot och daggskivling finns alltid, och om du någon gång står utan guld och inte har något att brygga eller sälja hjälper handlaren dig att börja om. Tryck på <b>Sälj tillbaka</b> för att sälja ingredienser du inte behöver för halva det vanliga priset.</p>
      <h3>Sälj</h3>
      <ul>
        <li>Priserna är desamma för alla. Varje dryck som säljs, av vem som helst, sänker priset på den drycken; priserna återhämtar sig under några timmar.</li>
        <li>Brygg alltså det som andra inte gör. En dryck är extra efterfrågad varje dag och säljs för mycket mer.</li>
        <li>Guldet du tjänar på försäljning hamnar på topplistan. Den första spelaren som någonsin bryggt ett recept får sitt namn på det.</li>
      </ul>
      <p>På en dator: <b>W A S D</b> flyttar ramen och <b>mellanslag</b> väljer.</p>`,
};

export function openHelp(onClose) {
  openHelpDialog({ title: t('help.title'), ...THEME, onClose, html: HTML[getLang()]() });
}
