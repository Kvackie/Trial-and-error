import Phaser from 'phaser';
import * as D from '../data.js';
import * as S from '../sim.js';
import { createArt, look, preloadArt } from '../art.js';
import { THEME, openHelp } from '../help.js';
import { Panel } from '../panel.js';
import { loadGame, saveGame } from '../save.js';
import { fmt, tr } from '../strings.js';
import { addHomeButton } from '../../../../shared/home-button.js';
import { addSettingsButton } from '../../../../shared/settings.js';
import { showPanel } from '../../../../shared/help-dialog.js';
import { bindKeys } from '../../../../shared/keyboard.js';
import { onSceneLangChange } from '../../../../shared/i18n.js';
import { playSound } from '../../../../shared/sound.js';
import { showToast } from '../../../../shared/toast.js';

const W = 720;
const HEADER = 104;
// The panel under the field (tab content and tab bar) has a fixed height, sized so every
// tab fits without scrolling; the field takes the rest of the screen.
const PANEL = 560;
const STATUS = 50;
const COL = 48;
const LEFT = (W - D.COLS * COL) / 2;
const TOP_EDGE = 20; // the strip of back wall at the top of the field

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  preload() {
    preloadArt(this);
  }

  create() {
    createArt(this);
    this.state = loadGame();
    this.away = S.applyOffline(this.state);
    this.layout();
    this.drawFloor();
    this.wallLayer = this.add.graphics().setDepth(2);
    this.wallBricks = this.add.container(0, 0).setDepth(2);
    this.cellLayer = this.add.graphics().setDepth(3);
    this.bars = this.add.graphics().setDepth(40);
    this.fx = this.add.graphics().setDepth(45);
    this.cursor = this.add.graphics().setDepth(46);
    this.sprites = new Map();
    this.lastSound = {};
    this.mode = null; // { type: 'place', item } or { type: 'aim' }
    this.cursorCell = { x: 7, row: 4 };
    this.burnMarks = [];

    this.makeLord();
    this.makeHeader();
    this.makeStatus();
    this.panel = new Panel(this);
    this.buildWallArt();

    this.input.on('pointerdown', (p) => this.onFieldTap(p.x, p.y));
    bindKeys(
      this,
      {
        up: () => this.key('up'),
        down: () => this.key('down'),
        left: () => this.key('left'),
        right: () => this.key('right'),
        action: () => this.key('action'),
      },
      () => this.scene.isPaused(),
    );
    onSceneLangChange(this, () => this.refreshText());

    // Save now and then, and when the page is hidden; on return, time away counts.
    this.time.addEvent({ delay: 5000, loop: true, callback: () => saveGame(this.state) });
    this.onHide = () => {
      if (document.hidden) {
        saveGame(this.state);
      } else {
        const summary = S.applyOffline(this.state);
        if (summary) this.showAway(summary);
      }
    };
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('pagehide', () => saveGame(this.state));
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', this.onHide));
    this.refreshText();
    if (this.away) this.showAway(this.away);
  }

  // --- Layout ---------------------------------------------------------------------------------
  layout() {
    const H = this.scale.height;
    this.rowH = Phaser.Math.Clamp(Math.floor((H - HEADER - STATUS - PANEL - TOP_EDGE) / D.ROWS), 40, 96);
    this.fieldTop = HEADER;
    this.fieldBottom = HEADER + TOP_EDGE + this.rowH * D.ROWS;
    this.statusY = this.fieldBottom + STATUS / 2;
    this.panelTop = this.fieldBottom + STATUS;
    this.spriteScale = Math.min(3, this.rowH / 30);
  }

  px(x) {
    return LEFT + x * COL;
  }

  // The bottom of a row, where feet stand.
  rowY(row) {
    return this.fieldTop + TOP_EDGE + row * this.rowH + this.rowH * 0.82;
  }

  rowCentre(row) {
    return this.fieldTop + TOP_EDGE + (row + 0.5) * this.rowH;
  }

  drawFloor() {
    const w = D.COLS * COL;
    const h = this.fieldBottom - this.fieldTop;
    // The floor is drawn once into a canvas, tile by tile, from the 0x72 sheet.
    const canvas = document.createElement('canvas');
    canvas.width = w / 3;
    canvas.height = Math.ceil(h / 3);
    const ctx = canvas.getContext('2d');
    const sheet = this.textures.get('x72');
    const put = (name, x, y) => {
      const f = sheet.get(name);
      ctx.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, x, y, f.cutWidth, f.cutHeight);
    };
    let n = 0;
    for (let y = 0; y < canvas.height; y += 16) {
      for (let x = 0; x < canvas.width; x += 16) {
        const hash = (x * 31 + y * 17 + n++ * 7) % 23;
        put(`floor_${hash < 16 ? 1 : 2 + (hash % 7)}`, x, y);
      }
    }
    // The back wall along the top edge.
    for (let x = 0; x < canvas.width; x += 16) put('wall_mid', x, TOP_EDGE / 3 - 16);
    // Shade: a purple glow at the throne, darker towards the heroes' side.
    const shade = ctx.createLinearGradient(0, 0, canvas.width, 0);
    shade.addColorStop(0, 'rgba(60,10,70,0.35)');
    shade.addColorStop(0.55, 'rgba(8,4,14,0.05)');
    shade.addColorStop(1, 'rgba(8,4,14,0.5)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (this.textures.exists('floor')) this.textures.remove('floor');
    this.textures.addCanvas('floor', canvas);
    this.add.image(LEFT, this.fieldTop, 'floor').setOrigin(0).setScale(3).setDepth(0);
    const g = this.add.graphics().setDepth(1);
    // Faint row lines, and shade towards the heroes' side.
    g.lineStyle(2, 0xffffff, 0.05);
    for (let r = 1; r < D.ROWS; r++) g.lineBetween(LEFT, this.rowCentre(r) - this.rowH / 2, LEFT + w, this.rowCentre(r) - this.rowH / 2);
    g.lineStyle(4, 0x4a2a5a).strokeRect(LEFT - 2, this.fieldTop - 2, w + 4, h + 4);
    // Columns flanking the throne.
    for (const row of [1.2, 7.4]) this.add.image(this.px(D.X.lord), this.rowY(row), 'x72', 'column').setOrigin(0.5, 1).setScale(this.spriteScale).setDepth(this.depthFor(row));
  }

  depthFor(y) {
    return 10 + y;
  }

  // --- The wall ------------------------------------------------------------------------------
  // Brick faces with light edges, battlements facing the heroes and a walkway on top.
  buildWallArt() {
    this.wallBricks.removeAll(true);
    const x0 = this.px(3);
    const x1 = this.px(5);
    const top = this.fieldTop;
    const bottom = this.fieldBottom;
    for (let y = top; y < bottom; y += 48) {
      for (const [x, frame] of [[x0, 'wall_mid'], [x0 + 48, 'wall_mid']]) {
        const img = this.add.image(x, y, 'x72', frame).setOrigin(0).setScale(3);
        if (y + 48 > bottom) img.setCrop(0, 0, 16, (bottom - y) / 3);
        this.wallBricks.add(img);
      }
      const l = this.add.image(x0, y, 'x72', 'wall_edge_mid_left').setOrigin(0).setScale(3);
      const r = this.add.image(x0 + 48, y, 'x72', 'wall_edge_mid_right').setOrigin(0).setScale(3);
      if (y + 48 > bottom) {
        l.setCrop(0, 0, 16, (bottom - y) / 3);
        r.setCrop(0, 0, 16, (bottom - y) / 3);
      }
      this.wallBricks.add([l, r]);
    }
    const g = this.add.graphics();
    g.fillStyle(0x281820, 0.45).fillRect(x0 + 10, top, x1 - x0 - 34, bottom - top);
    for (let y = top + 8; y < bottom - 8; y += 40) {
      g.fillStyle(0x7a5c4c).fillRect(x1 - 14, y, 20, 24);
      g.fillStyle(0xc7a98e).fillRect(x1 - 14, y, 20, 6);
      g.fillStyle(0x3a2830).fillRect(x1 + 6, y + 4, 4, 20);
    }
    g.fillStyle(0x000000, 0.3).fillRect(x1 + 10, top, 14, bottom - top);
    this.wallBricks.add(g);
  }

  drawWall() {
    const { wall } = this.state;
    const standing = S.wallStanding(this.state);
    this.wallBricks.setVisible(wall.built).setAlpha(standing ? 1 : 0.28);
    const g = this.wallLayer.clear();
    const x0 = this.px(3);
    const x1 = this.px(5);
    if (!wall.built) {
      g.lineStyle(3, 0xb56cff, 0.35);
      for (let y = this.fieldTop; y < this.fieldBottom; y += 24) g.lineBetween(x1, y, x1, y + 12);
      return;
    }
    // Health along the wall's back, or rebuild progress.
    const len = this.fieldBottom - this.fieldTop - 40;
    const share = standing ? wall.hp / Math.max(1, S.wallMax(this.state)) : 1 - wall.rebuild / (D.WALL.rebuild * (1 - S.talent(this.state, 'rebuild') * 0.1));
    g.fillStyle(0x000000, 0.7).fillRoundedRect(x0 - 12, this.fieldTop + 20, 10, len, 5);
    g.fillStyle(standing ? 0xc9a0ff : 0x777777).fillRoundedRect(x0 - 10, this.fieldTop + 22 + (len - 4) * (1 - share), 6, (len - 4) * share, 3);
    if (this.state.battle.shield) {
      g.lineStyle(4, 0xe8e0c8, 0.7).strokeRect(x0 - 4, this.fieldTop + 2, x1 - x0 + 8 + COL * 2, this.fieldBottom - this.fieldTop - 4);
    }
  }

  // --- Header and status line ------------------------------------------------------------------
  makeHeader() {
    const y = 52;
    const pause = () => this.scene.pause();
    const resume = () => this.scene.resume();
    addHomeButton(this, 56, y, { fill: 0x2a1438, stroke: 0xb56cff, onBeforeLeave: () => saveGame(this.state) });
    addSettingsButton(this, W - 136, y, { fill: 0x2a1438, stroke: 0xb56cff, theme: THEME, onOpen: pause, onClose: resume });
    const help = this.add.circle(W - 56, y, 32, 0x2a1438).setStrokeStyle(3, 0xb56cff).setInteractive({ useHandCursor: true });
    this.add.text(help.x, y, '?', { fontFamily: 'sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    help.on('pointerup', () => {
      playSound('click');
      pause();
      openHelp(resume);
    });
    this.add.image(122, y + 2, 'px-soul').setScale(4);
    const style = { fontFamily: 'sans-serif', fontStyle: 'bold' };
    this.soulsText = this.add.text(146, y, '', { ...style, fontSize: '36px', color: '#bff0ff' }).setOrigin(0, 0.5);
    this.waveText = this.add.text(452, y - 14, '', { ...style, fontSize: '30px', color: '#ffd166' }).setOrigin(0.5);
    this.depthText = this.add.text(452, y + 20, '', { ...style, fontSize: '20px', color: '#d9c6ea' }).setOrigin(0.5);
  }

  makeStatus() {
    const y = this.statusY;
    const style = { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: '22px', color: '#f3dcff' };
    this.lordText = this.add.text(LEFT + 4, y, '', style).setOrigin(0, 0.5);
    this.statusBars = this.add.graphics();
    this.nextButton = this.add.container(W - LEFT - 100, y);
    const bg = this.add.rectangle(0, 0, 200, 42, 0x5a2a8a).setStrokeStyle(3, 0xffd166).setInteractive({ useHandCursor: true });
    this.nextLabel = this.add.text(0, 0, '', { ...style, fontSize: '21px', color: '#ffffff' }).setOrigin(0.5);
    this.nextButton.add([bg, this.nextLabel]);
    bg.on('pointerup', () => this.advance());
    this.nextBg = bg;
  }

  advance() {
    if (!S.nextWave(this.state)) return playSound('invalid');
    playSound('select');
    this.clearHeroes();
  }

  refreshText() {
    const s = this.state;
    this.soulsText.setText(fmt(s.souls));
    this.waveText.setText(tr('wave', { wave: s.wave }));
    this.depthText.setText(tr(`depth.${S.depthOf(s.wave).id}`));
    this.lordText.setText(`${tr('lord')} · ${tr('lordLevel', { level: s.lord.level })}`);
    this.nextLabel.setText(tr('next'));
    const can = S.canAdvance(s);
    this.nextBg.setFillStyle(can ? 0x5a2a8a : 0x2a1f36).setStrokeStyle(3, can ? 0xffd166 : 0x4a3a5a);
    this.nextLabel.setColor(can ? '#ffffff' : '#8a7a9a');
  }

  // --- Sprites ---------------------------------------------------------------------------------
  makeLord() {
    const x = this.px(D.X.lord);
    const y = this.rowY(4.3);
    this.aura = this.add.circle(x, y - 50, 62, 0xb428ff, 0.18).setDepth(5);
    this.tweens.add({ targets: this.aura, alpha: 0.35, scale: 1.1, yoyo: true, repeat: -1, duration: 1400 });
    this.lord = this.add.sprite(x, y, 'x72').setOrigin(0.5, 1).setScale(this.spriteScale).setDepth(this.depthFor(4.3));
    this.lord.play('big_demon_idle_anim');
  }

  spriteFor(key, kind, flip) {
    let entry = this.sprites.get(key);
    if (entry) return entry;
    const l = look(kind);
    const scale = this.spriteScale * (l.dawn ? 1.6 : 1);
    const sprite = this.add.sprite(0, 0, l.texture ?? 'x72', l.frame).setOrigin(0.5, l.floor ? 0.5 : 1).setScale(scale);
    if (l.anim) sprite.play({ key: l.anim, startFrame: Math.floor(Math.random() * this.anims.get(l.anim).frames.length) });
    sprite.setFlipX(Boolean(flip));
    entry = { sprite, look: l, seen: true, running: false };
    this.sprites.set(key, entry);
    return entry;
  }

  kindOf(item) {
    if (D.MONSTERS[item.type]) return D.MONSTERS[item.type].sprite;
    return item.type;
  }

  syncSprites() {
    const s = this.state;
    for (const e of this.sprites.values()) e.seen = false;
    const bars = this.bars.clear();
    const selected = this.panel.selectedItem();
    for (const item of [...s.monsters, ...s.structures]) {
      if (!item.cell) continue;
      const e = this.spriteFor(`i${item.id}`, this.kindOf(item));
      e.seen = true;
      const x = this.px(S.itemX(s, item));
      const trap = item.cell.col === 'trap';
      const y = trap ? this.rowCentre(item.cell.row) + this.rowH * 0.1 : this.rowY(item.cell.row);
      e.sprite.setPosition(x, y).setDepth(trap ? 4 : this.depthFor(item.cell.row));
      const down = item.dead || (D.STRUCTURES[item.type] && item.hp <= 0);
      e.sprite.setAlpha(down ? 0.25 : 1);
      if (item === selected) {
        bars.lineStyle(3, 0xffd166).strokeRect(x - COL / 2, this.rowCentre(item.cell.row) - this.rowH / 2 + 2, COL, this.rowH - 4);
      }
      if (D.MONSTERS[item.type] && !item.dead) {
        const max = S.monsterStats(s, item).hp;
        if (item.hp < max) this.bar(x, y - e.sprite.displayHeight - 8, 40, item.hp / max, 0x62d64a);
      }
    }
    for (const h of s.battle.heroes) {
      if (h.hp <= 0) continue;
      const e = this.spriteFor(`h${h.id}`, D.HEROES[h.type].sprite, true);
      e.seen = true;
      const flying = D.HEROES[h.type].flies;
      const x = this.px(h.x);
      const y = this.rowY(h.y) - (flying ? this.rowH * 0.25 : 0);
      e.sprite.setPosition(x, y).setDepth(this.depthFor(h.y + 0.1));
      if (h.boss && !e.big) {
        e.big = true;
        e.sprite.setScale(e.sprite.scale * 1.5).setTint(0xffe0a0);
      }
      const run = !h.fighting && h.stun <= 0 && e.look.run;
      if (run !== e.running && e.look.run) {
        e.running = run;
        e.sprite.play(run ? e.look.run : e.look.anim, true);
      }
      e.sprite.setTint(h.slowT > 0 ? 0x9fd0ff : h.boss ? 0xffe0a0 : 0xffffff);
      this.bar(x, y - e.sprite.displayHeight - 8, h.boss ? 70 : 40, h.hp / h.max, h.boss ? 0xffb02e : 0xe04848);
    }
    for (const [key, e] of this.sprites) {
      if (!e.seen) {
        e.sprite.destroy();
        this.sprites.delete(key);
      }
    }
    // The lord's health above him.
    const max = S.lordStats(s).hp;
    if (s.lord.hp < max) this.bar(this.lord.x, this.lord.y - this.lord.displayHeight - 10, 70, s.lord.hp / max, 0xb23cff);
  }

  bar(x, y, w, share, color) {
    const g = this.bars;
    g.fillStyle(0x000000, 0.75).fillRect(x - w / 2 - 2, y - 2, w + 4, 10);
    g.fillStyle(color).fillRect(x - w / 2, y, w * Phaser.Math.Clamp(share, 0, 1), 6);
  }

  clearHeroes() {
    for (const [key, e] of this.sprites) {
      if (key.startsWith('h')) {
        e.sprite.destroy();
        this.sprites.delete(key);
      }
    }
  }

  // --- Effects and sounds -----------------------------------------------------------------------
  sfx(name, gap = 0.12) {
    const now = this.time.now / 1000;
    if (now - (this.lastSound[name] ?? 0) < gap) return;
    this.lastSound[name] = now;
    playSound(name);
  }

  shot(e) {
    const colors = { fire: 0xff5a3c, skeleton: 0xfff0c8, shaman: 0x78ffa0, necro: 0xc070ff, bolt: 0xe8e8ff, soul: 0x4ad0ff, melee: 0xffffff };
    const x1 = this.px(e.x);
    const y1 = e.from === 'lord' ? this.lord.y - this.lord.displayHeight * 0.6 : this.rowY(e.y) - this.rowH * 0.45;
    const x2 = this.px(e.tx);
    const y2 = this.rowY(e.ty) - this.rowH * 0.4;
    if (e.kind === 'melee') {
      const slash = this.add.graphics({ x: x2 - 10, y: y2 }).setDepth(44);
      slash.lineStyle(4, 0xffffff, 0.9).beginPath().arc(0, 0, 16, -1.2, 0.6).strokePath();
      this.tweens.add({ targets: slash, alpha: 0, duration: 160, onComplete: () => slash.destroy() });
      this.sfx('clash', 0.2);
      return;
    }
    const dot = this.add.circle(x1, y1, e.kind === 'fire' ? 9 : 6, colors[e.kind] ?? 0xffffff).setDepth(44);
    this.tweens.add({ targets: dot, x: x2, y: y2, duration: 140 + Math.abs(x2 - x1) * 0.3, onComplete: () => dot.destroy() });
    this.sfx(e.kind === 'fire' ? 'spell' : 'twang', 0.18);
  }

  float(x, y, text, color) {
    const label = this.add
      .text(x, y, text, { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: '22px', color, stroke: '#000000', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({ targets: label, y: y - 50, alpha: 0, duration: 900, onComplete: () => label.destroy() });
  }

  handleEvents() {
    const b = this.state.battle;
    const toast = (text, color) => showToast(this, text, { y: this.fieldTop + 160, color, fontSize: 30 });
    for (const e of b.events) {
      switch (e.type) {
        case 'shot':
          this.shot(e);
          break;
        case 'heroAttack':
          if (e.ranged) this.shot({ x: e.tx + 0.01, y: e.ty, tx: e.tx, ty: e.ty, kind: 'melee' });
          else this.sfx('clash', 0.25);
          break;
        case 'kill':
          this.float(this.px(e.x), this.rowY(e.y) - this.rowH, `+${fmt(e.souls)}`, '#9fe8ff');
          this.sfx('coin', 0.15);
          break;
        case 'rune': {
          const rune = S.runeById(this.state, e.id);
          if (rune) toast(tr('runeFound', { rune: tr('runeName', { type: tr(`r.${rune.type}`), rarity: tr(`rarity.${rune.rarity}`) }) }), '#ffd166');
          this.sfx('chest', 0.3);
          break;
        }
        case 'waveStart':
          this.sfx(e.boss ? 'alarm' : 'horn', 0.5);
          if (e.boss) toast(tr('boss'), '#ffb02e');
          break;
        case 'wallBroken':
          toast(tr('wallBroken'), '#ff8a8a');
          this.sfx('crumble');
          this.cameras.main.shake(250, 0.006);
          break;
        case 'wallRebuilt':
          toast(tr('wallRebuilt'), '#c9a0ff');
          this.sfx('hammer');
          break;
        case 'fall':
          toast(tr('fell', { wave: e.wave }), '#ff8a8a');
          this.sfx('wrong');
          this.clearHeroes();
          break;
        case 'lordLevel':
          toast(tr('levelUp', { level: e.level }), '#e8b8ff');
          this.sfx('checkpoint', 0.5);
          break;
        case 'spell':
          this.spellEffect(e);
          break;
        case 'burn': {
          const x = this.px(e.x);
          const y = this.rowY(e.y) - this.rowH * 0.3;
          const c = this.add.circle(x, y, e.radius * COL, 0xff7a2a, 0.35).setDepth(43);
          this.tweens.add({ targets: c, alpha: 0, duration: 500, onComplete: () => c.destroy() });
          break;
        }
        case 'bossMove':
          this.sfx('horn', 0.5);
          break;
        case 'trap':
          this.sfx('bump', 0.2);
          break;
        default:
      }
    }
    b.events.length = 0;
  }

  spellEffect(e) {
    if (e.spell === 'hellfire') {
      const x = this.px(e.x);
      const y = this.rowY(e.y) - this.rowH * 0.3;
      const r = D.SPELLS.hellfire.radius * COL;
      const c = this.add.circle(x, y, r, 0xff4a1a, 0.6).setDepth(43);
      this.tweens.add({ targets: c, scale: 1.3, alpha: 0, duration: 600, onComplete: () => c.destroy() });
      this.cameras.main.shake(200, 0.004);
      playSound('blast');
    } else {
      playSound('spell');
    }
  }

  // --- Input on the field --------------------------------------------------------------------------
  cellAt(x, y) {
    if (y < this.fieldTop + TOP_EDGE || y > this.fieldBottom || x < LEFT || x > LEFT + D.COLS * COL) return null;
    const row = Math.min(D.ROWS - 1, Math.floor((y - this.fieldTop - TOP_EDGE) / this.rowH));
    const cx = (x - LEFT) / COL;
    return { x: cx, row, col: this.colNameAt(cx) };
  }

  colNameAt(cx) {
    if (cx >= 2 && cx < 3) return 'support';
    if (cx >= 3 && cx < 4) return 'w0';
    if (cx >= 4 && cx < 5) return 'w1';
    if (cx >= 6 && cx < 7) return 'melee';
    if (cx >= 7 && cx < 8) return 'trap';
    if (cx < 2) return 'lord';
    return null;
  }

  onFieldTap(x, y) {
    if (this.scene.isPaused()) return;
    const cell = this.cellAt(x, y);
    if (!cell) return;
    this.useCell(cell);
  }

  useCell(cell) {
    const s = this.state;
    if (this.mode?.type === 'aim') {
      if (S.castSpell(s, 'hellfire', { x: cell.x, y: cell.row })) this.panel.render(true);
      this.setMode(null);
      return;
    }
    if (this.mode?.type === 'place') {
      const item = this.mode.item;
      if (!cell.col || cell.col === 'lord') return this.setMode(null);
      const problem = S.placeProblem(s, item, cell.col, cell.row);
      if (problem) {
        playSound('invalid');
        if (problem !== 'cell') this.panel.flash(problem);
        return;
      }
      S.place(s, item, cell.col, cell.row);
      playSound('hammer');
      this.setMode(null);
      this.panel.render(true);
      return;
    }
    if (cell.col === 'lord') return this.panel.select({ kind: 'lord' });
    if (!cell.col) return;
    const item = S.occupant(s, cell.col, cell.row);
    playSound('click');
    if (item) this.panel.select({ kind: D.MONSTERS[item.type] ? 'monster' : 'structure', id: item.id });
    else this.panel.select({ kind: 'cell', col: cell.col, row: cell.row });
  }

  setMode(mode) {
    this.mode = mode;
    if (mode) {
      // Start the keyboard cursor on a sensible cell.
      const cols = mode.type === 'place' ? S.columnsFor(mode.item) : ['trap'];
      this.cursorCell = { col: cols.at(-1), x: mode.type === 'aim' ? 10 : S.CELL_X[cols.at(-1)], row: this.cursorCell.row ?? 4 };
    }
    this.panel.render(true);
  }

  drawCells() {
    const g = this.cellLayer.clear();
    const cur = this.cursor.clear();
    if (!this.mode) return;
    if (this.mode.type === 'place') {
      const item = this.mode.item;
      for (const col of S.columnsFor(item)) {
        for (let row = 0; row < D.ROWS; row++) {
          const ok = !S.placeProblem(this.state, item, col, row);
          const x = this.px(S.CELL_X[col]) - COL / 2;
          const y = this.rowCentre(row) - this.rowH / 2;
          g.fillStyle(ok ? 0x62d64a : 0xff4a4a, ok ? 0.28 + 0.1 * Math.sin(this.time.now / 200) : 0.1).fillRect(x + 3, y + 3, COL - 6, this.rowH - 6);
        }
      }
    }
    if (this.keyCursor) {
      const x = this.mode.type === 'aim' ? this.px(this.cursorCell.x) : this.px(S.CELL_X[this.cursorCell.col]);
      const y = this.rowCentre(this.cursorCell.row);
      if (this.mode.type === 'aim') cur.lineStyle(4, 0xff7a2a).strokeCircle(x, y, D.SPELLS.hellfire.radius * COL);
      else cur.lineStyle(5, 0xffd166).strokeRect(x - COL / 2, y - this.rowH / 2, COL, this.rowH);
    }
  }

  key(dir) {
    if (!this.mode) return this.panel.key(dir);
    this.keyCursor = true;
    const c = this.cursorCell;
    if (dir === 'up') c.row = Math.max(0, c.row - 1);
    if (dir === 'down') c.row = Math.min(D.ROWS - 1, c.row + 1);
    if (this.mode.type === 'aim') {
      if (dir === 'left') c.x = Math.max(3, c.x - 1);
      if (dir === 'right') c.x = Math.min(D.COLS - 0.5, c.x + 1);
    } else {
      const cols = S.columnsFor(this.mode.item);
      const i = cols.indexOf(c.col);
      if (dir === 'left') c.col = cols[Math.max(0, i - 1)];
      if (dir === 'right') c.col = cols[Math.min(cols.length - 1, i + 1)];
    }
    if (dir === 'action') {
      const x = this.mode.type === 'aim' ? c.x : S.CELL_X[c.col];
      this.useCell({ x, row: c.row, col: this.mode.type === 'aim' ? null : c.col });
    } else playSound('move');
  }

  // --- Time away ----------------------------------------------------------------------------------
  showAway(summary) {
    const mins = Math.round(summary.seconds / 60);
    const time = mins >= 60 ? tr('hours', { h: Math.floor(mins / 60), m: mins % 60 }) : tr('minutes', { m: mins });
    const lines = [
      `<p>${tr('awayText', { wave: this.state.wave, time })}</p>`,
      `<p><b>${tr('awaySouls', { n: fmt(summary.souls) })}</b> · ${tr('awayXp', { n: fmt(summary.xp) })}${summary.runes ? ` · ${tr('awayRunes', { n: summary.runes })}` : ''}</p>`,
      summary.levels ? `<p>${tr('awayLevels', { n: summary.levels })}</p>` : '',
    ];
    this.scene.pause();
    showPanel({ ...THEME, title: tr('away'), html: lines.join(''), onClose: () => this.scene.resume() });
    playSound('coin');
  }

  // --- Every frame ---------------------------------------------------------------------------------
  update(_, delta) {
    const dt = Math.min(delta / 1000, 0.1);
    const s = this.state;
    const before = { souls: Math.floor(s.souls), wave: s.wave, level: s.lord.level, can: S.canAdvance(s) };
    S.step(s, dt);
    this.handleEvents();
    this.syncSprites();
    this.drawWall();
    this.drawCells();
    if (before.souls !== Math.floor(s.souls) || before.wave !== s.wave || before.level !== s.lord.level || before.can !== S.canAdvance(s)) this.refreshText();
    this.drawStatus();
    this.panel.tick();
  }

  drawStatus() {
    const s = this.state;
    const g = this.statusBars.clear();
    const x = this.lordText.x + this.lordText.width + 16;
    const w = Math.max(60, W - LEFT - 220 - x);
    const hp = s.lord.hp / S.lordStats(s).hp;
    const xp = s.lord.xp / D.lordXpToLevel(s.lord.level);
    g.fillStyle(0x000000, 0.7).fillRoundedRect(x, this.statusY - 12, w, 24, 6);
    g.fillStyle(0xb23cff).fillRoundedRect(x + 2, this.statusY - 10, (w - 4) * Phaser.Math.Clamp(hp, 0, 1), 12, 4);
    g.fillStyle(0xffd166).fillRect(x + 2, this.statusY + 5, (w - 4) * Phaser.Math.Clamp(xp, 0, 1), 5);
  }
}
