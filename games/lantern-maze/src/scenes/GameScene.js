import Phaser from 'phaser';
import { DIRS, E, N, S, W, dirByBit, generateMaze } from '../maze.js';
import { makePuzzle } from '../puzzles.js';
import { MAX_LIVES, isCheckpoint, loadProgress, resetProgress, saveProgress } from '../progress.js';
import { openConfirmDialog, openHelpDialog } from '../../../../shared/help-dialog.js';
import { helpHtml } from '../help.js';
import { tr } from '../strings.js';
import { addSettingsButton } from '../../../../shared/settings.js';
import { onSceneLangChange, t } from '../../../../shared/i18n.js';
import { playSound } from '../../../../shared/sound.js';
import { bindKeys } from '../../../../shared/keyboard.js';
import { addHomeButton } from '../../../../shared/home-button.js';
import { addTrophyButton, bestSubmitted, leaderboardEnabled, openLeaderboard, promptSubmit } from '../../../../shared/leaderboard.js';

// Black and white, gold accents, warm orange lantern light.
const INK = 0x000000;
const IVORY = 0xf5f1e6;
const GOLD = 0xd4a93c;
const GOLD_CSS = '#d4a93c';
const IVORY_CSS = '#f5f1e6';
const MUTED_CSS = '#8a847a';
const SERIF = 'Georgia, "Times New Roman", serif';
const DIALOG_THEME = { accent: GOLD_CSS, heading: GOLD_CSS, panel: '#0d0b09' };
// Puzzle feedback after a wrong answer: your pick in red, the right answer in green.
const WRONG = 0xb3261e;
const WRONG_EDGE = 0xff6b5e;
const RIGHT = 0x2e7d32;
const RIGHT_EDGE = 0x7ee07f;
const REVEAL_MS = 2000;

const CELL = 100; // world units per maze square
const HUD_H = 150;
const PAD_H = 170;
const BUTTON_H = 120;
const MOVE_MS = 130;
const REPEAT_MS = 170;
const SWIPE_DIST = 36;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  preload() {
    this.load.image('chest', 'art/lockedChest.png');
    this.load.image('goblet', 'art/goldGoblet.png');
    this.load.image('fire', 'art/groundFire.png');
    this.load.svg('player', 'player.svg', { width: 128, height: 192 });
  }

  create() {
    this.progress = loadProgress();
    this.modal = false;
    this.moving = false;
    this.keyTarget = null; // puzzle or lose screen taking the keys
    this.makeGlowTexture();

    this.floor = this.add.graphics().setDepth(0);
    this.glow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    this.walls = this.add.graphics().setDepth(2);
    this.items = []; // chest, goblet and fire images in the world
    this.player = this.add.image(0, 0, 'player').setDepth(4);
    this.player.setScale(84 / 192);
    this.tweens.add({ targets: this.glow, alpha: 0.82, duration: 180, yoyo: true, repeat: -1, repeatDelay: 90, ease: 'Sine.easeInOut' });

    this.buildHud();
    this.buildPad();
    this.setUpSwipe();
    this.setUpKeys();

    const mazeTop = HUD_H;
    const mazeBottom = this.scale.height - PAD_H;
    this.cameras.main.setFollowOffset(0, (mazeTop + mazeBottom) / 2 - this.scale.height / 2);
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);

    this.startLevel();
  }

  // --- Level flow ----------------------------------------------------------------

  startLevel() {
    const level = this.progress.level;
    this.maze = generateMaze(level);
    this.pos = { ...this.maze.start };
    this.visited = new Set([this.key(this.pos)]);
    this.solved = new Set();
    this.shownChests = new Set();
    this.items.forEach((item) => item.destroy());
    this.items = [];

    if (isCheckpoint(level)) {
      const { x, y } = this.cellCenter(this.maze.start);
      this.items.push(this.add.image(x, y + 14, 'fire').setDisplaySize(84, 84).setAlpha(0.9).setDepth(3));
    }

    const { x, y } = this.cellCenter(this.pos);
    this.player.setPosition(x, y);
    this.cameras.main.centerOn(x, y);
    this.redraw();
    this.updateHud();
    if (isCheckpoint(level)) playSound('checkpoint');
    this.banner(tr(isCheckpoint(level) ? 'checkpointBanner' : 'level', { level }));
  }

  levelComplete() {
    this.modal = true;
    playSound('levelUp');
    const { x, y } = this.cellCenter(this.maze.exit);
    const goblet = this.add.image(x, y, 'goblet').setDepth(3).setScale(0);
    this.items.push(goblet);
    this.tweens.add({ targets: goblet, scale: 80 / 128, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.glow, scale: this.glow.scale * 2.2, duration: 500, yoyo: true });

    const next = this.progress.level + 1;
    this.progress.level = next;
    this.progress.best = Math.max(this.progress.best, next);
    if (isCheckpoint(next)) {
      this.progress.checkpoint = next;
      this.progress.lives = MAX_LIVES; // a checkpoint refills the lantern
    }
    saveProgress(this.progress);

    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.startLevel();
        this.cameras.main.fadeIn(250, 0, 0, 0);
        this.modal = false;
      });
    });
  }

  loseRun() {
    this.modal = true;
    playSound('gameOver');
    const back = this.progress.checkpoint;
    this.progress.level = back;
    this.progress.lives = MAX_LIVES;
    saveProgress(this.progress);

    const overlay = this.overlayPanel(420);
    const { width, height } = this.scale;
    overlay.add(
      this.add
        .text(width / 2, height / 2 - 70, tr('lanternOut'), { fontFamily: SERIF, fontSize: '46px', color: GOLD_CSS })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(width / 2, height / 2 + 4, back === 1 ? tr('backToStart') : tr('backToCheckpoint', { level: back }), {
          fontFamily: SERIF,
          fontSize: '32px',
          color: IVORY_CSS,
        })
        .setOrigin(0.5),
    );
    overlay.add(
      this.add
        .text(width / 2, height / 2 + 90, tr('continue'), { fontFamily: SERIF, fontSize: '30px', color: MUTED_CSS, align: 'center', wordWrap: { width: width - 140 } })
        .setOrigin(0.5),
    );
    let done = false;
    const carryOn = () => {
      if (done) return;
      done = true;
      this.keyTarget = null;
      overlay.destroy();
      this.startLevel();
      this.modal = false;
    };
    this.time.delayedCall(500, () => {
      this.input.once('pointerup', carryOn);
      this.keyTarget = { confirm: carryOn };
    });
    // Offer the deepest level to the leaderboard if it hasn't been sent yet.
    if (leaderboardEnabled && this.progress.best > bestSubmitted('lantern-maze')) {
      this.time.delayedCall(700, () =>
        promptSubmit({ game: 'lantern-maze', score: this.progress.best, unit: t('unit.deepest'), theme: DIALOG_THEME }),
      );
    }
  }

  // --- Moving --------------------------------------------------------------------

  key({ x, y }) {
    return y * this.maze.width + x;
  }

  cellCenter({ x, y }) {
    return { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 };
  }

  tryMove(bit) {
    if (this.modal || this.moving) return;
    const dir = dirByBit[bit];
    if (dir.dx) this.player.setFlipX(dir.dx < 0);

    if (!this.maze.canMove(this.pos.x, this.pos.y, bit)) {
      // Bump into the wall.
      playSound('bump');
      const { x, y } = this.cellCenter(this.pos);
      this.moving = true;
      this.tweens.add({
        targets: this.player,
        x: x + dir.dx * 12,
        y: y + dir.dy * 12,
        duration: 60,
        yoyo: true,
        onComplete: () => (this.moving = false),
      });
      return;
    }

    this.pos = { x: this.pos.x + dir.dx, y: this.pos.y + dir.dy };
    this.visited.add(this.key(this.pos));
    playSound('step');
    const target = this.cellCenter(this.pos);
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y,
      duration: MOVE_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.moving = false;
        this.redraw();
        this.arrive();
      },
    });
  }

  arrive() {
    const { x, y } = this.pos;
    if (x === this.maze.exit.x && y === this.maze.exit.y) {
      this.levelComplete();
    } else if (this.maze.isDeadEnd(x, y) && !this.solved.has(this.key(this.pos))) {
      this.openPuzzle();
    }
  }

  // --- Drawing -------------------------------------------------------------------

  // Known squares: everywhere you've walked (dim, with walls) and the lit squares
  // around you. Open squares next to you show only as floor: no walls, nothing on them.
  redraw() {
    const f = this.floor;
    const w = this.walls;
    f.clear();
    w.clear();

    const here = this.pos;
    const lit = [];
    for (const dir of DIRS) {
      if (this.maze.canMove(here.x, here.y, dir.bit)) lit.push({ x: here.x + dir.dx, y: here.y + dir.dy });
    }

    for (const cell of lit) {
      if (this.visited.has(this.key(cell))) continue;
      f.fillStyle(0x2a2016).fillRect(cell.x * CELL + 4, cell.y * CELL + 4, CELL - 8, CELL - 8);
    }

    for (const index of this.visited) {
      const cell = { x: index % this.maze.width, y: Math.floor(index / this.maze.width) };
      const isHere = cell.x === here.x && cell.y === here.y;
      f.fillStyle(isHere ? 0x33281b : 0x1b1814).fillRect(cell.x * CELL, cell.y * CELL, CELL, CELL);
      w.lineStyle(isHere ? 6 : 4, IVORY, isHere ? 1 : 0.38);
      this.drawWalls(w, cell);
    }

    // Cleared chests stay on the map, faded.
    for (const index of this.solved) {
      if (this.shownChests.has(index)) continue;
      const cell = { x: index % this.maze.width, y: Math.floor(index / this.maze.width) };
      const { x, y } = this.cellCenter(cell);
      this.items.push(this.add.image(x, y, 'chest').setDisplaySize(64, 64).setAlpha(0.35).setDepth(3));
      this.shownChests.add(index);
    }

    const { x, y } = this.cellCenter(here);
    this.glow.setPosition(x, y).setDisplaySize(CELL * 3.6, CELL * 3.6);
  }

  drawWalls(g, { x, y }) {
    const open = this.maze.openAt(x, y);
    const left = x * CELL;
    const top = y * CELL;
    if (!(open & N)) g.lineBetween(left, top, left + CELL, top);
    if (!(open & S)) g.lineBetween(left, top + CELL, left + CELL, top + CELL);
    if (!(open & W)) g.lineBetween(left, top, left, top + CELL);
    if (!(open & E)) g.lineBetween(left + CELL, top, left + CELL, top + CELL);
  }

  makeGlowTexture() {
    if (this.textures.exists('glow')) return;
    const size = 256;
    const texture = this.textures.createCanvas('glow', size, size);
    const ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 170, 80, 0.55)');
    gradient.addColorStop(0.45, 'rgba(255, 140, 50, 0.22)');
    gradient.addColorStop(1, 'rgba(255, 120, 30, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    texture.refresh();
  }

  // --- HUD and controls ------------------------------------------------------------

  ui(object) {
    return object.setScrollFactor(0).setDepth(50);
  }

  buildHud() {
    const { width } = this.scale;
    this.ui(this.add.rectangle(width / 2, HUD_H / 2, width, HUD_H, INK));
    this.ui(this.add.rectangle(width / 2, HUD_H - 1, width, 2, GOLD, 0.5));

    this.levelText = this.ui(
      this.add.text(width / 2, 50, '', { fontFamily: SERIF, fontSize: '52px', color: GOLD_CSS }).setOrigin(0.5),
    );
    this.hearts = [0, 1, 2].map((i) =>
      this.ui(this.add.text(width / 2 + (i - 1) * 44, 108, '♥', { fontFamily: SERIF, fontSize: '36px' }).setOrigin(0.5)),
    );
    this.bestText = this.ui(
      this.add.text(24, 118, '', { fontFamily: SERIF, fontSize: '24px', color: MUTED_CSS }).setOrigin(0, 0.5),
    );

    addHomeButton(this, 56, 60, { fill: INK, stroke: GOLD, icon: GOLD, onBeforeLeave: () => !this.modal }).forEach((o) => this.ui(o));
    addTrophyButton(this, 136, 60, { fill: INK, stroke: GOLD, icon: GOLD, onClick: () => this.showLeaderboard() }).forEach((o) => this.ui(o));

    // Reset: small and tucked under the help button, and it always asks first.
    const reset = this.ui(
      this.add.text(width - 24, 118, tr('reset'), { fontFamily: SERIF, fontSize: '24px', color: MUTED_CSS }).setOrigin(1, 0.5),
    );
    reset.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-12, -18, reset.width + 24, reset.height + 36), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    reset.on('pointerup', () => this.confirmReset());
    onSceneLangChange(this, () => {
      reset.setText(tr('reset'));
      reset.input.hitArea.setTo(-12, -18, reset.width + 24, reset.height + 36);
      this.updateHud();
    });

    addSettingsButton(this, width - 136, 60, {
      fill: INK,
      stroke: GOLD,
      icon: GOLD,
      theme: DIALOG_THEME,
      onOpen: () => (this.modal = true),
      onClose: () => (this.modal = false),
    }).forEach((o) => this.ui(o));

    const help = this.ui(this.add.circle(width - 56, 60, 32, INK).setStrokeStyle(3, GOLD));
    this.ui(this.add.text(width - 56, 60, '?', { fontFamily: SERIF, fontSize: '40px', color: GOLD_CSS }).setOrigin(0.5));
    help.setInteractive({ useHandCursor: true }).on('pointerup', () => this.showHelp());
  }

  updateHud() {
    this.levelText.setText(tr('level', { level: this.progress.level }));
    this.bestText.setText(tr('deepest', { level: this.progress.best }));
    this.hearts.forEach((heart, i) => {
      const full = i < this.progress.lives;
      heart.setText(full ? '♥' : '♡').setColor(full ? '#ff9a3c' : '#4a453d');
    });
  }

  buildPad() {
    const { width, height } = this.scale;
    this.ui(this.add.rectangle(width / 2, height - PAD_H / 2, width, PAD_H, INK));
    this.ui(this.add.rectangle(width / 2, height - PAD_H + 1, width, 2, GOLD, 0.5));

    const buttons = [
      { label: '◀', bit: W },
      { label: '▲', bit: N },
      { label: '▼', bit: S },
      { label: '▶', bit: E },
    ];
    const gap = 14;
    const bw = (width - 2 * 24 - gap * 3) / 4;
    const y = height - PAD_H / 2;
    buttons.forEach(({ label, bit }, i) => {
      const x = 24 + bw / 2 + i * (bw + gap);
      const bg = this.ui(this.add.rectangle(x, y, bw, BUTTON_H, 0x0d0b09).setStrokeStyle(3, GOLD));
      this.ui(this.add.text(x, y, label, { fontFamily: SERIF, fontSize: '48px', color: IVORY_CSS }).setOrigin(0.5));
      bg.setInteractive();

      let timer = null;
      const release = () => {
        bg.setFillStyle(0x0d0b09);
        timer?.remove();
        timer = null;
      };
      bg.on('pointerdown', () => {
        bg.setFillStyle(0x2e2418);
        this.tryMove(bit);
        timer = this.time.addEvent({ delay: REPEAT_MS, loop: true, callback: () => this.tryMove(bit) });
      });
      bg.on('pointerup', release);
      bg.on('pointerout', release);
    });
  }

  setUpSwipe() {
    const inMaze = (y) => y > HUD_H && y < this.scale.height - PAD_H;
    this.input.on('pointerdown', (pointer) => {
      this.swipe = inMaze(pointer.y) ? { x: pointer.x, y: pointer.y, id: pointer.id } : null;
    });
    this.input.on('pointermove', (pointer) => {
      const swipe = this.swipe;
      if (!swipe || swipe.id !== pointer.id || !pointer.isDown) return;
      const dx = pointer.x - swipe.x;
      const dy = pointer.y - swipe.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DIST) return;
      this.swipe = null;
      this.tryMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? E : W) : dy > 0 ? S : N);
    });
    this.input.on('pointerup', () => (this.swipe = null));
  }

  // WASD walks, or moves the highlight between a puzzle's answers; Space picks the
  // highlighted answer or carries on after the lantern goes out. While a puzzle or
  // that screen is up, keyTarget receives the keys instead of the player.
  setUpKeys() {
    const direction = (bit, dx, dy) => () => {
      if (this.keyTarget) this.keyTarget.move?.(dx, dy);
      else this.tryMove(bit);
    };
    bindKeys(this, {
      up: direction(N, 0, -1),
      left: direction(W, -1, 0),
      down: direction(S, 0, 1),
      right: direction(E, 1, 0),
      action: () => this.keyTarget?.confirm?.(),
    });
  }

  showLeaderboard() {
    if (this.modal) return;
    this.modal = true;
    openLeaderboard({
      game: 'lantern-maze',
      unit: t('unit.level'),
      myBest: this.progress.best,
      theme: DIALOG_THEME,
      onClose: () => (this.modal = false),
    });
  }

  showHelp() {
    if (this.modal) return;
    this.modal = true;
    playSound('click');
    openHelpDialog({ title: t('help.title'), html: helpHtml(), ...DIALOG_THEME, onClose: () => (this.modal = false) });
  }

  confirmReset() {
    if (this.modal) return;
    this.modal = true;
    openConfirmDialog({
      title: tr('resetTitle'),
      message: tr('resetMessage'),
      confirmLabel: tr('reset'),
      ...DIALOG_THEME,
      onClose: () => (this.modal = false),
      onConfirm: () => {
        this.progress = resetProgress();
        this.startLevel();
      },
    });
  }

  banner(message) {
    const { width, height } = this.scale;
    const text = this.ui(
      this.add
        .text(width / 2, height / 2 - 140, message, {
          fontFamily: SERIF,
          fontSize: '56px',
          color: GOLD_CSS,
          align: 'center',
          stroke: '#000000',
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(60)
        .setAlpha(0),
    );
    this.tweens.add({ targets: text, alpha: 1, duration: 250, yoyo: true, hold: 900, onComplete: () => text.destroy() });
  }

  // --- Puzzles ---------------------------------------------------------------------

  overlayPanel(panelHeight) {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
    const dim = this.add.rectangle(width / 2, height / 2, width, height, INK, 0.78).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(0x0d0b09).fillRoundedRect(40, height / 2 - panelHeight / 2, width - 80, panelHeight, 18);
    panel.lineStyle(3, GOLD).strokeRoundedRect(40, height / 2 - panelHeight / 2, width - 80, panelHeight, 18);
    overlay.add([dim, panel]);
    // Children need a fixed scroll factor too, or their tap areas drift with the
    // camera as it follows the player.
    const add = overlay.add.bind(overlay);
    overlay.add = (child) => {
      [].concat(child).forEach((c) => c.setScrollFactor(0));
      return add(child);
    };
    dim.setScrollFactor(0);
    panel.setScrollFactor(0);
    return overlay;
  }

  openPuzzle() {
    this.modal = true;
    playSound('chest');
    const { width, height } = this.scale;
    const panelHeight = 760;
    const top = height / 2 - panelHeight / 2;
    const overlay = this.overlayPanel(panelHeight);
    this.cameras.main.flash(180, 255, 150, 60);

    overlay.add(this.add.image(width / 2, top + 90, 'chest').setDisplaySize(120, 120));
    overlay.add(
      this.add
        .text(width / 2, top + 178, tr('chest'), { fontFamily: SERIF, fontSize: '30px', color: IVORY_CSS })
        .setOrigin(0.5),
    );
    const question = this.add.text(width / 2, top + 268, '', { fontFamily: SERIF, fontSize: '68px', color: '#ffffff' }).setOrigin(0.5);
    const lives = this.add.text(width / 2, top + 340, '', { fontFamily: SERIF, fontSize: '30px', color: '#ff9a3c' }).setOrigin(0.5);
    overlay.add([question, lives]);

    const bw = 270;
    const bh = 130;
    const buttons = [0, 1, 2, 3].map((i) => {
      const x = width / 2 + (i % 2 ? 1 : -1) * (bw / 2 + 12);
      const y = top + 460 + Math.floor(i / 2) * (bh + 24);
      const bg = this.add.rectangle(x, y, bw, bh, 0x16120d).setStrokeStyle(3, GOLD).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, '', { fontFamily: SERIF, fontSize: '56px', color: IVORY_CSS }).setOrigin(0.5);
      overlay.add([bg, label]);
      return { bg, label };
    });

    let puzzle;
    let answered = false;
    let focus = null; // keyboard highlight, 0-3 in reading order
    const showFocus = () =>
      buttons.forEach(({ bg }, i) => bg.setStrokeStyle(i === focus ? 6 : 3, i === focus ? IVORY : GOLD));

    const ask = () => {
      puzzle = makePuzzle(this.progress.level);
      answered = false;
      question.setText(puzzle.text);
      lives.setText(`${'♥'.repeat(this.progress.lives)}${'♡'.repeat(MAX_LIVES - this.progress.lives)}`);
      buttons.forEach(({ bg, label }, i) => {
        bg.setFillStyle(0x16120d);
        label.setText(formatOption(puzzle.options[i])).setColor(IVORY_CSS);
      });
      showFocus();
    };

    this.keyTarget = {
      move: (dx, dy) => {
        if (answered) return;
        if (focus === null) focus = 0;
        else focus = Math.min(1, Math.max(0, (focus % 2) + dx)) + 2 * Math.min(1, Math.max(0, Math.floor(focus / 2) + dy));
        showFocus();
      },
      confirm: () => focus !== null && choose(focus),
    };

    const choose = (i) => {
      if (answered) return;
      answered = true;
      const { bg, label } = buttons[i];
      if (puzzle.options[i] === puzzle.answer) {
        playSound('correct');
        bg.setFillStyle(GOLD);
        label.setColor('#0d0b09');
        this.solved.add(this.key(this.pos));
        this.time.delayedCall(450, () => {
          this.keyTarget = null;
          overlay.destroy();
          this.redraw();
          this.modal = false;
        });
      } else {
        // Wrong pick in red, the right answer in green, for a couple of seconds.
        playSound('wrong');
        bg.setFillStyle(WRONG).setStrokeStyle(4, WRONG_EDGE);
        label.setColor('#ffffff');
        const right = buttons.find((_, j) => puzzle.options[j] === puzzle.answer);
        right.bg.setFillStyle(RIGHT).setStrokeStyle(4, RIGHT_EDGE);
        right.label.setColor('#ffffff');
        this.cameras.main.shake(160, 0.006);
        this.progress.lives--;
        saveProgress(this.progress);
        this.updateHud();
        lives.setText(`${'♥'.repeat(this.progress.lives)}${'♡'.repeat(MAX_LIVES - this.progress.lives)}`);
        this.time.delayedCall(REVEAL_MS, () => {
          if (this.progress.lives <= 0) {
            this.keyTarget = null;
            overlay.destroy();
            this.loseRun();
          } else {
            ask();
          }
        });
      }
    };

    buttons.forEach(({ bg }, i) => bg.on('pointerup', () => choose(i)));
    ask();
  }
}

const formatOption = (n) => (n < 0 ? `−${Math.abs(n)}` : String(n));
