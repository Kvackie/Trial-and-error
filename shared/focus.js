import { bindKeys } from './keyboard.js';

// Keyboard focus for games played by tapping things on screen: W/S move between
// rows, A/D along a row, Space taps the focused thing. The frame only shows once a
// key has been pressed, so touch players never see it.
//
//   const focus = addFocus(scene, () => rows, { color, isBlocked })
//     rows: [[{ x, y, w, h, activate }, …], …]  (recomputed on every key press)
//   focus.refresh()   call after the rows change; focus.hide()
export function addFocus(scene, getRows, { color = 0xffd23f, depth = 50, isBlocked } = {}) {
  const frame = scene.add.graphics().setDepth(depth).setVisible(false);
  let row = 0;
  let col = 0;
  let shown = false;

  const rows = () => getRows().filter((r) => r.length);
  const current = () => {
    const all = rows();
    if (!all.length) return null;
    row = Math.min(row, all.length - 1);
    col = Math.min(col, all[row].length - 1);
    return all[row][col];
  };

  const draw = () => {
    const item = current();
    frame.clear();
    if (!shown || !item) return frame.setVisible(false);
    frame.lineStyle(5, color).strokeRoundedRect(item.x - item.w / 2 - 6, item.y - item.h / 2 - 6, item.w + 12, item.h + 12, 14);
    frame.setVisible(true);
  };

  const moveRow = (step) => {
    const all = rows();
    const from = current();
    row = Math.max(0, Math.min(all.length - 1, row + step));
    // Land on the item closest to where we were.
    if (from) {
      const target = all[row];
      col = target.reduce((best, item, i) => (Math.abs(item.x - from.x) < Math.abs(target[best].x - from.x) ? i : best), 0);
    }
  };

  const key = (fn) => () => {
    if (!shown) shown = true;
    else fn();
    draw();
  };
  bindKeys(
    scene,
    {
      up: key(() => moveRow(-1)),
      down: key(() => moveRow(1)),
      left: key(() => (col = Math.max(0, col - 1))),
      right: key(() => (col = Math.min((rows()[row]?.length ?? 1) - 1, col + 1))),
      action: () => {
        shown = true;
        const item = current();
        item?.activate();
        draw();
      },
    },
    isBlocked,
  );
  // A tap hides the frame again.
  scene.input.on('pointerdown', () => {
    shown = false;
    draw();
  });

  return {
    refresh: draw,
    hide: () => {
      shown = false;
      draw();
    },
  };
}
