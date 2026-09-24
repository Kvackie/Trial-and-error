// The HTML layer over the 3D view: resources along the top, and a panel at the bottom
// for whatever is selected (a tile to build on, a building, units or a dungeon).
import { BUILDINGS, BUILD_ORDER, RESEARCH, RESEARCH_BONUS, RESEARCH_MAX, RESOURCES, UNITS, dungeonTime, researchCost, upgradeCost } from './data.js';
import { parse } from './hex.js';
import { buildProblem, canAfford, heroLevel, maxHp, partyChance, population, rates, repairCost, researchProblem, storage, trainProblem, upgradeProblem } from './sim.js';
import { tr } from './strings.js';

const ICONS = {
  wood: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="4" fill="#a8743f"/><circle cx="19" cy="12" r="4" fill="#e3b77a"/><circle cx="19" cy="12" r="1.6" fill="#a8743f"/></svg>',
  stone: '<svg viewBox="0 0 24 24"><path d="M4 17l3-8 6-3 6 4 1 7z" fill="#9aa3ad"/><path d="M7 9l6-3 6 4-6 1z" fill="#c4cbd2"/></svg>',
  food: '<svg viewBox="0 0 24 24"><path d="M12 21V6" stroke="#c9a23b" stroke-width="2"/><ellipse cx="9.5" cy="9" rx="2.2" ry="3.2" fill="#e8c14f"/><ellipse cx="14.5" cy="9" rx="2.2" ry="3.2" fill="#e8c14f"/><ellipse cx="9.5" cy="14" rx="2.2" ry="3.2" fill="#e8c14f"/><ellipse cx="14.5" cy="14" rx="2.2" ry="3.2" fill="#e8c14f"/></svg>',
  gold: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#f2c23a"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#b8860b" stroke-width="1.5"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="3.5" fill="#dfe8f2"/><path d="M5 20c0-4 3-7 7-7s7 3 7 7z" fill="#dfe8f2"/></svg>',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const clock = (s) => {
  s = Math.max(0, Math.ceil(s));
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const costHtml = (cost, state) =>
  Object.entries(cost)
    .map(([r, v]) => `<span class="cost ${state && state.res[r] < v ? 'short' : ''}">${ICONS[r]}${v}</span>`)
    .join('');

export class UI {
  constructor(handlers) {
    this.handlers = handlers;
    this.top = document.querySelector('#resources');
    this.wave = document.querySelector('#wave');
    this.panel = document.querySelector('#panel');
    this.toasts = document.querySelector('#toasts');
    this.thumbs = {};
    this.party = new Set();
    this.lastPanel = '';
    this.panel.addEventListener('click', (e) => this.click(e));
  }

  // --- Top bar ---------------------------------------------------------------------

  updateTop(state) {
    const cap = storage(state);
    const { cap: people, used } = population(state);
    const r = rates(state);
    this.top.innerHTML =
      RESOURCES.map(
        (res) =>
          `<span class="chip ${state.res[res] >= cap ? 'full' : ''}" title="${esc(tr(res))}">${ICONS[res]}<b>${Math.floor(state.res[res])}</b><small>${r[res] > 0 ? `+${Math.round(r[res] * 60)}` : ''}</small></span>`,
      ).join('') + `<span class="chip ${used >= people ? 'full' : ''}" title="${esc(tr('people'))}">${ICONS.people}<b>${used}/${people}</b></span>`;
    const w = state.wave;
    if (state.monsters.length) this.wave.textContent = tr('waveNow', { n: w.number });
    else this.wave.textContent = w.next < 180 || w.number > 0 ? tr('nextWave', { time: clock(w.next) }) : tr('quiet');
    this.wave.classList.toggle('alarm', state.monsters.length > 0 || w.next < 30);
  }

  // --- Bottom panel -----------------------------------------------------------------

  // selection: null | { kind: 'tile', q, r } | { kind: 'building', id } | { kind: 'units', ids } | { kind: 'dungeon', key }
  updatePanel(state, selection) {
    let html;
    if (!selection) html = this.idle(state);
    else if (selection.kind === 'tile') html = this.buildMenu(state, selection);
    else if (selection.kind === 'building') html = this.buildingPanel(state, state.buildings.find((b) => b.id === selection.id));
    else if (selection.kind === 'units') html = this.unitsPanel(state, selection.ids);
    else if (selection.kind === 'dungeon') html = this.dungeonPanel(state, state.dungeons.find((d) => d.key === selection.key));
    if (html !== this.lastPanel) {
      // Keep the horizontal scroll of card rows while the panel refreshes.
      const scroll = this.panel.querySelector('.cards')?.scrollLeft ?? 0;
      this.panel.innerHTML = html;
      const cards = this.panel.querySelector('.cards');
      if (cards && this.sameKind === selection?.kind) cards.scrollLeft = scroll;
      this.sameKind = selection?.kind;
      this.lastPanel = html;
    }
  }

  head(title, sub = '') {
    return `<div class="head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><button class="x" data-act="close" aria-label="${esc(tr('close'))}">✕</button></div>`;
  }

  idle(state) {
    const n = state.units.filter((u) => u.state !== 'away').length;
    return `<div class="row idle"><p class="hint">${esc(tr('buildHint'))}</p>
      ${n ? `<button class="btn" data-act="army">${esc(tr('units'))} (${n})</button>` : ''}
      <button class="btn ghost" data-act="new">${esc(tr('newGame'))}</button></div>`;
  }

  buildMenu(state, { q, r }) {
    const cards = BUILD_ORDER.map((type) => {
      const problem = buildProblem(state, type, q, r);
      const hard = problem && problem !== 'noResources';
      return `<button class="card ${problem ? 'off' : ''} ${hard ? 'hard' : ''}" data-act="build" data-type="${type}" data-problem="${problem ?? ''}">
        <img src="${this.thumbs[`b_${type}`] ?? ''}" alt=""><b>${esc(tr(`b_${type}`))}</b><span class="costs">${costHtml(BUILDINGS[type].cost, state)}</span></button>`;
    }).join('');
    const tile = state.tiles.get(`${q},${r}`);
    const anyPossible = BUILD_ORDER.some((type) => !['hidden', 'occupied', 'tooFar'].includes(buildProblem(state, type, q, r)));
    if (!tile || !anyPossible) return this.head(esc(tr('build'))) + `<p class="hint">${esc(tr(buildProblem(state, 'home', q, r) ?? 'nothingHere'))}</p>`;
    return this.head(esc(tr('build'))) + `<div class="cards">${cards}</div>`;
  }

  buildingPanel(state, b) {
    if (!b) return this.idle(state);
    const def = BUILDINGS[b.type];
    const lines = [];
    let actions = '';
    if (b.state === 'building') lines.push(tr('underConstruction', { s: clock(b.left) }));
    else if (b.state === 'upgrading') lines.push(tr('upgrading', { s: clock(b.left) }));
    else if (b.state === 'destroyed') lines.push(tr('destroyed'));
    if (b.state !== 'destroyed') {
      lines.push(tr('hp', { hp: Math.ceil(b.hp), max: def.hp * b.level }));
      if (def.pop) lines.push(tr('housing', { n: def.pop * b.level }));
      if (b.type === 'castle') lines.push(tr('storageCap', { n: storage(state) }));
      if (def.workers) lines.push(tr('workers', { n: def.workers }));
      if (def.attack) lines.push(tr('towerInfo', { n: def.attack.range }));
      if (def.produce) {
        const f = b.level === 1 ? 1 : b.level === 2 ? 1.8 : 2.6;
        let near = 1;
        if (def.perNear) near = Math.min(3, [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].filter(([dq, dr]) => state.tiles.get(`${b.q + dq},${b.r + dr}`)?.terrain === def.perNear).length);
        lines.push(tr('produces', { list: Object.entries(def.produce).map(([res, v]) => `${Math.round(v * f * near * 60)} ${tr(res).toLowerCase()}`).join(', ') }));
      }
      if (b.queue.length) lines.push(tr('queue', { list: b.queue.map((j) => `${tr(`u_${j.unit}`)} ${clock(j.left)}`).join(', ') }));
    }
    if (b.state === 'destroyed') {
      const cost = repairCost(b);
      actions += `<button class="btn primary ${canAfford(state, cost) ? '' : 'off'}" data-act="repair">${esc(tr('repair'))} ${costHtml(cost, state)}</button>`;
    } else if (b.level < 3) {
      const problem = upgradeProblem(state, b);
      actions += `<button class="btn primary ${problem ? 'off' : ''}" data-act="upgrade" data-problem="${problem ?? ''}">${esc(tr('upgrade'))} ${costHtml(upgradeCost(b.type, b.level + 1), state)}</button>`;
    } else lines.push(tr('maxLevel'));
    let train = '';
    if (def.research && b.state !== 'destroyed') {
      const r = state.research ?? { weapons: 0, armour: 0 };
      lines.push(tr('researchInfo', { w: r.weapons, wp: Math.round(r.weapons * RESEARCH_BONUS * 100), a: r.armour, ap: Math.round(r.armour * RESEARCH_BONUS * 100) }));
      if (b.research) lines.push(tr('researching', { name: tr(`r_${b.research.track}`), s: clock(b.research.left) }));
      train = `<div class="cards">${RESEARCH.map((track) => {
        const tier = r[track] + 1;
        const problem = researchProblem(state, b, track);
        const label = tier > RESEARCH_MAX ? tr('maxLevel') : tr('researchCard', { name: tr(`r_${track}`), tier: 'I'.repeat(tier) });
        return `<button class="card ${problem ? 'off' : ''}" data-act="research" data-track="${track}" data-problem="${problem ?? ''}">
          <span class="big">${track === 'weapons' ? '⚔' : '🛡'}</span><b>${esc(label)}</b><span class="costs">${tier > RESEARCH_MAX ? '' : costHtml(researchCost(tier), state)}</span></button>`;
      }).join('')}</div>`;
    }
    if (def.trains && b.state !== 'destroyed') {
      train = `<div class="cards">${def.trains
        .map((unit) => {
          const problem = trainProblem(state, b, unit);
          return `<button class="card ${problem ? 'off' : ''}" data-act="train" data-unit="${unit}" data-problem="${problem ?? ''}">
            <img src="${this.thumbs[`u_${unit}`] ?? ''}" alt=""><b>${esc(tr(`u_${unit}`))}</b><span class="costs">${costHtml(UNITS[unit].cost, state)}</span></button>`;
        })
        .join('')}</div>`;
    }
    return this.head(`${esc(tr(`b_${b.type}`))} <span class="lvl">${esc(tr('level', { n: b.level }))}</span>`) +
      `<ul class="lines">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>${train}<div class="row">${actions}</div>`;
  }

  unitsPanel(state, ids) {
    const units = state.units.filter((u) => ids.includes(u.id));
    const heroes = units
      .map((u) => `<li class="hero"><img src="${this.thumbs[`u_${u.type}`] ?? ''}" alt=""><span><b>${esc(u.name ?? tr(`u_${u.type}`))}</b> ${'★'.repeat(heroLevel(u) - 1)}<br>
        <small>${esc(tr(`u_${u.type}`))} · ${esc(tr('xpLine', { hp: Math.ceil(u.hp), max: maxHp(state, u), xp: u.xp ?? 0 }))}</small></span></li>`)
      .join('');
    return this.head(esc(tr('units')), esc(tr('moveHint'))) + `<ul class="heroes">${heroes}</ul>` +
      `<div class="row"><button class="btn" data-act="army">${esc(tr('selectAll'))}</button></div>`;
  }

  dungeonPanel(state, d) {
    if (!d) return this.idle(state);
    const title = esc(tr('dungeonName', { n: d.tier }));
    if (d.state === 'running') return this.head(title, esc(tr('dungeonRunning', { s: clock(d.left) })));
    if (d.state === 'cooldown') return this.head(title, esc(tr('dungeonCooldown', { s: clock(d.left) })));
    const free = state.units.filter((u) => u.state !== 'away');
    for (const id of this.party) if (!free.some((u) => u.id === id)) this.party.delete(id);
    const chips = free
      .map((u) => `<button class="pick ${this.party.has(u.id) ? 'on' : ''}" data-act="pick" data-id="${u.id}"><img src="${this.thumbs[`u_${u.type}`] ?? ''}" alt="">${esc(tr(`u_${u.type}`))}</button>`)
      .join('');
    const chance = this.party.size ? Math.round(partyChance(state, d, [...this.party]) * 100) : 0;
    return this.head(title, esc(tr('dungeonReady', { s: clock(dungeonTime(d.tier)) }))) +
      (free.length
        ? `<p class="hint">${esc(tr('pickParty'))}</p><div class="cards picks">${chips}</div>
           <div class="row"><span class="chance">${esc(tr('chance', { n: chance }))}</span><button class="btn primary ${this.party.size ? '' : 'off'}" data-act="send">${esc(tr('send'))}</button></div>`
        : `<p class="hint">${esc(tr('noIdle'))}</p>`);
  }

  click(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const h = this.handlers;
    const problem = el.dataset.problem;
    switch (el.dataset.act) {
      case 'close':
        return h.onClose();
      case 'build':
        return problem ? this.toast(tr(problem), 'warn') : h.onBuild(el.dataset.type);
      case 'upgrade':
        return problem ? this.toast(tr(problem), 'warn') : h.onUpgrade();
      case 'repair':
        return h.onRepair();
      case 'train':
        return problem ? this.toast(tr(problem), 'warn') : h.onTrain(el.dataset.unit);
      case 'research':
        return problem ? this.toast(tr(problem), 'warn') : h.onResearch(el.dataset.track);
      case 'army':
        return h.onSelectAll();
      case 'new':
        return h.onNewGame();
      case 'pick': {
        const id = Number(el.dataset.id);
        if (this.party.has(id)) this.party.delete(id);
        else this.party.add(id);
        this.lastPanel = '';
        return h.onClose(true);
      }
      case 'send':
        if (this.party.size) h.onSend([...this.party]);
        this.party.clear();
        return undefined;
      default:
        return undefined;
    }
  }

  toast(text, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.prepend(el);
    while (this.toasts.children.length > 4) this.toasts.lastChild.remove();
    setTimeout(() => el.classList.add('out'), 3200);
    setTimeout(() => el.remove(), 3700);
  }

  lootText(loot) {
    return Object.entries(loot)
      .map(([r, v]) => `${v} ${tr(r).toLowerCase()}`)
      .join(', ');
  }
}

export { parse };
