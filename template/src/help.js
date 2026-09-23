import { openHelpDialog } from '../../../shared/help-dialog.js';
import { getLang, t } from '../../../shared/i18n.js';

// Colours for the shared dialogs (help, settings, leaderboard).
export const THEME = { accent: '#ffd166', panel: '#1c2046' };

const HTML = {
  en: () => `
      <ul>
        <li>Tap the circle as many times as you can before the time runs out.</li>
        <li>Every hit moves it somewhere new.</li>
      </ul>
      <p>On a computer: <b>Space</b> hits the circle.</p>`,
  sv: () => `
      <ul>
        <li>Tryck på cirkeln så många gånger du hinner innan tiden tar slut.</li>
        <li>Varje träff flyttar den till ett nytt ställe.</li>
      </ul>
      <p>På en dator: <b>mellanslag</b> träffar cirkeln.</p>`,
};

export function openHelp(onClose) {
  openHelpDialog({ title: t('help.title'), ...THEME, onClose, html: HTML[getLang()]() });
}
