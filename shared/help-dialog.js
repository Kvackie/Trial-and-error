// Dialogs shared by the games: plain HTML over the canvas so they scroll natively
// and text wraps on any screen.
//
// openHelpDialog({ title, html, accent, heading, panel, onClose })
//   "How to play" window. html is body content (trusted, written by the game itself).
// openConfirmDialog({ title, message, confirmLabel, cancelLabel, accent, heading, panel, onConfirm, onClose })
//   Asks before doing something that can't be undone.

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
.help-actions { display: flex; gap: 12px; margin-top: 18px; }
.help-actions button { flex: 1; min-height: 48px; border-radius: 10px; font-size: 17px; font-weight: 600; cursor: pointer;
  border: 2px solid var(--help-accent); background: transparent; color: #fff; }
.help-actions .help-danger { background: var(--help-accent); color: #111; }
.help-actions[hidden] { display: none; }
.help-actions button:disabled { opacity: 0.5; cursor: default; }
.help-field { width: 100%; box-sizing: border-box; min-height: 48px; margin: 8px 0 4px; padding: 0 12px; border-radius: 10px;
  border: 2px solid var(--help-accent); background: rgba(0, 0, 0, 0.35); color: #fff; font-size: 18px; }
.help-status { min-height: 22px; margin: 8px 0 0; opacity: 0.9; }
.help-table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; font-size: 16px; }
.help-table td { padding: 7px 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.12); }
.help-table td:first-child { width: 2.5em; opacity: 0.7; }
.help-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.help-table tr.help-me td { color: var(--help-heading); }
.help-close { position: sticky; top: 0; float: right; margin: -8px -8px 0 0; width: 40px; height: 40px;
  border-radius: 50%; border: 2px solid var(--help-accent); background: var(--help-panel); color: #fff;
  font-size: 20px; cursor: pointer; }
`;

function injectStyle() {
  if (document.getElementById('help-dialog-style')) return;
  const style = document.createElement('style');
  style.id = 'help-dialog-style';
  style.textContent = STYLE;
  document.head.append(style);
}

// True while any dialog is open; shared/keyboard.js pauses game keys then.
export const isDialogOpen = () => Boolean(document.querySelector('.help-overlay'));

// Shows a panel over the game and returns { overlay, close }.
export function showPanel({ title, html, accent = '#c77dff', heading = '#ffd23f', panel = '#2a1550', closeButton = true, onClose }) {
  injectStyle();
  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.style.setProperty('--help-accent', accent);
  overlay.style.setProperty('--help-heading', heading);
  overlay.style.setProperty('--help-panel', panel);
  overlay.innerHTML = `
    <div class="help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title">
      ${closeButton ? '<button class="help-close" aria-label="Close">✕</button>' : ''}
      <h2 id="help-title">${title}</h2>
      ${html}
    </div>`;

  let closed = false;
  // close({ silent: true }) skips onClose, for handing over to another dialog.
  const close = ({ silent } = {}) => {
    if (closed) return;
    closed = true;
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (!silent) onClose?.();
  };
  const onKey = (event) => event.key === 'Escape' && close();
  overlay.addEventListener('click', (event) => event.target === overlay && close());
  overlay.querySelector('.help-close')?.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  return { overlay, close };
}

export function openHelpDialog({ title, html, accent = '#c77dff', heading = '#ffd23f', panel = '#2a1550', onClose }) {
  const { overlay } = showPanel({ title, html, accent, heading, panel, closeButton: true, onClose });
  overlay.querySelector('.help-close').focus();
}

export function openConfirmDialog({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  accent = '#c77dff',
  heading = '#ffd23f',
  panel = '#2a1550',
  onConfirm,
  onClose,
}) {
  const html = `<p>${message}</p>
    <div class="help-actions">
      <button class="help-cancel">${cancelLabel}</button>
      <button class="help-danger">${confirmLabel}</button>
    </div>`;
  const { overlay, close } = showPanel({ title, html, accent, heading, panel, closeButton: false, onClose });
  overlay.querySelector('.help-cancel').addEventListener('click', close);
  overlay.querySelector('.help-danger').addEventListener('click', () => {
    close();
    onConfirm?.();
  });
  overlay.querySelector('.help-cancel').focus();
}
