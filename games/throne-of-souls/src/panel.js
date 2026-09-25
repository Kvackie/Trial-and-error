// The panel under the battlefield: six tabs (Battle, Lord, Monsters, Spells, Runes, Build)
// and the details of whatever was tapped on the field. It is HTML laid over the canvas, so
// text stays sharp; sizes follow the canvas scale. Every view is laid out to fit the
// panel's fixed height without scrolling: grids of tiles, and one action bar for the
// selected tile.
import * as D from './data.js';
import * as S from './sim.js';
import { RARITY_COLORS, iconUrl } from './art.js';
import { fmt, tr } from './strings.js';
import { playSound } from '../../../shared/sound.js';
import { showToast } from '../../../shared/toast.js';

const TABS = [
  ['battle', 'x72:weapon_knight_sword'],
  ['lord', 'x72:big_demon_idle_anim_f0'],
  ['monsters', 'x72:orc_warrior_idle_anim_f0'],
  ['spells', 'x72:flask_big_red'],
  ['runes', 'rune-fury'],
  ['build', 'x72:crate'],
];
const SPELL_ICONS = { hellfire: 'x72:flask_big_red', bonewall: 'x72:skull', souldrain: 'x72:flask_big_blue' };
const monsterIcon = (type) => {
  const sprite = D.MONSTERS[type].sprite;
  return `x72:${sprite === 'necromancer' ? 'necromancer_anim' : `${sprite}_idle_anim`}_f0`;
};

const STYLE = `
.tos { position: fixed; display: flex; flex-direction: column; font-family: sans-serif; color: #f0e6ff;
  font-size: calc(var(--u) * 21); -webkit-user-select: none; user-select: none; }
.tos * { box-sizing: border-box; }
.tos img { image-rendering: pixelated; }
.tos-body { flex: 1; overflow: hidden; background: #1f1128; border: calc(var(--u) * 3) solid #4a2a5a; display: flex; flex-direction: column;
  gap: calc(var(--u) * 10); border-radius: calc(var(--u) * 18); padding: calc(var(--u) * 12); margin: 0 calc(var(--u) * 14); }
.tos-tabs { display: flex; flex: none; margin: calc(var(--u) * 8) calc(var(--u) * 14) 0; height: calc(var(--u) * 100);
  background: #1f1128; border: calc(var(--u) * 3) solid #4a2a5a; border-radius: calc(var(--u) * 18); padding: calc(var(--u) * 5); }
.tos-tabs button { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: calc(var(--u) * 4);
  background: none; border: calc(var(--u) * 3) solid transparent; border-radius: calc(var(--u) * 14); color: #d9c6ea;
  font-size: calc(var(--u) * 17); font-weight: 700; padding: calc(var(--u) * 4) 0 calc(var(--u) * 5); cursor: pointer; min-width: 0; }
.tos-tabs button[aria-selected="true"] { background: #3a1f4a; border-color: #ffd166; color: #ffd166; }
.tos-tabs img { height: calc(var(--u) * 46); max-width: 90%; object-fit: contain; }
.tos .head { display: flex; align-items: center; gap: calc(var(--u) * 10); min-height: calc(var(--u) * 44); flex: none; }
.tos .head b { flex: 1; color: #ffd166; font-size: calc(var(--u) * 25); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tos .dim { color: #b8a6c8; font-size: calc(var(--u) * 18); }
.tos .line { display: flex; align-items: center; gap: calc(var(--u) * 10); flex: none; }
.tos .line .grow { flex: 1; min-width: 0; }
.tos .grid { display: grid; gap: calc(var(--u) * 8); flex: none; }
.tos .tile { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(var(--u) * 3);
  background: #2c1a3c; border: calc(var(--u) * 3) solid #4a3060; border-radius: calc(var(--u) * 12); padding: calc(var(--u) * 5) calc(var(--u) * 4);
  font-size: calc(var(--u) * 16); font-weight: 700; text-align: center; line-height: 1.15; cursor: pointer; color: #f0e6ff; min-width: 0; }
.tos .tile.sel { border-color: #ffd166; background: #3a1f4a; }
.tos .tile.off { opacity: 0.45; }
.tos .tile.empty { cursor: default; background: #1a0f22; border-style: dashed; }
.tos .tile img { height: calc(var(--u) * 40); max-width: 80%; object-fit: contain; }
.tos .tile .n { position: absolute; top: calc(var(--u) * 3); right: calc(var(--u) * 6); color: #ffd166; font-size: calc(var(--u) * 16); }
.tos .tile .sub { color: #b8a6c8; font-size: calc(var(--u) * 14); font-weight: 600; }
.tos .tile span { overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.tos .actbar { display: flex; align-items: center; gap: calc(var(--u) * 10); background: #2c1a3c; border: calc(var(--u) * 3) solid #4a3060;
  border-radius: calc(var(--u) * 14); padding: calc(var(--u) * 8) calc(var(--u) * 10); flex: none; min-height: calc(var(--u) * 84); }
.tos .actbar .grow { flex: 1; min-width: 0; font-size: calc(var(--u) * 18); line-height: 1.25; }
.tos .actbar .grow b { font-size: calc(var(--u) * 20); }
.tos .pic { width: calc(var(--u) * 60); height: calc(var(--u) * 60); flex: none; display: flex; align-items: center; justify-content: center;
  background: #1a0f22; border-radius: 50%; }
.tos .pic img { width: 72%; height: 80%; object-fit: contain; }
.tos button.act { min-width: calc(var(--u) * 132); min-height: calc(var(--u) * 60); padding: calc(var(--u) * 4) calc(var(--u) * 10);
  border-radius: calc(var(--u) * 12); border: calc(var(--u) * 3) solid #ffd166; background: #5a2a8a; color: #fff; flex: none;
  font-size: calc(var(--u) * 18); font-weight: 700; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.15; }
.tos button.act.alt { background: #2a1f36; border-color: #8a6aa8; }
.tos button.act:disabled { background: #2a1f36; border-color: #4a3a5a; color: #8a7a9a; cursor: default; }
.tos button.act.wide { flex: 1; }
.tos button.act.small { min-width: calc(var(--u) * 100); min-height: calc(var(--u) * 52); }
.tos .cost { font-size: calc(var(--u) * 16); white-space: nowrap; }
.tos .cost img { height: calc(var(--u) * 18); vertical-align: -10%; }
.tos .bar { height: calc(var(--u) * 12); background: #000; border-radius: calc(var(--u) * 6); overflow: hidden; margin: calc(var(--u) * 4) 0; }
.tos .bar i { display: block; height: 100%; }
.tos .slot { width: calc(var(--u) * 64); height: calc(var(--u) * 64); border-radius: calc(var(--u) * 12); border: calc(var(--u) * 3) dashed #6d4a86;
  background: #1a0f22; display: flex; align-items: center; justify-content: center; color: #8a7a9a; font-size: calc(var(--u) * 13); cursor: pointer;
  text-align: center; flex: none; line-height: 1.1; }
.tos .slot.full { border-style: solid; }
.tos .slot.locked { cursor: default; opacity: 0.6; }
.tos .slot img { width: 60%; }
.tos .chip { display: flex; align-items: center; gap: calc(var(--u) * 8); background: #2c1a3c; border: calc(var(--u) * 3) solid #4a3060;
  border-radius: calc(var(--u) * 12); padding: calc(var(--u) * 4) calc(var(--u) * 4) calc(var(--u) * 4) calc(var(--u) * 10); flex: 1; min-width: 0;
  font-size: calc(var(--u) * 17); font-weight: 700; }
.tos .chip span { flex: 1; white-space: nowrap; }
.tos .chip button.act { min-width: calc(var(--u) * 92); min-height: calc(var(--u) * 50); font-size: calc(var(--u) * 15); }
.tos button.toggle { min-width: calc(var(--u) * 150); min-height: calc(var(--u) * 48); border-radius: calc(var(--u) * 12);
  border: calc(var(--u) * 3) solid #62d64a; background: #2c4a2a; color: #dff5d8; font-weight: 700; font-size: calc(var(--u) * 17); cursor: pointer; }
.tos button.toggle[aria-pressed="false"] { border-color: #6d4a86; background: #2a1f36; color: #b8a6c8; }
.tos .focus { outline: calc(var(--u) * 5) solid #ffd166; outline-offset: calc(var(--u) * 2); }
.tos .close { width: calc(var(--u) * 50); height: calc(var(--u) * 50); border-radius: 50%; border: calc(var(--u) * 3) solid #b56cff;
  background: #2a1438; color: #fff; font-size: calc(var(--u) * 22); cursor: pointer; flex: none; }
.tos .hint { background: #3a1f4a; border: calc(var(--u) * 3) solid #b56cff; border-radius: calc(var(--u) * 14); padding: calc(var(--u) * 12);
  display: flex; align-items: center; gap: calc(var(--u) * 12); }
.tos .hint span { flex: 1; }
.tos .stat { flex: 1; min-width: 0; }
.tos .stat .dim { white-space: nowrap; }
`;

function injectStyle() {
  if (document.getElementById('tos-style')) return;
  const style = document.createElement('style');
  style.id = 'tos-style';
  style.textContent = STYLE;
  document.head.append(style);
}

export class Panel {
  constructor(scene) {
    this.scene = scene;
    this.tab = 'battle';
    this.sel = null; // what the detail view shows
    this.pick = { monsters: 'orc', build: 'wall', runes: null, lord: null }; // selected tile per tab
    this.focusIndex = -1;
    this.lastHtml = '';
    this.lastTick = 0;
    this.pressing = false;
    injectStyle();
    this.root = document.createElement('div');
    this.root.className = 'tos';
    this.root.innerHTML = '<div class="tos-body"></div><nav class="tos-tabs"></nav>';
    document.body.append(this.root);
    this.body = this.root.querySelector('.tos-body');
    this.tabs = this.root.querySelector('.tos-tabs');
    this.root.addEventListener('pointerdown', () => (this.pressing = true));
    const release = () => setTimeout(() => (this.pressing = false), 60);
    this.root.addEventListener('pointerup', release);
    this.root.addEventListener('pointercancel', release);
    this.root.addEventListener('click', (event) => this.onClick(event));
    this.place = () => this.position();
    window.addEventListener('resize', this.place);
    scene.scale.on('resize', this.place);
    scene.events.once('shutdown', () => {
      window.removeEventListener('resize', this.place);
      this.root.remove();
    });
    this.position();
    this.render(true);
  }

  // Keep the panel over its part of the canvas.
  position() {
    const rect = this.scene.game.canvas.getBoundingClientRect();
    const u = rect.width / 720;
    this.root.style.setProperty('--u', `${u}px`);
    this.root.style.left = `${rect.left}px`;
    this.root.style.width = `${rect.width}px`;
    this.root.style.top = `${rect.top + this.scene.panelTop * u}px`;
    this.root.style.height = `${(this.scene.scale.height - this.scene.panelTop - 8) * u}px`;
  }

  get state() {
    return this.scene.state;
  }

  // --- Selection -------------------------------------------------------------------------------
  select(sel) {
    if (sel?.kind === 'lord') {
      this.sel = null;
      this.tab = 'lord';
    } else this.sel = sel;
    this.focusIndex = -1;
    this.render(true);
  }

  selectedItem() {
    const sel = this.sel;
    if (!sel) return null;
    if (sel.kind === 'monster') return this.state.monsters.find((m) => m.id === sel.id);
    if (sel.kind === 'structure') return this.state.structures.find((s) => s.id === sel.id);
    return null;
  }

  // Slots for monsters are bought in the Monsters tab, the rest in Build.
  flash(problem, kind) {
    const tab = tr(kind === 'melee' || kind === 'ranged' ? 'tab.monsters' : 'tab.build');
    showToast(this.scene, tr(`problem.${problem}`, { tab }), { y: this.scene.fieldTop + 220, color: '#ffb0b0', fontSize: 26 });
  }

  // --- Rendering -------------------------------------------------------------------------------
  tick() {
    const now = performance.now();
    if (now - this.lastTick < 300) return;
    this.lastTick = now;
    const rect = this.scene.game.canvas.getBoundingClientRect();
    if (rect.width !== this.lastWidth || rect.top !== this.lastTop) {
      this.lastWidth = rect.width;
      this.lastTop = rect.top;
      this.position();
    }
    this.render();
  }

  render(force = false) {
    if (this.pressing && !force) return;
    const tabs = TABS.map(
      ([id, icon]) => `<button data-tab="${id}" aria-selected="${!this.sel && this.tab === id}"><img src="${iconUrl(this.scene, icon)}" alt="">${tr(`tab.${id}`)}</button>`,
    ).join('');
    if (tabs !== this.lastTabs) {
      this.tabs.innerHTML = tabs;
      this.lastTabs = tabs;
    }
    const html = this.view();
    if (html === this.lastHtml) return;
    this.body.innerHTML = html;
    this.lastHtml = html;
    this.showFocus();
  }

  view() {
    const mode = this.scene.mode;
    if (mode?.type === 'place') {
      const name = this.itemName(mode.item);
      return `<div class="hint"><span>${tr('placeHint', { name })}</span><button class="act alt" data-act="cancelMode">${tr('cancel')}</button></div>`;
    }
    if (mode?.type === 'aim') return `<div class="hint"><span>${tr('aimHint')}</span><button class="act alt" data-act="cancelMode">${tr('cancel')}</button></div>`;
    if (this.sel) {
      const v = this.detail();
      if (v) return v;
      this.sel = null;
    }
    return this[`tab_${this.tab}`]();
  }

  // --- Pieces ------------------------------------------------------------------------------------
  cost(n) {
    return `<span class="cost"><img src="${iconUrl(this.scene, 'px-soul')}" alt=""> ${fmt(n)}</span>`;
  }

  button(act, arg, label, { cost, alt, disabled, wide, small } = {}) {
    const off = disabled || (cost != null && this.state.souls < cost);
    const cls = `act${alt ? ' alt' : ''}${wide ? ' wide' : ''}${small ? ' small' : ''}`;
    return `<button class="${cls}" data-act="${act}" data-arg="${arg ?? ''}" ${off ? 'disabled' : ''}>${label}${cost != null ? this.cost(cost) : ''}</button>`;
  }

  pic(kind) {
    return `<div class="pic"><img src="${iconUrl(this.scene, kind)}" alt=""></div>`;
  }

  bar(share, color) {
    return `<div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, share)) * 100)}%;background:${color}"></i></div>`;
  }

  head(text, extra = '', close = false) {
    return `<div class="head"><b>${text}</b>${extra}${close ? `<button class="close" data-act="close" aria-label="${tr('close')}">✕</button>` : ''}</div>`;
  }

  grid(cols, tiles) {
    return `<div class="grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${tiles.join('')}</div>`;
  }

  // A tile: picture, a label and an optional count in the corner.
  tile({ act, arg, icon, label, sub, n, sel, off, border, empty, h = 96 }) {
    const cls = `tile${sel ? ' sel' : ''}${off ? ' off' : ''}${empty ? ' empty' : ''}`;
    const style = `min-height:calc(var(--u)*${h});${border ? `border-color:${border};` : ''}`;
    const data = act ? `data-act="${act}" data-arg="${arg ?? ''}"` : '';
    return `<div class="${cls}" style="${style}" ${data}>${n != null ? `<span class="n">${n}</span>` : ''}${icon ? `<img src="${iconUrl(this.scene, icon)}" alt="">` : ''}${label ? `<span>${label}</span>` : ''}${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;
  }

  actbar(icon, text, buttons) {
    return `<div class="actbar">${icon ? this.pic(icon) : ''}<div class="grow">${text}</div>${buttons}</div>`;
  }

  itemName(item) {
    return D.MONSTERS[item.type] ? tr(`m.${item.type}`) : tr(`s.${item.type}`);
  }

  kindIcon(item) {
    return D.MONSTERS[item.type] ? monsterIcon(item.type) : item.type;
  }

  structAbout(type, level = 0) {
    const t = D.STRUCTURES[type];
    const n = {
      drum: Math.round((t.bonus + (t.stepBonus ?? 0) * level) * 100),
      well: Math.round((t.bonus + (t.stepBonus ?? 0) * level) * 100),
      tar: Math.round(Math.min(t.maxSlow ?? 1, (t.slow ?? 0) + (t.stepSlow ?? 0) * level) * 100),
      bones: Math.min(t.maxStun ?? 0, (t.stun ?? 0) + (t.stepStun ?? 0) * level).toFixed(1),
    }[type];
    return tr(`sd.${type}`, { n });
  }

  runeName(rune) {
    return tr('runeName', { type: tr(`r.${rune.type}`), rarity: tr(`rarity.${rune.rarity}`) });
  }

  runeAbout(rune) {
    return tr(`rd.${rune.type}`, { n: Math.round(D.RARITY_BONUS[rune.rarity] * 100) });
  }

  runeSlots(holder, level) {
    return D.RUNE_SLOT_LEVELS.map((need, i) => {
      if (level < need) return `<div class="slot locked">${tr('runeSlotLocked', { level: need })}</div>`;
      const rune = holder.runes[i] != null && S.runeById(this.state, holder.runes[i]);
      const who = holder === this.state.lord ? 'lord' : holder.id;
      if (!rune) return `<div class="slot" data-act="pickRune" data-arg="${who}:${i}">${tr('emptySlot')}</div>`;
      return `<div class="slot full" style="border-color:${RARITY_COLORS[rune.rarity]}" data-act="pickRune" data-arg="${who}:${i}"><img src="${iconUrl(this.scene, `rune-${rune.type}`)}" alt="${this.runeName(rune)}"></div>`;
    }).join('');
  }

  slotChip(kind) {
    const s = this.state;
    const used = S.placedCount(s, kind);
    const max = s.slots[kind];
    const buy = max < D.SLOT_MAX ? this.button('slot', kind, tr('buySlot'), { cost: S.slotPrice(s, kind), alt: true }) : '';
    return `<div class="chip"><span>${tr('slotsOf', { kind: tr(`kind.${kind}`), used, max })}</span>${buy}</div>`;
  }

  holderName(holder) {
    return holder === this.state.lord ? tr('lord') : tr(`m.${holder.type}`);
  }

  // --- Tabs -----------------------------------------------------------------------------------------
  tab_battle() {
    const s = this.state;
    const b = s.battle;
    const left = b.queue.length + b.heroes.filter((h) => h.hp > 0).length;
    const lord = S.lordStats(s);
    const nextBoss = Math.ceil(s.wave / D.BOSS_EVERY) * D.BOSS_EVERY;
    const wall = !s.wall.built
      ? tr('noWallYet')
      : S.wallStanding(s)
        ? `${fmt(s.wall.hp)} / ${fmt(S.wallMax(s))}`
        : tr('rebuilding', { seconds: Math.ceil(s.wall.rebuild) });
    const rate = s.rate && s.rate.wave === s.wave ? tr('perHour', { souls: fmt((s.rate.souls / s.rate.secs) * 3600) }) : tr('nextHint');
    return `${this.head(`${tr('wave', { wave: s.wave })} · ${tr(`depth.${S.depthOf(s.wave).id}`)}`)}
      <div class="line"><span class="grow">${tr('heroesLeft', { n: left })} · ${S.isBossWave(s.wave) ? tr('boss') : tr('bossAt', { wave: nextBoss })}</span><span class="dim">${tr('bestWave', { wave: s.bestWave })}</span></div>
      <div class="line">${this.button('next', '', tr('next'), { disabled: !S.canAdvance(s), wide: true })}</div>
      <div class="actbar"><div class="stat">${tr('lord')} · ${tr('lordLevel', { level: s.lord.level })}${this.bar(s.lord.hp / lord.hp, '#b23cff')}<div class="dim">${fmt(s.lord.hp)} / ${fmt(lord.hp)}</div></div>
        <div class="stat">${tr('wall')}${this.bar(s.wall.built && S.wallStanding(s) ? s.wall.hp / S.wallMax(s) : 0, '#c9a0ff')}<div class="dim">${wall}</div></div></div>
      <div class="dim">${rate}</div>`;
  }

  tab_lord() {
    const s = this.state;
    const lord = S.lordStats(s);
    const need = D.lordXpToLevel(s.lord.level);
    const picked = this.pick.lord;
    const tiles = [];
    // Four columns, one per branch; each column's talents go down.
    for (let row = 0; row < 4; row++) {
      for (const branch of D.TALENT_BRANCHES) {
        const t = D.TALENTS[branch][row];
        const have = S.talent(s, t.id);
        tiles.push(this.tile({ act: 'pickTalent', arg: t.id, label: tr(`ts.${t.id}`), sub: `${have}/${t.max}`, sel: picked === t.id, h: 54 }));
      }
    }
    const branchOf = (id) => D.TALENT_BRANCHES.find((br) => D.TALENTS[br].some((t) => t.id === id));
    const info = picked
      ? this.actbar('', `<span class="dim">${tr(`b.${branchOf(picked)}`)}</span> · <b>${tr(`ts.${picked}`)}</b><br>${tr(`t.${picked}`)}`, this.button('talent', picked, tr('learn'), { disabled: S.talentPoints(s) < 1 || S.talent(s, picked) >= Object.values(D.TALENTS).flat().find((t) => t.id === picked).max }))
      : this.actbar('', `<b>${tr('talents')}</b> · ${D.TALENT_BRANCHES.map((br) => tr(`b.${br}`)).join(', ')}<br><span class="dim">${tr('tapTalent')}</span>`, '');
    return `<div class="line"><div class="stat"><div class="line"><b class="grow" style="color:#ffd166">${tr('lordLevel', { level: s.lord.level })}</b><span class="dim">${tr('points', { n: S.talentPoints(s) })}</span></div>
        ${this.bar(s.lord.xp / need, '#ffd166')}<div class="dim">${tr('xp')} ${fmt(s.lord.xp)} / ${fmt(need)} · ${tr('hp')} ${fmt(lord.hp)} · ${tr('dmg')} ${fmt(lord.dmg)}</div></div>${this.runeSlots(s.lord, s.lord.level)}</div>
      ${info}
      ${this.grid(4, tiles)}`;
  }

  tab_monsters() {
    const s = this.state;
    const type = this.pick.monsters;
    const tiles = D.MONSTER_ORDER.map((t) => {
      const m = D.MONSTERS[t];
      const owned = s.monsters.filter((x) => x.type === t).length;
      const locked = !S.lordUnlocked(s, m.unlock);
      return this.tile({
        act: 'pickType',
        arg: t,
        icon: monsterIcon(t),
        label: tr(`m.${t}`),
        sub: locked ? tr('locked', { level: m.unlock }) : `+${s.upgrades[t]}`,
        n: owned ? `×${owned}` : null,
        sel: t === type,
        off: locked,
        h: 96,
      });
    });
    const m = D.MONSTERS[type];
    const unlocked = S.lordUnlocked(s, m.unlock);
    const stats = S.monsterStats(s, { type, level: 1, runes: [] });
    const text = `<b>${tr(`m.${type}`)}</b><br><span class="dim">${tr(`md.${type}`)} ${tr('hp')} ${fmt(stats.hp)} · ${tr('dmg')} ${fmt(stats.dmg)}</span>`;
    const buttons = unlocked
      ? `${this.button('recruit', type, tr('recruit'), { cost: S.recruitCost(s, type) })}${this.button('upgradeType', type, tr('upgrade'), { cost: S.typeUpgradeCost(s, type), alt: true })}`
      : `<span class="dim">${tr('locked', { level: m.unlock })}</span>`;
    // Monsters waiting in the inventory, one tile per type.
    const stored = D.MONSTER_ORDER.filter((t) => s.monsters.some((x) => x.type === t && !x.cell));
    const inventory = stored.length
      ? `<div class="line"><span class="dim">${tr('inventory')}</span>${stored
          .map((t) => {
            const first = s.monsters.find((x) => x.type === t && !x.cell);
            const n = s.monsters.filter((x) => x.type === t && !x.cell).length;
            return `<div class="slot full" data-act="placeItem" data-arg="m${first.id}" style="position:relative"><img src="${iconUrl(this.scene, monsterIcon(t))}" alt="${tr(`m.${t}`)}">${n > 1 ? `<span class="tile-n" style="position:absolute;right:4%;top:0;color:#ffd166;font-weight:700">${n}</span>` : ''}</div>`;
          })
          .join('')}</div>`
      : '';
    return `<div class="line">${this.slotChip('melee')}${this.slotChip('ranged')}</div>
      ${this.grid(3, tiles)}
      ${this.actbar(monsterIcon(type), text, buttons)}
      ${inventory}`;
  }

  tab_spells() {
    const s = this.state;
    const cards = D.SPELL_ORDER.map((id) => {
      const spell = D.SPELLS[id];
      const unlocked = S.lordUnlocked(s, spell.unlock);
      const ready = S.spellReady(s, id);
      const label = !unlocked ? tr('locked', { level: spell.unlock }) : ready ? tr('cast') : `${Math.ceil(s.cooldowns[id])} s`;
      return this.actbar(SPELL_ICONS[id], `<b>${tr(`sp.${id}`)}</b><br><span class="dim">${tr(`spd.${id}`)}</span>`, this.button('cast', id, label, { disabled: !ready || s.battle.phase !== 'fight' }));
    });
    return `${this.head(tr('tab.spells'), `<button class="toggle" data-act="auto" aria-pressed="${s.auto}">${tr('autoCast')}: ${tr(s.auto ? 'on' : 'off')}</button>`)}
      ${cards.join('')}`;
  }

  // Runes as a table: one column per type, one row per rarity, the count in each cell.
  tab_runes() {
    const s = this.state;
    if (!s.runes.length) return `${this.head(tr('tab.runes'))}<div class="dim">${tr('noRunes')}</div>`;
    let pick = this.pick.runes;
    if (!pick || !s.runes.some((r) => `${r.type}:${r.rarity}` === pick)) {
      const r = [...s.runes].sort((a, b) => b.rarity - a.rarity)[0];
      pick = this.pick.runes = `${r.type}:${r.rarity}`;
    }
    const heads = D.RUNES.map((type) => `<div style="text-align:center"><img src="${iconUrl(this.scene, `rune-${type}`)}" alt="${tr(`r.${type}`)}" style="height:calc(var(--u)*30)"></div>`);
    const cells = [];
    for (let rarity = D.RARITY_BONUS.length - 1; rarity >= 0; rarity--) {
      for (const type of D.RUNES) {
        const n = s.runes.filter((r) => r.type === type && r.rarity === rarity).length;
        const key = `${type}:${rarity}`;
        cells.push(n ? this.tile({ act: 'pickRuneGroup', arg: key, label: `×${n}`, border: RARITY_COLORS[rarity], sel: key === pick, h: 46 }) : this.tile({ empty: true, h: 46 }));
      }
    }
    const [type, rarityText] = pick.split(':');
    const rarity = Number(rarityText);
    const loose = S.looseRunes(s, type, rarity);
    const on = s.runes.filter((r) => r.type === type && r.rarity === rarity && S.runeHolder(s, r.id)).map((r) => this.holderName(S.runeHolder(s, r.id)));
    const text = `<b style="color:${RARITY_COLORS[rarity]}">${this.runeName({ type, rarity })}</b><br><span class="dim">${this.runeAbout({ type, rarity })}${on.length ? ` · ${tr('equippedOn', { who: on.join(', ') })}` : ''}</span>`;
    const buttons = `${rarity < D.RARITY_BONUS.length - 1 ? this.button('merge', pick, tr('merge'), { disabled: loose.length < 3, small: true }) : ''}${this.button('break', pick, tr('breakDown', { souls: fmt(D.RARITY_SOULS[rarity]) }), { alt: true, disabled: !loose.length, small: true })}`;
    return `${this.grid(6, heads)}${this.grid(6, cells)}${this.actbar(`rune-${type}`, text, buttons)}`;
  }

  tab_build() {
    const s = this.state;
    const pick = this.pick.build;
    const wallTile = this.tile({ act: 'pickBuild', arg: 'wall', icon: 'x72:wall_mid', label: tr('wall'), sub: s.wall.built ? tr('lordLevel', { level: s.wall.level + 1 }) : this.cost(D.WALL.cost), sel: pick === 'wall', h: 92 });
    const tiles = [wallTile, ...D.STRUCTURE_ORDER.map((type) => {
      const owned = s.structures.filter((x) => x.type === type).length;
      const noWall = D.STRUCTURES[type].place === 'wall' && !s.wall.built;
      return this.tile({ act: 'pickBuild', arg: type, icon: type, label: tr(`s.${type}`), sub: this.cost(S.structureCost(s, type)), n: owned ? `×${owned}` : null, sel: pick === type, off: noWall, h: 92 });
    })];
    let bar;
    if (pick === 'wall') {
      const text = `<b>${tr('wall')}</b>${s.wall.built ? ` · ${tr('hp')} ${fmt(S.wallMax(s))}` : ''}<br><span class="dim">${tr('wallAbout', { n: Math.round(D.WALL.rebuild * (1 - S.talent(s, 'rebuild') * 0.1)) })}</span>`;
      bar = this.actbar('', text, s.wall.built ? this.button('upgradeWall', '', tr('upgrade'), { cost: S.wallUpgrade(s) }) : this.button('buildWall', '', tr('build'), { cost: D.WALL.cost }));
    } else {
      const t = D.STRUCTURES[pick];
      const text = `<b>${tr(`s.${pick}`)}</b> · <span class="dim">${tr(`kind.${t.place}`)}</span><br><span class="dim">${this.structAbout(pick)}</span>`;
      bar = this.actbar('', text, this.button('buyStructure', pick, tr('build'), { cost: S.structureCost(s, pick), disabled: t.place === 'wall' && !s.wall.built }));
    }
    const kind = pick === 'wall' ? 'wall' : D.STRUCTURES[pick].place;
    return `${this.grid(5, tiles)}${bar}<div class="line">${this.slotChip(kind)}</div>`;
  }

  // --- Details ---------------------------------------------------------------------------------------
  detail() {
    const s = this.state;
    const sel = this.sel;
    if (sel.kind === 'monster') {
      const m = s.monsters.find((x) => x.id === sel.id);
      if (!m) return null;
      const stats = S.monsterStats(s, m);
      const need = D.monsterXpToLevel(m.level);
      const status = m.dead ? tr('dead') : m.cell ? tr('deployed') : tr('stored');
      const acts = m.cell
        ? `${this.button('placeItem', `m${m.id}`, tr('move'), { alt: true })}${this.button('store', `m${m.id}`, tr('store'), { alt: true })}`
        : this.button('placeItem', `m${m.id}`, tr('place'));
      return `${this.head(`${tr(`m.${m.type}`)} · ${tr('lordLevel', { level: m.level })}`, '', true)}
        ${this.actbar(this.kindIcon(m), `<span class="dim">${tr(`md.${m.type}`)}</span><br>${tr('hp')} ${fmt(m.dead ? 0 : m.hp)} / ${fmt(stats.hp)} · ${tr('dmg')} ${fmt(stats.dmg)}
          ${this.bar(m.xp / need, '#ffd166')}<span class="dim">${tr('xp')} ${fmt(m.xp)} / ${fmt(need)} · ${status}</span>`, '')}
        <div class="line"><span class="dim grow">${tr('runeSlots')}</span>${this.runeSlots(m, m.level)}</div>
        <div class="line">${acts.replace(/class="act/g, 'class="act wide')}</div>`;
    }
    if (sel.kind === 'structure') {
      const st = s.structures.find((x) => x.id === sel.id);
      if (!st) return null;
      const acts = st.cell
        ? `${this.button('placeItem', `s${st.id}`, tr('move'), { alt: true, wide: true })}${this.button('store', `s${st.id}`, tr('store'), { alt: true, wide: true })}`
        : this.button('placeItem', `s${st.id}`, tr('place'), { wide: true });
      return `${this.head(`${tr(`s.${st.type}`)} · ${tr('lordLevel', { level: st.level + 1 })}`, '', true)}
        ${this.actbar(st.type, `<span class="dim">${tr(`kind.${D.STRUCTURES[st.type].place}`)}</span><br>${this.structAbout(st.type, st.level)}`, '')}
        <div class="line">${this.button('upgradeStructure', st.id, tr('upgradeTo', { level: st.level + 2 }), { cost: S.structureUpgrade(s, st), wide: true })}</div>
        <div class="line">${acts}</div>`;
    }
    if (sel.kind === 'cell') return this.cellView(sel);
    if (sel.kind === 'rune') return this.runePicker(sel);
    return null;
  }

  cellKind(col) {
    return { melee: 'melee', w0: 'wall', w1: 'wall', support: 'support', trap: 'trap' }[col];
  }

  // An empty cell: what's in the inventory that fits, and what can be bought for it.
  cellView({ col, row }) {
    const s = this.state;
    const kind = this.cellKind(col);
    const fits = (item) => S.columnsFor(item).includes(col);
    const tiles = [];
    for (const type of [...D.MONSTER_ORDER, ...D.STRUCTURE_ORDER]) {
      if (!fits({ type })) continue;
      const isMonster = Boolean(D.MONSTERS[type]);
      const icon = isMonster ? monsterIcon(type) : type;
      const name = isMonster ? tr(`m.${type}`) : tr(`s.${type}`);
      const stored = [...s.monsters, ...s.structures].filter((x) => x.type === type && !x.cell);
      if (stored.length) {
        tiles.push(this.tile({ act: 'putHere', arg: `${isMonster ? 'm' : 's'}${stored[0].id}`, icon, label: name, sub: tr('fits'), n: `×${stored.length}`, h: 100 }));
        continue;
      }
      const locked = isMonster && !S.lordUnlocked(s, D.MONSTERS[type].unlock);
      const noWall = !isMonster && D.STRUCTURES[type].place === 'wall' && !s.wall.built;
      const cost = isMonster ? S.recruitCost(s, type) : S.structureCost(s, type);
      tiles.push(this.tile({
        act: locked || noWall ? null : 'buyHere',
        arg: `${isMonster ? 'm' : 's'}:${type}`,
        icon,
        label: name,
        sub: locked ? tr('locked', { level: D.MONSTERS[type].unlock }) : this.cost(cost),
        off: locked || noWall || s.souls < cost,
        h: 100,
      }));
    }
    const slotKinds = col === 'w0' || col === 'w1' ? ['ranged', 'wall'] : [kind];
    const full = slotKinds.filter((k) => S.placedCount(s, k) >= s.slots[k]);
    const wall = kind === 'wall' && !s.wall.built ? `<div class="line"><span class="dim grow">${tr('problem.noWall')}</span>${this.button('buildWall', '', tr('buildWall'), { cost: D.WALL.cost })}</div>` : '';
    return `${this.head(tr('cell', { row: row + 1, kind: tr(`kind.${kind}`) }), '', true)}
      ${full.length ? `<div class="line">${full.map((k) => this.slotChip(k)).join('')}</div>` : ''}${wall}
      ${this.grid(4, tiles)}`;
  }

  // Choosing a rune for a slot: loose runes grouped by type and rarity.
  runePicker({ holder, slot }) {
    const s = this.state;
    const who = holder === 'lord' ? s.lord : s.monsters.find((m) => m.id === holder);
    if (!who) return null;
    const current = who.runes[slot] != null && S.runeById(s, who.runes[slot]);
    const groups = new Map();
    for (const r of s.runes) {
      if (S.runeHolder(s, r.id)) continue;
      const key = `${r.type}:${r.rarity}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const tiles = [...groups.values()]
      .sort((a, b) => b[0].rarity - a[0].rarity || a[0].type.localeCompare(b[0].type))
      .map((list) => this.tile({ act: 'equip', arg: list[0].id, icon: `rune-${list[0].type}`, label: this.runeAbout(list[0]), n: list.length > 1 ? `×${list.length}` : null, border: RARITY_COLORS[list[0].rarity], h: 86 }));
    const top = current
      ? this.actbar(`rune-${current.type}`, `<b style="color:${RARITY_COLORS[current.rarity]}">${this.runeName(current)}</b><br><span class="dim">${this.runeAbout(current)}</span>`, this.button('unequip', current.id, tr('unequip'), { alt: true }))
      : '';
    return `${this.head(`${tr('chooseRune')} · ${this.holderName(who)}`, '', true)}${top}
      ${tiles.length ? this.grid(5, tiles.slice(0, 15)) : `<div class="dim">${tr('noRunes')}</div>`}`;
  }

  // --- Actions ---------------------------------------------------------------------------------------
  itemFromArg(arg) {
    const id = Number(arg.slice(1));
    return arg[0] === 'm' ? this.state.monsters.find((m) => m.id === id) : this.state.structures.find((x) => x.id === id);
  }

  onClick(event) {
    const tab = event.target.closest('[data-tab]');
    if (tab) {
      playSound('click');
      this.scene.setMode(null);
      this.sel = null;
      this.tab = tab.dataset.tab;
      this.focusIndex = -1;
      return this.render(true);
    }
    const el = event.target.closest('[data-act]');
    if (!el || el.disabled) return;
    event.stopPropagation();
    this.act(el.dataset.act, el.dataset.arg ?? '');
  }

  act(act, arg) {
    const s = this.state;
    const scene = this.scene;
    let ok = true;
    let sound = 'select';
    switch (act) {
      case 'close':
        this.sel = null;
        sound = 'click';
        break;
      case 'cancelMode':
        scene.setMode(null);
        sound = 'click';
        break;
      case 'next':
        scene.advance();
        return this.render(true);
      case 'pickTalent':
        this.pick.lord = arg;
        sound = 'click';
        break;
      case 'pickType':
        this.pick.monsters = arg;
        sound = 'click';
        break;
      case 'pickBuild':
        this.pick.build = arg;
        sound = 'click';
        break;
      case 'pickRuneGroup':
        this.pick.runes = arg;
        sound = 'click';
        break;
      case 'talent':
        ok = S.learnTalent(s, arg);
        sound = 'correct';
        break;
      case 'slot':
        ok = S.buySlot(s, arg);
        sound = 'coin';
        break;
      case 'recruit': {
        const m = S.recruit(s, arg);
        ok = Boolean(m);
        sound = 'coin';
        // Straight to placing it, if there's a free slot.
        if (m && S.placedCount(s, D.MONSTERS[arg].kind) < s.slots[D.MONSTERS[arg].kind]) scene.setMode({ type: 'place', item: m });
        break;
      }
      case 'upgradeType':
        ok = S.upgradeType(s, arg);
        sound = 'hammer';
        break;
      case 'placeItem': {
        const item = this.itemFromArg(arg);
        const kind = S.slotKind(item);
        if (!item.cell && S.placedCount(s, kind) >= s.slots[kind]) {
          this.flash('slots', kind);
          ok = false;
          break;
        }
        this.sel = null;
        scene.setMode({ type: 'place', item });
        sound = 'click';
        break;
      }
      case 'store':
        ok = S.unplace(s, this.itemFromArg(arg));
        sound = 'click';
        break;
      case 'cast':
        if (arg === 'hellfire') {
          scene.setMode({ type: 'aim' });
          sound = 'click';
        } else ok = S.castSpell(s, arg);
        break;
      case 'auto':
        s.auto = !s.auto;
        sound = 'click';
        break;
      case 'merge': {
        const [type, rarity] = arg.split(':');
        const rune = S.mergeRunes(s, type, Number(rarity));
        ok = Boolean(rune);
        if (rune) this.pick.runes = `${rune.type}:${rune.rarity}`;
        sound = 'special';
        break;
      }
      case 'break': {
        const [type, rarity] = arg.split(':');
        const rune = S.looseRunes(s, type, Number(rarity))[0];
        ok = Boolean(rune) && S.breakRune(s, rune.id);
        sound = 'coin';
        break;
      }
      case 'pickRune': {
        const [holder, slot] = arg.split(':');
        this.sel = { kind: 'rune', holder: holder === 'lord' ? 'lord' : Number(holder), slot: Number(slot), back: this.sel };
        sound = 'click';
        break;
      }
      case 'equip': {
        const { holder, slot, back } = this.sel;
        const who = holder === 'lord' ? s.lord : s.monsters.find((m) => m.id === holder);
        ok = S.equipRune(s, Number(arg), who, slot);
        this.sel = back;
        sound = 'chest';
        break;
      }
      case 'unequip':
        ok = S.unequipRune(s, Number(arg));
        this.sel = this.sel.back;
        sound = 'click';
        break;
      case 'buildWall':
        ok = S.buildWall(s);
        sound = 'hammer';
        if (ok) scene.buildWallArt?.();
        break;
      case 'upgradeWall':
        ok = S.upgradeWall(s);
        sound = 'hammer';
        break;
      case 'buyStructure': {
        const st = S.buyStructure(s, arg);
        ok = Boolean(st);
        sound = 'hammer';
        if (st && S.placedCount(s, S.slotKind(st)) < s.slots[S.slotKind(st)]) scene.setMode({ type: 'place', item: st });
        break;
      }
      case 'upgradeStructure':
        ok = S.upgradeStructure(s, Number(arg));
        sound = 'hammer';
        break;
      case 'putHere': {
        const { col, row } = this.sel;
        const item = this.itemFromArg(arg);
        const problem = S.placeProblem(s, item, col, row);
        if (problem) {
          this.flash(problem, S.slotKind(item));
          ok = false;
        } else {
          S.place(s, item, col, row);
          this.sel = null;
          sound = 'hammer';
        }
        break;
      }
      case 'buyHere': {
        const { col, row } = this.sel;
        const [what, type] = arg.split(':');
        const probe = { type, cell: null };
        const problem = S.placeProblem(s, probe, col, row);
        if (problem) {
          this.flash(problem, S.slotKind(probe));
          ok = false;
          break;
        }
        const item = what === 'm' ? S.recruit(s, type) : S.buyStructure(s, type);
        ok = Boolean(item) && S.place(s, item, col, row);
        if (ok) this.sel = null;
        sound = 'hammer';
        break;
      }
      default:
        ok = false;
    }
    playSound(ok ? sound : 'invalid');
    scene.refreshText();
    this.render(true);
  }

  // --- Keyboard ----------------------------------------------------------------------------------------
  focusables() {
    return [...this.body.querySelectorAll('button:not(:disabled), [data-act]:not(button)')];
  }

  showFocus() {
    this.body.querySelectorAll('.focus').forEach((el) => el.classList.remove('focus'));
    const list = this.focusables();
    if (this.focusIndex < 0 || !list.length) return;
    this.focusIndex = Math.min(this.focusIndex, list.length - 1);
    list[this.focusIndex].classList.add('focus');
  }

  key(dir) {
    if (dir === 'left' || dir === 'right') {
      const i = TABS.findIndex(([id]) => id === this.tab);
      const next = TABS[(i + (dir === 'left' ? TABS.length - 1 : 1)) % TABS.length][0];
      this.sel = null;
      this.tab = next;
      this.focusIndex = -1;
      playSound('move');
      return this.render(true);
    }
    const list = this.focusables();
    if (!list.length) return;
    if (dir === 'down') this.focusIndex = Math.min(list.length - 1, this.focusIndex + 1);
    if (dir === 'up') this.focusIndex = Math.max(0, this.focusIndex - 1);
    if (dir === 'action') {
      const el = list[Math.max(0, this.focusIndex)];
      if (el) this.act(el.dataset.act, el.dataset.arg ?? '');
      return;
    }
    playSound('move');
    this.showFocus();
  }
}
