import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Leave the game:
//   website            back to the hub page one folder up
//   all-games app      back to the game list (games live in /<game>/ there)
//   single-game APK    close the app (the game is the app's root page)
export function goHome() {
  const inFolder = !/^\/(index\.html)?$/.test(window.location.pathname);
  if (!Capacitor.isNativePlatform()) {
    window.location.href = '../';
  } else if (inFolder) {
    // Came from the list: step back so Back on the list closes the app as usual.
    if (window.history.length > 1) window.history.back();
    else window.location.replace('../index.html');
  } else {
    App.exitApp();
  }
}

// Round Home button with a house icon. Returns [circle, icon] so a game can set
// depth or scroll factor on them.
//   addHomeButton(scene, x, y, { radius, fill, stroke, icon, onBeforeLeave })
export function addHomeButton(scene, x, y, { radius = 32, fill = 0x2b2d5c, stroke = 0xe0e2ff, icon = 0xffffff, onBeforeLeave } = {}) {
  const circle = scene.add.circle(x, y, radius, fill).setStrokeStyle(3, stroke).setInteractive({ useHandCursor: true });
  const s = radius / 32; // icon drawn for a 32-unit radius
  const g = scene.add.graphics({ x, y });
  g.fillStyle(icon);
  g.fillTriangle(-17 * s, -2 * s, 17 * s, -2 * s, 0, -18 * s); // roof
  g.fillRect(-12 * s, -3 * s, 24 * s, 19 * s); // walls
  g.fillStyle(fill);
  g.fillRect(-4 * s, 5 * s, 8 * s, 11 * s); // door
  circle.on('pointerup', () => {
    if (onBeforeLeave?.() === false) return;
    goHome();
  });
  return [circle, g];
}
