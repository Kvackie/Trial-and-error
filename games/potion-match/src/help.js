// "How to play" dialog. Plain HTML over the canvas so it scrolls natively.
import { MOVES } from './logic.js';
import { SPECIAL_ART, artPath } from './art.js';

const STYLE = `
.pm-help { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(8, 4, 20, 0.72); font-family: system-ui, sans-serif; }
.pm-help-panel { position: relative; width: 100%; max-width: 460px; max-height: 100%; overflow-y: auto;
  overscroll-behavior: contain; background: #2a1550; color: #f1eaff; border: 2px solid #c77dff; border-radius: 16px;
  padding: 20px 20px 24px; box-sizing: border-box; line-height: 1.45; font-size: 16px; }
.pm-help h2 { margin: 0 44px 12px 0; font-size: 22px; color: #ffd23f; }
.pm-help h3 { margin: 20px 0 8px; font-size: 17px; color: #ffd23f; }
.pm-help p, .pm-help ul { margin: 0 0 8px; }
.pm-help ul { padding-left: 20px; }
.pm-help li { margin-bottom: 6px; }
.pm-help-special { display: flex; gap: 12px; align-items: center; margin: 10px 0; }
.pm-help-special img { width: 48px; height: 64px; object-fit: contain; flex: none; }
.pm-help-special b { display: block; }
.pm-help-special span { color: #d9cdf5; font-size: 15px; }
.pm-help-close { position: sticky; top: 0; float: right; margin: -8px -8px 0 0; width: 40px; height: 40px;
  border-radius: 50%; border: 2px solid #c77dff; background: #43207a; color: #fff; font-size: 20px; cursor: pointer; }
`;

export function openHelp(onClose) {
  if (!document.getElementById('pm-help-style')) {
    const style = document.createElement('style');
    style.id = 'pm-help-style';
    style.textContent = STYLE;
    document.head.append(style);
  }

  const specials = Object.values(SPECIAL_ART)
    .map(
      (s) => `<div class="pm-help-special"><img src="${artPath(s.key)}" alt="">
        <div><b>${s.name}</b><span>${s.how}. ${s.does}</span></div></div>`,
    )
    .join('');

  const overlay = document.createElement('div');
  overlay.className = 'pm-help';
  overlay.innerHTML = `
    <div class="pm-help-panel" role="dialog" aria-modal="true" aria-labelledby="pm-help-title">
      <button class="pm-help-close" aria-label="Close">✕</button>
      <h2 id="pm-help-title">How to play</h2>
      <ul>
        <li>Swap two neighbouring potions to line up <b>3 or more</b> of the same colour.</li>
        <li>Swipe a potion towards its neighbour, or tap one potion and then the other.</li>
        <li>A swap that doesn't make a match slides back and doesn't cost a move.</li>
        <li>You have <b>${MOVES} moves</b>. Score as much as you can before they run out.</li>
        <li>Stuck? After a few seconds a possible move starts to wiggle.</li>
      </ul>
      <h3>Special potions</h3>
      <p>Bigger matches leave a special potion behind. Specials don't match by colour: they go off when you swap them
        with a neighbour, or when another special's blast reaches them.</p>
      ${specials}
      <p>Swapping two rainbows together clears the whole board.</p>
      <h3>Scoring</h3>
      <ul>
        <li>10 points per potion cleared, 50 for each special you make.</li>
        <li>When falling potions make new matches, each step of the chain multiplies the points: ×2, ×3 and so on.</li>
      </ul>
    </div>`;

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (event) => event.key === 'Escape' && close();
  overlay.addEventListener('click', (event) => event.target === overlay && close());
  overlay.querySelector('.pm-help-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  overlay.querySelector('.pm-help-close').focus();
}
