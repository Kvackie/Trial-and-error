import Phaser from 'phaser';
import { BOOK, RARE, breed } from '../genes.js';
import { BAIT_MAX, GROW_MS, POND_CAP, REST_MS, addCreature, canBreed, growLeft, loadPond, removeCreature, restLeft, savePond, updateBait } from '../pond.js';
import { creatureTexture } from '../creature-art.js';
import { catchCreature, claimFind, fetchFirsts, releaseCreature } from '../online.js';
import { THEME, openBook, openHelp } from '../help.js';
import { tr } from '../strings.js';
import { addHomeButton } from '../../../../shared/home-button.js';
import { addSettingsButton } from '../../../../shared/settings.js';
import { addTrophyButton, openLeaderboard } from '../../../../shared/leaderboard.js';
import { openConfirmDialog } from '../../../../shared/help-dialog.js';
import { addFocus } from '../../../../shared/focus.js';
import { showToast } from '../../../../shared/toast.js';
import { bindText, onSceneLangChange } from '../../../../shared/i18n.js';
import { playSound } from '../../../../shared/sound.js';

const HEADER_H = 120;
const MARGIN = 16;
const INFO_H = 110;
const BUTTON_H = 120;
const ADULT_SCALE = 1.1;
const BABY_SCALE = 0.55;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.pond = loadPond();
    updateBait(this.pond);
    this.firsts = {};
    fetchFirsts()
      .then((firsts) => (this.firsts = firsts))
      .catch(() => {});
    this.selected = [];
    this.views = new Map(); // creature id -> view
    this.busy = false;

    const height = this.scale.height;
    const top = HEADER_H;
    const bottom = height - MARGIN - BUTTON_H - INFO_H;
    this.area = new Phaser.Geom.Rectangle(MARGIN, top, 720 - 2 * MARGIN, bottom - top);
    this.drawPond();

    this.rings = this.add.graphics().setDepth(5);
    for (const creature of this.pond.creatures) this.addView(creature);

    this.setUpHeader();
    this.setUpInfo(bottom);
    this.setUpButtons(height - MARGIN - BUTTON_H / 2);

    this.focus = addFocus(this, () => [
      this.pond.creatures.map((c) => {
        const { img } = this.views.get(c.id);
        return { x: img.x, y: img.y, w: img.displayWidth * 0.7, h: img.displayHeight * 0.7, activate: () => this.toggle(c.id) };
      }),
      this.buttons.map((b) => ({ x: b.x, y: b.y, w: b.w, h: BUTTON_H, activate: b.press })),
    ]);

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refresh() });
    onSceneLangChange(this, () => this.refresh());
    this.refresh();
  }

  // --- Drawing the pond --------------------------------------------------------

  drawPond() {
    const { x, y, width, height } = this.area;
    // The water: a gradient drawn on a canvas, since Phaser's gradient fill doesn't follow rounded corners.
    if (this.textures.exists('water')) this.textures.remove('water');
    const water = this.textures.createCanvas('water', width, height);
    const ctx = water.getContext();
    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, '#3cc4d6');
    fill.addColorStop(1, '#0b4462');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 28);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#d9c38a'; // sandy bottom
    ctx.beginPath();
    ctx.ellipse(width / 2, height + 10, width * 0.6, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    water.refresh();
    this.add.image(x, y, 'water').setOrigin(0);
    const g = this.add.graphics();
    // Pebbles and weed.
    const rng = new Phaser.Math.RandomDataGenerator(['pond']);
    for (let i = 0; i < 14; i++) {
      g.fillStyle(rng.pick([0x8a7f6a, 0xa89a7c, 0x6f6757]), 1);
      g.fillEllipse(x + 30 + rng.between(0, width - 60), y + height - rng.between(6, 24), rng.between(14, 30), rng.between(10, 18));
    }
    g.lineStyle(6, 0x3f9b54, 0.9);
    for (let i = 0; i < 7; i++) {
      const baseX = x + 40 + rng.between(0, width - 80);
      const tall = rng.between(80, 180);
      const curve = new Phaser.Curves.Spline([baseX, y + height - 6, baseX - 12, y + height - tall / 2, baseX + 10, y + height - tall]);
      curve.draw(g, 20);
    }
    g.lineStyle(4, 0xffffff, 0.15);
    g.strokeRoundedRect(x, y, width, height, 28);

    // Rising bubbles.
    for (let i = 0; i < 8; i++) {
      const bubble = this.add.circle(0, 0, rng.between(3, 7)).setStrokeStyle(2, 0xffffff, 0.5);
      const rise = () => {
        bubble.setPosition(x + 20 + Math.random() * (width - 40), y + height - 20).setAlpha(0.8);
        this.tweens.add({ targets: bubble, y: y + 20, alpha: 0.2, duration: 5000 + Math.random() * 5000, delay: Math.random() * 3000, onComplete: rise });
      };
      rise();
    }
  }

  // --- Creatures ---------------------------------------------------------------

  // Where creatures may swim: inside the pond, clear of its edges.
  bounds() {
    const { x, y, width, height } = this.area;
    return new Phaser.Geom.Rectangle(x + 110, y + 90, width - 220, height - 200);
  }

  addView(creature, at) {
    const b = this.bounds();
    const img = this.add.image(at?.x ?? b.x + Math.random() * b.width, at?.y ?? b.y + Math.random() * b.height, creatureTexture(this, creature.genes));
    img.setDepth(2).setInteractive({ useHandCursor: true, pixelPerfect: false });
    img.on('pointerup', () => this.toggle(creature.id));
    const view = { img, target: null, wait: Math.random() * 1500, speed: 40 + Math.random() * 40, phase: Math.random() * 6 };
    this.views.set(creature.id, view);
    return view;
  }

  update(time, delta) {
    const b = this.bounds();
    const now = Date.now();
    for (const creature of this.pond.creatures) {
      const view = this.views.get(creature.id);
      if (!view || view.held) continue;
      const { img } = view;
      const grown = 1 - growLeft(creature, now) / GROW_MS;
      img.setScale((BABY_SCALE + (ADULT_SCALE - BABY_SCALE) * grown) * (creature.genes.size / 100));
      if (view.wait > 0) {
        view.wait -= delta;
      } else if (!view.target) {
        view.target = { x: b.x + Math.random() * b.width, y: b.y + Math.random() * b.height };
      } else {
        const dx = view.target.x - img.x;
        const dy = view.target.y - img.y;
        const dist = Math.hypot(dx, dy);
        const step = (view.speed * delta) / 1000;
        if (dist <= step) {
          view.target = null;
          view.wait = 800 + Math.random() * 2500;
        } else {
          img.x += (dx / dist) * step;
          img.y += (dy / dist) * step;
          if (Math.abs(dx) > 4) img.setFlipX(dx < 0);
        }
      }
      // Gentle bob and wiggle.
      img.setRotation(Math.sin(time / 400 + view.phase) * 0.06);
    }
    this.drawRings();
    this.focus.refresh(); // the focused creature swims
  }

  drawRings() {
    this.rings.clear();
    this.selected.forEach((id, i) => {
      const img = this.views.get(id)?.img;
      if (!img) return;
      this.rings.lineStyle(5, i === 0 ? 0xffe48a : 0xffffff, 0.95);
      this.rings.strokeEllipse(img.x, img.y + 4, img.displayWidth * 0.78, img.displayHeight * 0.78);
    });
  }

  toggle(id) {
    if (this.busy) return;
    playSound('select');
    if (this.selected.includes(id)) this.selected = this.selected.filter((s) => s !== id);
    else this.selected = [...this.selected, id].slice(-2);
    this.refresh();
  }

  // --- Header, info line and buttons ------------------------------------------

  setUpHeader() {
    const y = 60;
    const pause = () => this.scene.pause();
    const resume = () => this.scene.resume();
    addHomeButton(this, 56, y);
    addTrophyButton(this, 136, y, {
      onClick: () => {
        pause();
        openLeaderboard({ game: 'wild-pond', unit: tr('unit'), myBest: this.pond.found.length, theme: THEME, onClose: resume });
      },
    });
    addSettingsButton(this, 720 - 136, y, { theme: THEME, onOpen: pause, onClose: resume });
    const help = this.add.circle(720 - 56, y, 32, 0x2b2d5c).setStrokeStyle(3, 0xe0e2ff).setInteractive({ useHandCursor: true });
    this.add.text(help.x, y, '?', { fontFamily: 'sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    help.on('pointerup', () => {
      playSound('click');
      pause();
      openHelp(resume);
    });

    const style = { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: '30px' };
    this.baitText = this.add.text(360, y - 20, '', { ...style, color: '#ffe48a' }).setOrigin(0.5);
    this.bookText = this.add.text(360, y + 20, '', { ...style, color: '#bff4ef' }).setOrigin(0.5);
  }

  setUpInfo(top) {
    this.info = this.add
      .text(360, top + INFO_H / 2, '', {
        fontFamily: 'sans-serif',
        fontSize: '27px',
        color: '#e8fbff',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: 680 },
      })
      .setOrigin(0.5);
  }

  setUpButtons(y) {
    const specs = [
      { label: () => tr('breed'), color: 0xff7fc4, press: () => this.breed(), enabled: () => !this.breedProblem() },
      { label: () => tr('release'), color: 0x35aef5, press: () => this.release(), enabled: () => !this.releaseProblem() },
      { label: () => tr('fish'), color: 0xffc53a, press: () => this.fish(), enabled: () => !this.fishProblem() },
      { label: () => tr('bookButton'), color: 0x5fcf5a, press: () => this.openBook(), enabled: () => true },
    ];
    const gap = 12;
    const w = (720 - 2 * MARGIN - gap * (specs.length - 1)) / specs.length;
    this.buttons = specs.map((spec, i) => {
      const x = MARGIN + w / 2 + i * (w + gap);
      const bg = this.add.graphics();
      bg.fillStyle(0x0b2733, 0.9).fillRoundedRect(x - w / 2, y - BUTTON_H / 2, w, BUTTON_H, 18);
      bg.lineStyle(4, spec.color).strokeRoundedRect(x - w / 2, y - BUTTON_H / 2, w, BUTTON_H, 18);
      const text = this.add.text(x, y, '', { fontFamily: 'sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      bindText(this, text, spec.label);
      const zone = this.add.zone(x, y, w, BUTTON_H).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => spec.press());
      return { x, y, w, bg, text, press: spec.press, enabled: spec.enabled };
    });
  }

  selectedCreatures() {
    return this.selected.map((id) => this.pond.creatures.find((c) => c.id === id)).filter(Boolean);
  }

  breedProblem() {
    const pair = this.selectedCreatures();
    if (pair.length < 2) return tr('hintPick');
    if (!pair.every((c) => canBreed(c))) return tr('pairNotReady');
    if (this.pond.creatures.length >= POND_CAP) return tr('pondFull');
    return null;
  }

  releaseProblem() {
    if (!this.selected.length) return tr('hintPick');
    if (this.pond.creatures.length <= 2) return tr('lastOnes');
    return null;
  }

  fishProblem() {
    if (this.pond.creatures.length >= POND_CAP) return tr('pondFull');
    if (this.pond.bait <= 0) return tr('noBait');
    return null;
  }

  describe(creature) {
    const { genes } = creature;
    const traits = ['colour', 'body', 'pattern', 'fins', 'eyes', 'crest', 'glow']
      .filter((trait) => !(trait === 'glow' && genes.glow === 'none') && !(trait === 'crest' && genes.crest === 'none'))
      .map((trait) => tr(`${trait}:${genes[trait]}`) + (RARE.has(`${trait}:${genes[trait]}`) ? '★' : ''))
      .join(' · ');
    const grow = growLeft(creature);
    const rest = restLeft(creature);
    const status = grow ? tr('baby', { s: Math.ceil(grow / 1000) }) : rest ? tr('resting', { s: Math.ceil(rest / 1000) }) : tr('ready');
    const origin = creature.from ? tr('from', { name: creature.from }) : creature.bred ? tr('bred') : tr('wild');
    return `${traits}\n${status} · ${origin}`;
  }

  refresh() {
    updateBait(this.pond);
    this.baitText.setText(tr('bait', { n: this.pond.bait, max: BAIT_MAX }));
    this.bookText.setText(tr('book', { n: this.pond.found.length, max: BOOK.length }));
    this.selected = this.selected.filter((id) => this.views.has(id));
    const chosen = this.selectedCreatures();
    if (chosen.length === 1) this.info.setText(this.describe(chosen[0]));
    else if (chosen.length === 2) this.info.setText(this.breedProblem() ?? tr('pairReady'));
    else this.info.setText(tr('hintPick'));
    for (const button of this.buttons) {
      const on = button.enabled() && !this.busy;
      button.bg.setAlpha(on ? 1 : 0.45);
      button.text.setAlpha(on ? 1 : 0.5);
    }
    this.focus?.refresh();
  }

  // --- Actions -----------------------------------------------------------------

  breed() {
    const problem = this.breedProblem();
    if (problem || this.busy) return this.refuse(problem);
    const [a, b] = this.selectedCreatures();
    const now = Date.now();
    a.restUntil = b.restUntil = now + REST_MS;
    const va = this.views.get(a.id);
    const vb = this.views.get(b.id);
    const mid = { x: (va.img.x + vb.img.x) / 2, y: (va.img.y + vb.img.y) / 2 };
    this.busy = true;
    this.selected = [];
    playSound('swap');
    // The parents meet in the middle, then an egg hatches between them.
    for (const [view, side] of [[va, -1], [vb, 1]]) {
      view.held = true;
      view.target = null;
      view.img.setFlipX(side > 0);
      this.tweens.add({ targets: view.img, x: mid.x + side * 70, y: mid.y, duration: 700, ease: 'Sine.easeInOut' });
    }
    const egg = this.add.ellipse(mid.x, mid.y, 10, 13, 0xfff6e0).setStrokeStyle(3, 0xd9c38a).setDepth(3);
    this.tweens.add({
      targets: egg,
      scale: 4,
      delay: 600,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: egg, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => this.hatch(a, b, egg, mid, [va, vb]) });
      },
    });
    this.refresh();
  }

  hatch(a, b, egg, at, parents) {
    egg.destroy();
    playSound('hatch');
    const { creature, fresh } = addCreature(this.pond, breed(a.genes, b.genes), { bred: true });
    const view = this.addView(creature, at);
    view.wait = 1200;
    for (const parent of parents) parent.held = false;
    savePond(this.pond);
    this.busy = false;
    this.refresh();
    this.announce(fresh);
  }

  release() {
    const problem = this.releaseProblem();
    if (problem || this.busy) return this.refuse(problem);
    const creature = this.selectedCreatures().at(-1);
    playSound('click');
    this.scene.pause();
    openConfirmDialog({
      ...THEME,
      title: tr('releaseTitle'),
      message: tr('releaseMessage'),
      confirmLabel: tr('releaseYes'),
      onConfirm: () => {
        this.scene.resume();
        this.swimAway(creature);
      },
      onClose: () => this.scene.resume(),
    });
  }

  swimAway(creature) {
    const view = this.views.get(creature.id);
    removeCreature(this.pond, creature.id);
    this.views.delete(creature.id);
    this.pond.bait = Math.min(BAIT_MAX, this.pond.bait + 1);
    savePond(this.pond);
    playSound('splash');
    this.tweens.add({ targets: view.img, y: this.area.bottom + 40, alpha: 0, scale: 0.2, duration: 900, ease: 'Sine.easeIn', onComplete: () => view.img.destroy() });
    releaseCreature(creature.genes);
    this.refresh();
  }

  fish() {
    const problem = this.fishProblem();
    if (problem || this.busy) return this.refuse(problem);
    this.busy = true;
    this.pond.bait -= 1;
    if (this.pond.bait === BAIT_MAX - 1) this.pond.baitAt = Date.now();
    savePond(this.pond);
    this.refresh();
    playSound('splash');

    const b = this.bounds();
    const hook = { x: b.x + Math.random() * b.width, y: b.y + b.height * (0.3 + Math.random() * 0.5) };
    const line = this.add.graphics().setDepth(4);
    const drop = { y: this.area.y };
    const drawLine = () => {
      line.clear().lineStyle(3, 0xffffff, 0.8).lineBetween(hook.x, this.area.y, hook.x, drop.y);
      line.fillStyle(0xff5a4a).fillCircle(hook.x, drop.y, 9);
    };
    this.tweens.add({ targets: drop, y: hook.y, duration: 700, ease: 'Sine.easeOut', onUpdate: drawLine });

    const started = Date.now();
    catchCreature()
      .then(({ genes, from }) => {
        // Let the line settle a moment before the bite, however fast the answer was.
        this.time.delayedCall(Math.max(0, 1300 - (Date.now() - started)), () => {
          line.destroy();
          playSound('catch');
          const { creature, fresh } = addCreature(this.pond, genes, { from });
          const view = this.addView(creature, hook);
          view.wait = 1500;
          view.img.setScale(0.1);
          savePond(this.pond);
          this.busy = false;
          showToast(this, from ? tr('caughtFrom', { name: from }) : tr('caughtWild'), { y: this.area.y + 80, color: '#ffe48a' });
          this.refresh();
          this.time.delayedCall(2600, () => this.announce(fresh));
        });
      })
      .catch(() => {
        line.destroy();
        this.pond.bait = Math.min(BAIT_MAX, this.pond.bait + 1);
        savePond(this.pond);
        this.busy = false;
        this.refresh();
        showToast(this, tr('offline'), { y: this.area.centerY });
      });
  }

  // New book entries: a note for each, and a claim on the global record for rare ones.
  announce(fresh) {
    if (!fresh.length) return;
    playSound('discover');
    showToast(this, tr('newEntry', { name: fresh.map((key) => tr(key)).join(', ') }), { y: this.area.centerY, color: '#bff4ef' });
    const rare = fresh.filter((key) => RARE.has(key));
    const claimNext = () => {
      const key = rare.shift();
      if (!key) return;
      claimFind(key, (result) => {
        if (result) {
          this.firsts[key] = result.first;
          if (result.you) playSound('levelUp');
          const text = result.you ? tr('firstEver', { name: tr(key) }) : tr('firstBy', { name: tr(key), who: result.first });
          showToast(this, text, { y: this.area.centerY + 90, color: result.you ? '#ffd23f' : '#ffffff', duration: 3200 });
        }
        this.time.delayedCall(1200, claimNext);
      });
    };
    if (rare.length) this.time.delayedCall(1800, claimNext);
  }

  refuse(reason) {
    playSound('invalid');
    if (reason) showToast(this, reason, { y: this.area.bottom - 80, fontSize: 28 });
  }

  openBook() {
    playSound('click');
    this.scene.pause();
    openBook({ found: this.pond.found, firsts: this.firsts, onClose: () => this.scene.resume() });
  }
}

