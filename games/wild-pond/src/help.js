import { openHelpDialog, showPanel } from '../../../shared/help-dialog.js';
import { getLang, t } from '../../../shared/i18n.js';
import { BOOK_TRAITS, RARE, TRAITS } from './genes.js';
import { tr } from './strings.js';

export const THEME = { accent: '#35c9c0', heading: '#ffe48a', panel: '#0f2e3a' };

const HTML = {
  en: () => `
      <p>Raise little pond creatures, breed them to find new looks, and trade them with other players through the shared pond.</p>
      <h3>Breeding</h3>
      <ul>
        <li>Tap two grown-up creatures, then <b>Breed</b>. Their baby takes each feature from one parent or the other.</li>
        <li>Now and then a baby is born with a <b>mutation</b>: a feature neither parent has. Rare features (★ in the book) only come from mutations.</li>
        <li>Babies take 90 seconds to grow up, and parents rest for 45 seconds after breeding.</li>
      </ul>
      <h3>The shared pond</h3>
      <ul>
        <li>Your pond holds 8 creatures. <b>Release</b> one to make room: it swims into a pond shared by every player, and you get a bait back.</li>
        <li><b>Fish</b> uses a bait to catch a creature another player released, maybe with features you have never seen. Bait comes back one every 10 minutes (up to 3).</li>
      </ul>
      <h3>The book</h3>
      <p>The <b>Book</b> lists every feature you have seen. The first player ever to find a rare feature gets their name on it for everyone to see. Your book count goes on the leaderboard.</p>
      <p>On a computer: <b>W A S D</b> move the frame, <b>Space</b> picks.</p>`,
  sv: () => `
      <p>Föd upp små dammvarelser, para dem för att hitta nya utseenden och byt dem med andra spelare genom den gemensamma dammen.</p>
      <h3>Parning</h3>
      <ul>
        <li>Tryck på två vuxna varelser och sedan <b>Para</b>. Ungen får varje drag från den ena eller andra föräldern.</li>
        <li>Ibland föds en unge med en <b>mutation</b>: ett drag som ingen av föräldrarna har. Sällsynta drag (★ i boken) kommer bara från mutationer.</li>
        <li>Ungar blir vuxna på 90 sekunder, och föräldrarna vilar i 45 sekunder efter parningen.</li>
      </ul>
      <h3>Den gemensamma dammen</h3>
      <ul>
        <li>Din damm rymmer 8 varelser. <b>Släpp</b> en för att göra plats: den simmar ut i en damm som alla spelare delar, och du får tillbaka ett bete.</li>
        <li><b>Fiska</b> använder ett bete för att fånga en varelse som en annan spelare släppt, kanske med drag du aldrig sett. Du får ett nytt bete var tionde minut (upp till 3).</li>
      </ul>
      <h3>Boken</h3>
      <p><b>Boken</b> visar alla drag du har sett. Den första spelaren någonsin som hittar ett sällsynt drag får sitt namn på det så att alla ser det. Antalet i boken hamnar på topplistan.</p>
      <p>På en dator: <b>W A S D</b> flyttar ramen och <b>mellanslag</b> väljer.</p>`,
};

export function openHelp(onClose) {
  openHelpDialog({ title: t('help.title'), ...THEME, onClose, html: HTML[getLang()]() });
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// The collection book: every feature, found or not, with the first finder of rare ones.
export function openBook({ found, firsts, onClose }) {
  const sections = BOOK_TRAITS.map((trait) => {
    const values = [...TRAITS[trait].common, ...TRAITS[trait].rare];
    const rows = values
      .map((value) => {
        const key = `${trait}:${value}`;
        const have = found.includes(key);
        const rare = RARE.has(key) ? ' ★' : '';
        const first = firsts[key] ? `<span>${tr('bookFirst', { name: escapeHtml(firsts[key]) })}</span>` : '';
        return `<tr class="${have ? 'help-me' : ''}"><td>${have ? '✓' : ''}</td><td>${have ? tr(key) : tr('bookUnknown')}${rare}</td><td>${first}</td></tr>`;
      })
      .join('');
    return `<h3>${tr(`trait_${trait}`)}</h3><table class="help-table"><tbody>${rows}</tbody></table>`;
  }).join('');
  const { overlay } = showPanel({ ...THEME, title: `${tr('bookTitle')} · ${found.length}`, onClose, html: `<p>${tr('bookIntro')}</p>${sections}` });
  overlay.querySelector('.help-close').focus();
}
