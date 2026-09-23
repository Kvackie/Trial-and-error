// Keyboard controls shared by the games (desktop second, on top of touch).
// Every game uses the same keys: W A S D to move or steer focus, Space to confirm
// or trigger the game's special action. Arrow keys are deliberately not used.
//
// bindKeys(scene, { up, left, down, right, action }, isBlocked)
//   Handlers are optional. Holding a direction repeats it (the OS key repeat);
//   holding Space fires once. Keys pause while any shared dialog is open (so typing a
//   name doesn't move the game); isBlocked() can pause them for other reasons.
import { isDialogOpen } from './help-dialog.js';

const KEYS = { up: 'W', left: 'A', down: 'S', right: 'D', action: 'SPACE' };

export function bindKeys(scene, handlers, isBlocked = () => false) {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;
  for (const [name, key] of Object.entries(KEYS)) {
    const handler = handlers[name];
    if (!handler) continue;
    keyboard.on(`keydown-${key}`, (event) => {
      if (isDialogOpen() || isBlocked() || (name === 'action' && event.repeat)) return;
      handler(event);
    });
  }
}
