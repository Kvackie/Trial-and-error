// The panel under the battlefield: six tabs (Battle, Lord, Monsters, Spells, Runes, Build)
// and the details of whatever was tapped on the field. It is HTML laid over the canvas,
// so lists scroll natively and text stays sharp; sizes follow the canvas scale.
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

const STYLE = `
.tos { position: fixed; display: flex; flex-direction: column; font-family: sans-serif; color: #f0e6ff;
  font-size: calc(var(--u) * 22); -webkit-user-select: none; user-select: none; touch-action: pan-y; }
.tos * { box-sizing: border-box; }
.tos img { image-rendering: pixelated; }
.tos-body { flex: 1; overflow-y: auto; background: #1f1128; border: calc(var(--u) * 3) solid #4a2a5a;
  border-radius: calc(var(--u) * 18); padding: calc(var(--u) * 14) calc(var(--u) * 16); margin: 0 calc(var(--u) * 14); }
.tos-tabs { display: flex; margin: calc(var(--u) * 8) calc(var(--u) * 14) 0; height: calc(var(--u) * 104);
  background: #1f1128; border: calc(var(--u) * 3) solid #4a2a5a; border-radius: calc(var(--u) * 18); padding: calc(var(--u) * 6); }
.tos-tabs button { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: calc(var(--u) * 4);
  background: none; border: calc(var(--u) * 3) solid transparent; border-radius: calc(var(--u) * 14); color: #d9c6ea;
  font-size: calc(var(--u) * 17); font-weight: 700; padding: calc(var(--u) * 4) 0 calc(var(--u) * 6); cursor: pointer; min-width: 0; }
.tos-tabs button[aria-selected="true"] { background: #3a1f4a; border-color: #ffd166; color: #ffd166; }
.tos-tabs img { height: calc(var(--u) * 48); max-width: 90%; object-fit: contain; }
.tos h3 { margin: calc(var(--u) * 4) 0 calc(var(--u) * 10); color: #ffd166; font-size: calc(var(--u) * 26); display: flex; align-items: center; gap: calc(var(--u) * 10); }
.tos h3 .grow { flex: 1; }
.tos h4 { margin: calc(var(--u) * 16) 0 calc(var(--u) * 8); color: #e8b8ff; font-size: calc(var(--u) * 21); }
.tos p { margin: calc(var(--u) * 6) 0; line-height: 1.35; }
.tos .dim { color: #b8a6c8; font-size: calc(var(--u) * 18); }
.tos .card { display: flex; align-items: center; gap: calc(var(--u) * 12); background: #2c1a3c; border: calc(var(--u) * 3) solid #4a3060;
  border-radius: calc(var(--u) * 14); padding: calc(var(--u) * 10) calc(var(--u) * 12); margin: calc(var(--u) * 8) 0; }
.tos .card.sel { border-color: #ffd166; }
.tos .card.tap { cursor: pointer; }
.tos .pic { width: calc(var(--u) * 64); height: calc(var(--u) * 64); flex: none; display: flex; align-items: center; justify-content: center;
  background: #1a0f22; border-radius: 50%; }
.tos .pic img { width: 72%; height: 80%; object-fit: contain; }
.tos .info { flex: 1; min-width: 0; }
.tos .name { font-weight: 700; font-size: calc(var(--u) * 22); }
.tos .acts { display: flex; flex-direction: column; gap: calc(var(--u) * 6); flex: none; }
.tos button.act { min-width: calc(var(--u) * 150); min-height: calc(var(--u) * 56); padding: calc(var(--u) * 6) calc(var(--u) * 12);
  border-radius: calc(var(--u) * 12); border: calc(var(--u) * 3) solid #ffd166; background: #5a2a8a; color: #fff;
  font-size: calc(var(--u) * 19); font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: calc(var(--u) * 6); }
.tos button.act.alt { background: #2a1f36; border-color: #8a6aa8; }
.tos button.act:disabled { background: #2a1f36; border-color: #4a3a5a; color: #8a7a9a; cursor: default; }
.tos button.act.wide { width: 100%; }
.tos .cost img { height: calc(var(--u) * 20); vertical-align: -10%; }
.tos .row { display: flex; gap: calc(var(--u) * 10); align-items: center; flex-wrap: wrap; }
.tos .bar { height: calc(var(--u) * 12); background: #000; border-radius: calc(var(--u) * 6); overflow: hidden; margin: calc(var(--u) * 6) 0; }
.tos .bar i { display: block; height: 100%; }
.tos .slots { display: flex; gap: calc(var(--u) * 10); margin: calc(var(--u) * 8) 0; }
.tos .slot { width: calc(var(--u) * 72); height: calc(var(--u) * 72); border-radius: calc(var(--u) * 12); border: calc(var(--u) * 3) dashed #6d4a86;
  background: #1a0f22; display: flex; align-items: center; justify-content: center; color: #8a7a9a; font-size: calc(var(--u) * 14); cursor: pointer; text-align: center; }
.tos .slot.full { border-style: solid; }
.tos .slot.locked { cursor: default; opacity: 0.6; }
.tos .slot img { width: 60%; }
.tos .talent { display: flex; align-items: center; gap: calc(var(--u) * 10); margin: calc(var(--u) * 6) 0; }
.tos .talent span { flex: 1; }
.tos .talent b { width: calc(var(--u) * 50); text-align: center; color: #ffd166; }
.tos button.plus { width: calc(var(--u) * 56); height: calc(var(--u) * 52); border-radius: calc(var(--u) * 12); border: calc(var(--u) * 3) solid #ffd166;
  background: #5a2a8a; color: #fff; font-size: calc(var(--u) * 28); font-weight: 700; cursor: pointer; }
.tos button.plus:disabled { background: #2a1f36; border-color: #4a3a5a; color: #6a5a7a; }
.tos button.toggle { min-width: calc(var(--u) * 150); min-height: calc(var(--u) * 48); border-radius: calc(var(--u) * 12);
  border: calc(var(--u) * 3) solid #62d64a; background: #2c4a2a; color: #dff5d8; font-weight: 700; font-size: calc(var(--u) * 18); cursor: pointer; }
.tos button.toggle[aria-pressed="false"] { border-color: #6d4a86; background: #2a1f36; color: #b8a6c8; }
.tos .focus { outline: calc(var(--u) * 5) solid #ffd166; outline-offset: calc(var(--u) * 2); }
.tos .close { margin-left: auto; width: calc(var(--u) * 52); height: calc(var(--u) * 52); border-radius: 50%; border: calc(var(--u) * 3) solid #b56cff;
  background: #2a1438; color: #fff; font-size: calc(var(--u) * 22); cursor: pointer; flex: none; }
.tos .hint { background: #3a1f4a; border: calc(var(--u) * 3) solid #b56cff; border-radius: calc(var(--u) * 14); padding: calc(var(--u) * 12);
  display: flex; align-items: center; gap: calc(var(--u) * 12); }
.tos .hint span { flex: 1; }
`;

function injectStyle() {
  if (document.getElementById('tos-style')) return;
  const style = document.createElement('style');
  style.id = 'tos-style';
  style.textContent = STYLE;
  document.head.append(style);
}

const soulImg = (scene) => `<img src="${iconUrl(scene, 'px-soul')}" alt="">`;

export class Panel {
  constructor(scene) {
    this.scene = scene;
    this.tab = 'battle';
    this.sel = null; // what the detail view shows
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
    this.body.scrollTop = 0;
    this.render(true);
  }

  selectedItem() {
    const sel = this.sel;
    if (!sel) return null;
    if (sel.kind === 'monster') return this.state.monsters.find((m) => m.id === sel.id);
    if (sel.kind === 'structure') return this.state.structures.find((s) => s.id === sel.id);
    return null;
  }

  flash(problem) {
    const tab = tr(problem === 'slots' ? 'tab.build' : 'tab.build');
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
    const scroll = this.body.scrollTop;
    this.body.innerHTML = html;
    this.body.scrollTop = scroll;
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
    return `<span class="cost">${soulImg(this.scene)} ${fmt(n)}</span>`;
  }

  button(act, arg, label, { cost, alt, disabled, wide } = {}) {
    const off = disabled || (cost != null && this.state.souls < cost);
    return `<button class="act${alt ? ' alt' : ''}${wide ? ' wide' : ''}" data-act="${act}" data-arg="${arg ?? ''}" ${off ? 'disabled' : ''}>${label}${cost != null ? ` ${this.cost(cost)}` : ''}</button>`;
  }

  pic(kind) {
    return `<div class="pic"><img src="${iconUrl(this.scene, kind)}" alt=""></div>`;
  }

  bar(share, color) {
    return `<div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, share)) * 100)}%;background:${color}"></i></div>`;
  }

  heading(text, close) {
    return `<h3><span class="grow">${text}</span>${close ? `<button class="close" data-act="close" aria-label="${tr('close')}">✕</button>` : ''}</h3>`;
  }

  itemName(item) {
    return D.MONSTERS[item.type] ? tr(`m.${item.type}`) : tr(`s.${item.type}`);
  }

  kindIcon(item) {
    return D.MONSTERS[item.type] ? `x72:${D.MONSTERS[item.type].sprite}_idle_anim_f0`.replace('necromancer_idle_anim', 'necromancer_anim') : item.type;
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

  runeSlots(holder, level) {
    const slots = D.RUNE_SLOT_LEVELS.map((need, i) => {
      if (level < need) return `<div class="slot locked">${tr('runeSlotLocked', { level: need })}</div>`;
      const rune = holder.runes[i] != null && S.runeById(this.state, holder.runes[i]);
      const who = holder === this.state.lord ? 'lord' : holder.id;
      if (!rune) return `<div class="slot" data-act="pickRune" data-arg="${who}:${i}">${tr('emptySlot')}</div>`;
      return `<div class="slot full" style="border-color:${RARITY_COLORS[rune.rarity]}" data-act="pickRune" data-arg="${who}:${i}"><img src="${iconUrl(this.scene, `rune-${rune.type}`)}" alt="${this.runeName(rune)}"></div>`;
    });
    return `<h4>${tr('runeSlots')}</h4><div class="slots">${slots.join('')}</div>`;
  }

  // --- Tabs -----------------------------------------------------------------------------------------
  tab_battle() {
    const s = this.state;
    const b = s.battle;
    const depth = tr(`depth.${S.depthOf(s.wave).id}`);
    const left = b.queue.length + b.heroes.filter((h) => h.hp > 0).length;
    const lord = S.lordStats(s);
    const nextBoss = Math.ceil(s.wave / D.BOSS_EVERY) * D.BOSS_EVERY;
    const wall = !s.wall.built
      ? tr('noWallYet')
      : S.wallStanding(s)
        ? `${fmt(s.wall.hp)} / ${fmt(S.wallMax(s))}`
        : tr('rebuilding', { seconds: Math.ceil(s.wall.rebuild) });
    const rate = s.rate && s.rate.wave === s.wave ? `<p class="dim">${tr('perHour', { souls: fmt((s.rate.souls / s.rate.secs) * 3600) })}</p>` : '';
    return `${this.heading(`${tr('wave', { wave: s.wave })} · ${depth}`)}
      <p>${tr('heroesLeft', { n: left })} · ${S.isBossWave(s.wave) ? tr('boss') : tr('bossAt', { wave: nextBoss })}</p>
      <p class="dim">${tr('bestWave', { wave: s.bestWave })}</p>
      ${this.button('next', '', tr('next'), { disabled: !S.canAdvance(s), wide: true })}
      <p class="dim">${tr('nextHint')}</p>
      <div class="card">${this.pic('x72:big_demon_idle_anim_f0')}<div class="info"><div class="name">${tr('lord')} · ${tr('lordLevel', { level: s.lord.level })}</div>
        ${this.bar(s.lord.hp / lord.hp, '#b23cff')}<div class="dim">${tr('hp')} ${fmt(s.lord.hp)} / ${fmt(lord.hp)}</div></div></div>
      <div class="card">${this.pic('x72:wall_mid')}<div class="info"><div class="name">${tr('wall')}</div>
        ${s.wall.built ? this.bar(S.wallStanding(s) ? s.wall.hp / S.wallMax(s) : 0, '#c9a0ff') : ''}<div class="dim">${wall}</div></div></div>
      ${rate}`;
  }

  tab_lord() {
    const s = this.state;
    const lord = S.lordStats(s);
    const need = D.lordXpToLevel(s.lord.level);
    const talents = D.TALENT_BRANCHES.map((branch) => {
      const rows = D.TALENTS[branch]
        .map((t) => {
          const have = S.talent(s, t.id);
          const can = have < t.max && S.talentPoints(s) > 0;
          return `<div class="talent"><span>${tr(`t.${t.id}`)}</span><b>${have}/${t.max}</b><button class="plus" data-act="talent" data-arg="${t.id}" ${can ? '' : 'disabled'}>+</button></div>`;
        })
        .join('');
      return `<h4>${tr(`b.${branch}`)}</h4>${rows}`;
    });
    return `${this.heading(`${tr('lord')} · ${tr('lordLevel', { level: s.lord.level })}`)}
      <div class="card">${this.pic('x72:big_demon_idle_anim_f0')}<div class="info">
        <div>${tr('xp')} ${fmt(s.lord.xp)} / ${fmt(need)}</div>${this.bar(s.lord.xp / need, '#ffd166')}
        <div class="dim">${tr('hp')} ${fmt(lord.hp)} · ${tr('dmg')} ${fmt(lord.dmg)}</div></div></div>
      ${this.runeSlots(s.lord, s.lord.level)}
      <h4>${tr('talents')} · ${tr('points', { n: S.talentPoints(s) })}</h4>
      ${talents.join('')}`;
  }

  slotLine(kind) {
    const s = this.state;
    const used = S.placedCount(s, kind);
    const max = s.slots[kind];
    const buy = max < D.SLOT_MAX ? this.button('slot', kind, tr('buySlot'), { cost: S.slotPrice(s, kind), alt: true }) : '';
    return `<div class="card"><div class="info">${tr('slotsOf', { kind: tr(`kind.${kind}`), used, max })}</div>${buy}</div>`;
  }

  tab_monsters() {
    const s = this.state;
    const shop = D.MONSTER_ORDER.map((type) => {
      const m = D.MONSTERS[type];
      const icon = `x72:${m.sprite === 'necromancer' ? 'necromancer_anim' : `${m.sprite}_idle_anim`}_f0`;
      if (!S.lordUnlocked(s, m.unlock)) {
        return `<div class="card">${this.pic(icon)}<div class="info"><div class="name">${tr(`m.${type}`)}</div><div class="dim">${tr('locked', { level: m.unlock })}</div></div></div>`;
      }
      const stats = S.monsterStats(s, { type, level: 1, runes: [] });
      return `<div class="card">${this.pic(icon)}<div class="info"><div class="name">${tr(`m.${type}`)} · +${s.upgrades[type]}</div>
        <div class="dim">${tr(`md.${type}`)}</div><div class="dim">${tr('hp')} ${fmt(stats.hp)} · ${tr('dmg')} ${fmt(stats.dmg)}</div></div>
        <div class="acts">${this.button('recruit', type, tr('recruit'), { cost: S.recruitCost(s, type) })}
        ${this.button('upgradeType', type, tr('upgrade'), { cost: S.typeUpgradeCost(s, type), alt: true })}</div></div>`;
    });
    const army = s.monsters.map((m) => this.monsterCard(m)).join('');
    return `${this.heading(tr('army'))}${this.slotLine('melee')}${this.slotLine('ranged')}${army}
      <h4>${tr('shop')}</h4>${shop.join('')}`;
  }

  monsterCard(m) {
    const status = m.dead ? tr('dead') : m.cell ? tr('deployed') : tr('stored');
    const acts = m.cell
      ? `${this.button('placeItem', `m${m.id}`, tr('move'), { alt: true })}${this.button('store', `m${m.id}`, tr('store'), { alt: true })}`
      : this.button('placeItem', `m${m.id}`, tr('place'));
    return `<div class="card tap" data-act="open" data-arg="m${m.id}">${this.pic(this.kindIcon(m))}<div class="info">
      <div class="name">${tr(`m.${m.type}`)} · ${tr('lordLevel', { level: m.level })}</div><div class="dim">${status}</div></div>
      <div class="acts">${acts}</div></div>`;
  }

  tab_spells() {
    const s = this.state;
    const cards = D.SPELL_ORDER.map((id) => {
      const spell = D.SPELLS[id];
      const unlocked = S.lordUnlocked(s, spell.unlock);
      const ready = S.spellReady(s, id);
      const label = !unlocked ? tr('locked', { level: spell.unlock }) : ready ? tr('cast') : `${Math.ceil(s.cooldowns[id])} s`;
      return `<div class="card${ready ? ' sel' : ''}">${this.pic(SPELL_ICONS[id])}<div class="info"><div class="name">${tr(`sp.${id}`)}</div>
        <div class="dim">${tr(`spd.${id}`)}</div></div>
        ${this.button('cast', id, label, { disabled: !ready || s.battle.phase !== 'fight' })}</div>`;
    });
    return `<h3><span class="grow">${tr('tab.spells')}</span><button class="toggle" data-act="auto" aria-pressed="${s.auto}">${tr('autoCast')}: ${tr(s.auto ? 'on' : 'off')}</button></h3>
      ${cards.join('')}`;
  }

  tab_runes() {
    const s = this.state;
    if (!s.runes.length) return `${this.heading(tr('tab.runes'))}<p class="dim">${tr('noRunes')}</p>`;
    const groups = [];
    for (const type of D.RUNES) {
      for (let rarity = D.RARITY_BONUS.length - 1; rarity >= 0; rarity--) {
        const all = s.runes.filter((r) => r.type === type && r.rarity === rarity);
        if (!all.length) continue;
        const loose = S.looseRunes(s, type, rarity);
        const on = all.filter((r) => S.runeHolder(s, r.id)).map((r) => this.holderName(S.runeHolder(s, r.id)));
        const about = tr(`rd.${type}`, { n: Math.round(D.RARITY_BONUS[rarity] * 100) });
        groups.push(`<div class="card"><div class="pic" style="box-shadow:0 0 0 calc(var(--u)*3) ${RARITY_COLORS[rarity]}"><img src="${iconUrl(this.scene, `rune-${type}`)}" alt=""></div>
          <div class="info"><div class="name" style="color:${RARITY_COLORS[rarity]}">${this.runeName({ type, rarity })} ×${all.length}</div>
          <div class="dim">${about}</div>${on.length ? `<div class="dim">${tr('equippedOn', { who: on.join(', ') })}</div>` : ''}</div>
          <div class="acts">${rarity < D.RARITY_BONUS.length - 1 ? this.button('merge', `${type}:${rarity}`, tr('merge'), { disabled: loose.length < 3 }) : ''}
          ${this.button('break', `${type}:${rarity}`, tr('breakDown', { souls: fmt(D.RARITY_SOULS[rarity]) }), { alt: true, disabled: !loose.length })}</div></div>`);
      }
    }
    return `${this.heading(tr('tab.runes'))}${groups.join('')}`;
  }

  holderName(holder) {
    return holder === this.state.lord ? tr('lord') : tr(`m.${holder.type}`);
  }

  tab_build() {
    const s = this.state;
    const wall = s.wall.built
      ? `<div class="dim">${tr('level', { level: s.wall.level + 1 })} · ${tr('hp')} ${fmt(S.wallMax(s))}</div></div>${this.button('upgradeWall', '', tr('upgrade'), { cost: S.wallUpgrade(s) })}`
      : `</div>${this.button('buildWall', '', tr('build'), { cost: D.WALL.cost })}`;
    const shop = D.STRUCTURE_ORDER.map((type) => {
      const t = D.STRUCTURES[type];
      return `<div class="card">${this.pic(type)}<div class="info"><div class="name">${tr(`s.${type}`)}</div>
        <div class="dim">${tr(`kind.${t.place}`)} · ${this.structAbout(type)}</div></div>
        ${this.button('buyStructure', type, tr('build'), { cost: S.structureCost(s, type), disabled: t.place === 'wall' && !s.wall.built })}</div>`;
    });
    const owned = s.structures.map((st) => this.structureCard(st)).join('');
    return `${this.heading(tr('wall'))}
      <div class="card">${this.pic('x72:wall_mid')}<div class="info"><div class="dim">${tr('wallAbout', { n: Math.round(D.WALL.rebuild * (1 - S.talent(s, 'rebuild') * 0.1)) })}</div>${wall}</div>
      <h4>${tr('slots')}</h4>${this.slotLine('wall')}${this.slotLine('support')}${this.slotLine('trap')}
      ${owned ? `<h4>${tr('owned')}</h4>${owned}` : ''}
      <h4>${tr('structures')}</h4>${shop.join('')}`;
  }

  structureCard(st) {
    const acts = st.cell
      ? `${this.button('placeItem', `s${st.id}`, tr('move'), { alt: true })}${this.button('store', `s${st.id}`, tr('store'), { alt: true })}`
      : this.button('placeItem', `s${st.id}`, tr('place'));
    return `<div class="card tap" data-act="open" data-arg="s${st.id}">${this.pic(st.type)}<div class="info">
      <div class="name">${tr(`s.${st.type}`)} · ${tr('lordLevel', { level: st.level + 1 })}</div><div class="dim">${st.cell ? tr('deployed') : tr('stored')}</div></div>
      <div class="acts">${acts}</div></div>`;
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
      return `${this.heading(`${tr(`m.${m.type}`)} · ${tr('lordLevel', { level: m.level })}`, true)}
        <div class="card">${this.pic(this.kindIcon(m))}<div class="info"><div class="dim">${tr(`md.${m.type}`)}</div>
          <div>${tr('hp')} ${fmt(m.dead ? 0 : m.hp)} / ${fmt(stats.hp)} · ${tr('dmg')} ${fmt(stats.dmg)}</div>
          ${this.bar(m.xp / need, '#ffd166')}<div class="dim">${tr('xp')} ${fmt(m.xp)} / ${fmt(need)} · ${status}</div></div>
          <div class="acts">${acts}</div></div>
        ${this.runeSlots(m, m.level)}`;
    }
    if (sel.kind === 'structure') {
      const st = s.structures.find((x) => x.id === sel.id);
      if (!st) return null;
      const acts = st.cell
        ? `${this.button('placeItem', `s${st.id}`, tr('move'), { alt: true })}${this.button('store', `s${st.id}`, tr('store'), { alt: true })}`
        : this.button('placeItem', `s${st.id}`, tr('place'));
      return `${this.heading(`${tr(`s.${st.type}`)} · ${tr('lordLevel', { level: st.level + 1 })}`, true)}
        <div class="card">${this.pic(st.type)}<div class="info"><div class="dim">${tr(`kind.${D.STRUCTURES[st.type].place}`)}</div>
          <div>${this.structAbout(st.type, st.level)}</div></div><div class="acts">${acts}</div></div>
        ${this.button('upgradeStructure', st.id, tr('upgradeTo', { level: st.level + 2 }), { cost: S.structureUpgrade(s, st), wide: true })}`;
    }
    if (sel.kind === 'cell') return this.cellView(sel);
    if (sel.kind === 'rune') return this.runePicker(sel);
    return null;
  }

  cellKind(col) {
    return { melee: 'melee', w0: 'wall', w1: 'wall', support: 'support', trap: 'trap' }[col];
  }

  cellView({ col, row }) {
    const s = this.state;
    const kind = this.cellKind(col);
    const title = tr('cell', { row: row + 1, kind: tr(`kind.${kind}`) });
    const fits = (item) => S.columnsFor(item).includes(col);
    const stored = [...s.monsters, ...s.structures].filter((x) => !x.cell && fits(x));
    const cards = stored.map(
      (item) => `<div class="card">${this.pic(this.kindIcon(item))}<div class="info"><div class="name">${this.itemName(item)}</div><div class="dim">${tr('stored')}</div></div>
      ${this.button('putHere', `${D.MONSTERS[item.type] ? 'm' : 's'}${item.id}`, tr('fits'))}</div>`,
    );
    const buys = [];
    for (const type of D.MONSTER_ORDER) {
      const m = D.MONSTERS[type];
      if (!fits({ type }) || !S.lordUnlocked(s, m.unlock)) continue;
      buys.push(`<div class="card">${this.pic(this.kindIcon({ type }))}<div class="info"><div class="name">${tr(`m.${type}`)}</div><div class="dim">${tr(`md.${type}`)}</div></div>
        ${this.button('buyHere', `m:${type}`, tr('recruit'), { cost: S.recruitCost(s, type) })}</div>`);
    }
    for (const type of D.STRUCTURE_ORDER) {
      if (!fits({ type })) continue;
      const noWall = D.STRUCTURES[type].place === 'wall' && !s.wall.built;
      buys.push(`<div class="card">${this.pic(type)}<div class="info"><div class="name">${tr(`s.${type}`)}</div><div class="dim">${this.structAbout(type)}</div></div>
        ${this.button('buyHere', `s:${type}`, tr('build'), { cost: S.structureCost(s, type), disabled: noWall })}</div>`);
    }
    const slotKinds = col === 'w0' || col === 'w1' ? ['ranged', 'wall'] : [kind];
    const full = slotKinds.filter((k) => S.placedCount(s, k) >= s.slots[k]);
    const slots = full.map((k) => this.slotLine(k)).join('');
    const wall = kind === 'wall' && !s.wall.built ? `<p class="dim">${tr('problem.noWall')}</p>${this.button('buildWall', '', tr('buildWall'), { cost: D.WALL.cost, wide: true })}` : '';
    return `${this.heading(title, true)}${slots}${wall}${cards.join('')}${buys.join('')}`;
  }

  runePicker({ holder, slot }) {
    const s = this.state;
    const who = holder === 'lord' ? s.lord : s.monsters.find((m) => m.id === holder);
    if (!who) return null;
    const current = who.runes[slot] != null && S.runeById(s, who.runes[slot]);
    const loose = s.runes.filter((r) => !S.runeHolder(s, r.id)).sort((a, b) => b.rarity - a.rarity || a.type.localeCompare(b.type));
    const cards = loose.map(
      (r) => `<div class="card tap" data-act="equip" data-arg="${r.id}"><div class="pic" style="box-shadow:0 0 0 calc(var(--u)*3) ${RARITY_COLORS[r.rarity]}"><img src="${iconUrl(this.scene, `rune-${r.type}`)}" alt=""></div>
      <div class="info"><div class="name" style="color:${RARITY_COLORS[r.rarity]}">${this.runeName(r)}</div><div class="dim">${tr(`rd.${r.type}`, { n: Math.round(D.RARITY_BONUS[r.rarity] * 100) })}</div></div></div>`,
    );
    return `${this.heading(`${tr('chooseRune')} · ${this.holderName(who)}`, true)}
      ${current ? `<div class="card sel"><div class="info"><div class="name">${this.runeName(current)}</div></div>${this.button('unequip', current.id, tr('unequip'), { alt: true })}</div>` : ''}
      ${cards.length ? cards.join('') : `<p class="dim">${tr('noRunes')}</p>`}`;
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
      this.body.scrollTop = 0;
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
          this.flash('slots');
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
      case 'open':
        this.sel = { kind: arg[0] === 'm' ? 'monster' : 'structure', id: Number(arg.slice(1)) };
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
        ok = Boolean(S.mergeRunes(s, type, Number(rarity)));
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
          this.flash(problem);
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
          this.flash(problem);
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
    return [...this.body.querySelectorAll('button:not(:disabled), [data-act].slot, .card.tap')];
  }

  showFocus() {
    this.body.querySelectorAll('.focus').forEach((el) => el.classList.remove('focus'));
    const list = this.focusables();
    if (this.focusIndex < 0 || !list.length) return;
    this.focusIndex = Math.min(this.focusIndex, list.length - 1);
    const el = list[this.focusIndex];
    el.classList.add('focus');
    el.scrollIntoView({ block: 'nearest' });
  }

  key(dir) {
    if (dir === 'left' || dir === 'right') {
      const i = TABS.findIndex(([id]) => id === this.tab);
      const next = TABS[(i + (dir === 'left' ? TABS.length - 1 : 1)) % TABS.length][0];
      this.sel = null;
      this.tab = next;
      this.focusIndex = -1;
      this.body.scrollTop = 0;
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
