// "How to play" dialog shared by the games. Plain HTML over the canvas so it
// scrolls natively and text wraps on any screen.
//
// openHelpDialog({ title, html, accent, panel, onClose })
//   html    body content (trusted, written by the game itself)
//   accent  border and heading colour, panel  background colour

const STYLE = `
.help-overlay { position: fixed; inset: 0; z-index: 10; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(6, 4, 16, 0.72); font-family: system-ui, sans-serif; }
.help-panel { position: relative; width: 100%; max-width: 460px; max-height: 100%; overflow-y: auto;
  overscroll-behavior: contain; background: var(--help-panel); color: #f1eeff; border: 2px solid var(--help-accent);
  border-radius: 16px; padding: 20px 20px 24px; box-sizing: border-box; line-height: 1.45; font-size: 16px; }
.help-panel h2 { margin: 0 44px 12px 0; font-size: 22px; color: var(--help-heading); }
.help-panel h3 { margin: 20px 0 8px; font-size: 17px; color: var(--help-heading); }
.help-panel p, .help-panel ul { margin: 0 0 8px; }
.help-panel ul { padding-left: 20px; }
.help-panel li { margin-bottom: 6px; }
.help-row { display: flex; gap: 12px; align-items: center; margin: 10px 0; }
.help-row > :first-child { flex: none; }
.help-row b { display: block; }
.help-row span { opacity: 0.85; font-size: 15px; }
.help-close { position: sticky; top: 0; float: right; margin: -8px -8px 0 0; width: 40px; height: 40px;
  border-radius: 50%; border: 2px solid var(--help-accent); background: var(--help-panel); color: #fff;
  font-size: 20px; cursor: pointer; }
`;

export function openHelpDialog({ title, html, accent = '#c77dff', heading = '#ffd23f', panel = '#2a1550', onClose }) {
  if (!document.getElementById('help-dialog-style')) {
    const style = document.createElement('style');
    style.id = 'help-dialog-style';
    style.textContent = STYLE;
    document.head.append(style);
  }

  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.style.setProperty('--help-accent', accent);
  overlay.style.setProperty('--help-heading', heading);
  overlay.style.setProperty('--help-panel', panel);
  overlay.innerHTML = `
    <div class="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <button class="help-close" aria-label="Close">✕</button>
      <h2 id="help-title">${title}</h2>
      ${html}
    </div>`;

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (event) => event.key === 'Escape' && close();
  overlay.addEventListener('click', (event) => event.target === overlay && close());
  overlay.querySelector('.help-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  overlay.querySelector('.help-close').focus();
}
