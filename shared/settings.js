// Settings shared by the games: language (flags), sound on/off and volume. The
// choices are stored per device and apply to every game and the hub.
//
//   addSettingsButton(scene, x, y, { radius, fill, stroke, icon, onOpen, onClose })
//   openSettings({ theme, onClose })
import { showPanel } from './help-dialog.js';
import { FLAGS } from './flags.js';
import { LANGUAGES, getLang, onLangChange, setLang, t } from './i18n.js';
import { getVolume, isMuted, playSound, setMuted, setVolume } from './sound.js';

const STYLE = `
.set-row { margin: 14px 0 6px; font-weight: 600; }
.set-langs { display: flex; gap: 10px; }
.set-langs button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 52px;
  border-radius: 10px; border: 2px solid rgba(255, 255, 255, 0.25); background: transparent; color: #fff; font-size: 17px; cursor: pointer; }
.set-langs button[aria-pressed="true"] { border-color: var(--help-accent); background: rgba(255, 255, 255, 0.1); font-weight: 700; }
.set-langs svg { border-radius: 2px; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4); }
.set-sound { display: flex; gap: 14px; align-items: center; }
.set-sound button { min-width: 88px; min-height: 48px; border-radius: 10px; border: 2px solid var(--help-accent);
  background: var(--help-accent); color: #111; font-size: 17px; font-weight: 700; cursor: pointer; }
.set-sound button[aria-pressed="false"] { background: transparent; color: #fff; }
.set-sound input { flex: 1; accent-color: var(--help-accent); height: 32px; }
`;

function injectStyle() {
  if (document.getElementById('settings-style')) return;
  const style = document.createElement('style');
  style.id = 'settings-style';
  style.textContent = STYLE;
  document.head.append(style);
}

export function openSettings({ theme = {}, onClose } = {}) {
  injectStyle();
  const render = () => `
    <p class="set-row" id="set-lang">${t('settings.language')}</p>
    <div class="set-langs" role="group" aria-labelledby="set-lang">
      ${LANGUAGES.map(
        (l) => `<button data-lang="${l.code}" aria-pressed="${l.code === getLang()}">${FLAGS[l.code]}<span>${l.name}</span></button>`,
      ).join('')}
    </div>
    <p class="set-row" id="set-sound">${t('settings.sound')}</p>
    <div class="set-sound">
      <button class="set-mute" aria-pressed="${!isMuted()}">${isMuted() ? t('settings.off') : t('settings.on')}</button>
      <input class="set-volume" type="range" min="0" max="100" step="5" value="${Math.round(getVolume() * 100)}"
        aria-label="${t('settings.volume')}" ${isMuted() ? 'disabled' : ''} />
    </div>`;

  let offLang = () => {};
  const { overlay } = showPanel({
    ...theme,
    title: t('settings.title'),
    html: '<div class="set-body"></div>',
    onClose: () => {
      offLang();
      onClose?.();
    },
  });
  const body = overlay.querySelector('.set-body');
  const title = overlay.querySelector('h2');

  const wire = () => {
    body.innerHTML = render();
    title.textContent = t('settings.title');
    body.querySelectorAll('[data-lang]').forEach((button) =>
      button.addEventListener('click', () => {
        playSound('click');
        setLang(button.dataset.lang);
      }),
    );
    body.querySelector('.set-mute').addEventListener('click', () => {
      setMuted(!isMuted());
      playSound('click');
      wire();
    });
    const slider = body.querySelector('.set-volume');
    slider.addEventListener('input', () => setVolume(Number(slider.value) / 100));
    slider.addEventListener('change', () => playSound('select'));
  };
  wire();
  // The dialog itself follows a language change right away.
  offLang = onLangChange(wire);
  overlay.querySelector('.help-close').focus();
}

// Round gear button matching addHomeButton(). Returns [circle, icon].
export function addSettingsButton(scene, x, y, { radius = 32, fill = 0x2b2d5c, stroke = 0xe0e2ff, icon = 0xffffff, onOpen, onClose, theme } = {}) {
  const circle = scene.add.circle(x, y, radius, fill).setStrokeStyle(3, stroke).setInteractive({ useHandCursor: true });
  const s = radius / 32;
  const g = scene.add.graphics({ x, y });
  g.fillStyle(icon);
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const points = [-0.22, 0.22].flatMap((d) => [
      { x: Math.cos(a + d) * 11 * s, y: Math.sin(a + d) * 11 * s },
    ]);
    const outer = [0.16, -0.16].map((d) => ({ x: Math.cos(a + d) * 18 * s, y: Math.sin(a + d) * 18 * s }));
    g.fillPoints([points[0], outer[1], outer[0], points[1]], true);
  }
  g.fillCircle(0, 0, 13 * s);
  g.fillStyle(fill);
  g.fillCircle(0, 0, 5.5 * s);
  circle.on('pointerup', () => {
    playSound('click');
    onOpen?.();
    openSettings({ theme, onClose });
  });
  return [circle, g];
}
