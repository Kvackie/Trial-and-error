import Phaser from 'phaser';
import { ELEMENTS, INGREDIENTS, POTIONS, ingredientById, potionById } from '../data.js';
import { MAX_IN_CAULDRON, MAX_SELL, dayNumber, hotPotion, merchantStock, unitPrice } from '../economy.js';
import { addToCauldron, brew, buy, count, emptyCauldron, helpIfBroke, learn, loadShop, preview, recordSale, saveShop } from '../shop.js';
import { claimFirstBrew, fetchFirsts, fetchMarket, sell } from '../online.js';
import { THEME, openHelp } from '../help.js';
import { tr } from '../strings.js';
import { addHomeButton } from '../../../../shared/home-button.js';
import { addSettingsButton } from '../../../../shared/settings.js';
import { addTrophyButton, openLeaderboard } from '../../../../shared/leaderboard.js';
import { openConfirmDialog } from '../../../../shared/help-dialog.js';
import { addFocus } from '../../../../shared/focus.js';
import { showToast } from '../../../../shared/toast.js';
import { onSceneLangChange } from '../../../../shared/i18n.js';
import { playSound } from '../../../../shared/sound.js';

const HEADER_H = 120;
const MARGIN = 16;
const TAB_H = 100;
const WIDTH = 720 - 2 * MARGIN;
const ELEMENT_COLOURS = { ignis: 0xff6a3d, aqua: 0x3fa9ff, terra: 0x8bc34a, aer: 0xdfe8ff, umbra: 0x9b6bff };
const BREW_ART = { ignis: 'brewIgnis', aqua: 'brewAqua', terra: 'brewTerra', aer: 'brewAer', umbra: 'brewUmbra' };
const MERCHANTS = ['vessa', 'bramm', 'hesk'];
const GOLD = '#ffd98a';
const CARD = 0x3a2618;
const CARD_EDGE = 0x8a5a33;
const FONT = 'sans-serif';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  preload() {
    for (const p of POTIONS) this.load.image(p.id, `./potions/${p.id}.png`);
    for (const i of INGREDIENTS) this.load.image(i.id, `./ingredients/${i.id}.png`);
    for (const key of ['cauldronOne', 'coinStack', 'weatheredOak', ...MERCHANTS, ...Object.values(BREW_ART)]) this.load.image(key, `./art/${key}.png`);
  }

  create() {
    this.shop = loadShop();
    this.tab = 'brew';
    this.busy = false;
    this.market = { hot: hotPotion(), pressure: {}, online: false };
    this.firsts = {};
    this.top = HEADER_H + 8;
    this.bottom = this.scale.height - MARGIN - TAB_H - 12;

    this.setUpHeader();
    this.setUpTabs();
    this.focus = addFocus(this, () => [...(this.focusRows ?? []), this.tabItems], { color: 0xffffff });
    this.render();

    this.loadMarket();
    this.time.addEvent({ delay: 60_000, loop: true, callback: () => this.loadMarket() });
    fetchFirsts()
      .then((firsts) => {
        this.firsts = firsts;
        if (this.tab === 'brew') this.render();
      })
      .catch(() => {});
    onSceneLangChange(this, () => this.render());

    this.time.delayedCall(600, () => this.helpIfStuck());
  }

  // The merchant helps out whenever the shop is stuck (see helpIfBroke).
  helpIfStuck() {
    const gift = helpIfBroke(this.shop);
    if (!gift) return false;
    saveShop(this.shop);
    showToast(this, tr('pity', { name: tr(this.merchant()), n: gift }), { color: GOLD, duration: 3500 });
    this.render();
    return true;
  }

  loadMarket() {
    fetchMarket(this.shop).then((market) => {
      this.market = market;
      if (this.tab === 'sell') this.render();
    });
  }

  merchant() {
    return MERCHANTS[dayNumber() % MERCHANTS.length];
  }

  // --- Frame: header and tabs -----------------------------------------------------

  setUpHeader() {
    const y = 60;
    const pause = () => this.scene.pause();
    const resume = () => this.scene.resume();
    addHomeButton(this, 56, y);
    addTrophyButton(this, 136, y, {
      onClick: () => {
        pause();
        openLeaderboard({ game: 'potion-market', unit: tr('unit'), myBest: this.shop.earned, theme: THEME, onClose: resume });
      },
    });
    addSettingsButton(this, 720 - 136, y, { theme: THEME, onOpen: pause, onClose: resume });
    const help = this.add.circle(720 - 56, y, 32, 0x2b2d5c).setStrokeStyle(3, 0xe0e2ff).setInteractive({ useHandCursor: true });
    this.add.text(help.x, y, '?', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    help.on('pointerup', () => {
      playSound('click');
      pause();
      openHelp(resume);
    });

    this.coin = this.add.image(0, y, 'coinStack').setDisplaySize(56, 56);
    this.goldText = this.add.text(0, y, '', { fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: GOLD }).setOrigin(0, 0.5);
  }

  updateGold() {
    this.goldText.setText(this.shop.gold.toLocaleString());
    const w = 56 + 10 + this.goldText.width;
    this.coin.setX(360 - w / 2 + 28);
    this.goldText.setX(360 - w / 2 + 66);
  }

  setUpTabs() {
    const y = this.scale.height - MARGIN - TAB_H / 2;
    const tabs = ['brew', 'buy', 'sell'];
    const gap = 12;
    const w = (WIDTH - gap * 2) / 3;
    this.tabGfx = this.add.graphics();
    this.tabTexts = [];
    this.tabItems = tabs.map((tab, i) => {
      const x = MARGIN + w / 2 + i * (w + gap);
      const text = this.add.text(x, y, '', { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.tabTexts.push({ tab, text, x, w });
      const activate = () => {
        if (this.tab === tab) return;
        playSound('click');
        this.tab = tab;
        if (tab === 'sell') this.loadMarket();
        this.render();
      };
      this.add.zone(x, y, w, TAB_H).setInteractive({ useHandCursor: true }).on('pointerup', activate);
      return { x, y, w, h: TAB_H, activate };
    });
  }

  drawTabs() {
    const y = this.scale.height - MARGIN - TAB_H;
    this.tabGfx.clear();
    for (const { tab, text, x, w } of this.tabTexts) {
      const on = tab === this.tab;
      this.tabGfx.fillStyle(on ? 0xe0a84f : CARD, 1).fillRoundedRect(x - w / 2, y, w, TAB_H, 20);
      this.tabGfx.lineStyle(3, on ? 0xffd98a : CARD_EDGE).strokeRoundedRect(x - w / 2, y, w, TAB_H, 20);
      text.setText(tr(`${tab}Tab`)).setColor(on ? '#2a1c14' : '#ffffff');
    }
  }

  // --- Drawing helpers ------------------------------------------------------------

  // Redraws the current tab from scratch. Cheap enough for a shop, and keeps the
  // screen always in step with the saved state.
  render() {
    if (this.layer) {
      this.tweens.killTweensOf(this.layer.list);
      this.layer.destroy();
    }
    this.layer = this.add.container(0, 0);
    this.focusRows = [];
    this.updateGold();
    this.drawTabs();
    if (this.tab === 'brew') this.renderBrew();
    else if (this.tab === 'buy') this.renderBuy();
    else this.renderSell();
    this.focus.refresh();
  }

  text(x, y, value, style = {}, origin = 0.5) {
    const text = this.add.text(x, y, value, { fontFamily: FONT, fontSize: '26px', color: '#f6ead8', ...style }).setOrigin(origin, 0.5);
    this.layer.add(text);
    return text;
  }

  // A rounded card that can be tapped. Returns a focus item.
  card(x, y, w, h, { fill = CARD, edge = CARD_EDGE, width = 3, onPress } = {}) {
    const g = this.add.graphics();
    g.fillStyle(fill, 0.95).fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    g.lineStyle(width, edge).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    this.layer.add(g);
    if (onPress) {
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerup', onPress);
      this.layer.add(zone);
    }
    return { x, y, w, h, activate: onPress ?? (() => {}) };
  }

  image(x, y, key, height) {
    const img = this.add.image(x, y, key);
    img.setScale(height / img.height);
    this.layer.add(img);
    return img;
  }

  // Five small bars showing an ingredient's essences.
  essenceBars(x, y, essence, width = 70, height = 16) {
    const g = this.add.graphics();
    const bar = width / 5;
    essence.forEach((v, i) => {
      if (!v) return;
      const h = Math.max(3, (v / 38) * height);
      g.fillStyle(ELEMENT_COLOURS[ELEMENTS[i]]).fillRect(x - width / 2 + i * bar + 1, y + height / 2 - h, bar - 2, h);
    });
    this.layer.add(g);
  }

  // How much to scale a tab's content (designed at `height` with `gaps` gaps) to
  // fill the space between the header and the tabs.
  fit(height, gaps) {
    return Math.max(0.85, Math.min(1.4, (this.bottom - this.top - gaps * 24) / height));
  }

  // Spreads the fixed heights over the space between top and bottom, returning
  // the centre y of each block.
  stack(heights, maxGap = 40) {
    const spare = this.bottom - this.top - heights.reduce((a, b) => a + b, 0);
    const gap = Math.max(6, Math.min(maxGap, spare / (heights.length + 1)));
    let y = this.top + Math.max(gap, (spare - gap * (heights.length - 1)) / 2);
    return heights.map((h) => {
      const centre = y + h / 2;
      y += h + gap;
      return centre;
    });
  }

  refuse(reason) {
    playSound('invalid');
    showToast(this, reason, { y: this.bottom - 60, fontSize: 28 });
  }

  // --- Brew tab ---------------------------------------------------------------------

  renderBrew() {
    const shop = this.shop;
    // Everything grows (or shrinks a little) with the height available.
    const k = this.fit(776, 6);
    this.k = k;
    const [recipesY, infoY, cauldronY, shelfY, actionsY] = this.stack([220 * k, 44, 210 * k, 212 * k, 90]);

    // Recipes: two rows of six.
    const cellW = WIDTH / 6;
    const rows = [[], []];
    POTIONS.forEach((potion, i) => {
      const x = MARGIN + cellW / 2 + (i % 6) * cellW;
      const y = recipesY - 55 * k + Math.floor(i / 6) * 110 * k;
      const known = shop.known.includes(potion.id);
      const selected = shop.recipe === potion.id;
      const item = this.card(x, y, cellW - 8, 104 * k, {
        fill: selected ? 0x5a3a22 : CARD,
        edge: selected ? 0xffd98a : CARD_EDGE,
        width: selected ? 5 : 3,
        onPress: () => this.pickRecipe(potion.id),
      });
      const img = this.image(x, y - (known ? 0 : 10 * k), potion.id, Math.min(84 * k, 100));
      if (!known) {
        img.setAlpha(0.35);
        this.text(x, y + 34 * k, potion.learn.toLocaleString(), { fontSize: '22px', fontStyle: 'bold', color: GOLD });
      }
      const held = shop.stock[potion.id]?.count;
      if (held) {
        const badge = this.add.circle(x + cellW / 2 - 22, y - 36 * k, 16, 0x2e7d32).setStrokeStyle(2, 0xffffff);
        this.layer.add(badge);
        this.text(badge.x, badge.y, String(held), { fontSize: '18px', fontStyle: 'bold' });
      }
      rows[Math.floor(i / 6)].push(item);
    });

    // Recipe name and who brewed it first.
    const first = this.firsts[shop.recipe];
    this.text(360, infoY, first ? `${tr(shop.recipe)} · ${tr('firstBrewedBy', { name: first })}` : tr(shop.recipe), {
      fontSize: first ? '24px' : '30px',
      fontStyle: 'bold',
      color: GOLD,
    });

    this.renderCauldron(cauldronY);

    // Ingredient shelf: all twelve, dim when you have none.
    const shelfRows = [[], []];
    INGREDIENTS.forEach((ing, i) => {
      const x = MARGIN + cellW / 2 + (i % 6) * cellW;
      const y = shelfY - 53 * k + Math.floor(i / 6) * 106 * k;
      const have = count(shop, ing.id);
      const item = this.card(x, y, cellW - 8, 100 * k, { onPress: () => this.addIngredient(ing.id) });
      this.image(x, y - 14 * k, ing.id, Math.min(56 * k, 76)).setAlpha(have ? 1 : 0.3);
      this.essenceBars(x, y + 30 * k, ing.essence, 84, 18);
      this.text(x + cellW / 2 - 16, y - 36 * k, `${have}`, { fontSize: '20px', fontStyle: 'bold', color: have ? '#ffffff' : '#8a7a6a' }, 1);
      shelfRows[Math.floor(i / 6)].push(item);
    });
    const plank = this.add.image(360, shelfY + 108 * k, 'weatheredOak').setDisplaySize(WIDTH, 24).setAlpha(0.9);
    this.layer.add(plank);

    // Empty and Brew.
    const result = preview(shop);
    const actions = [
      this.actionButton(MARGIN + WIDTH * 0.25, actionsY, WIDTH / 2 - 8, tr('empty'), shop.cauldron.length > 0, () => this.empty()),
      this.actionButton(MARGIN + WIDTH * 0.75, actionsY, WIDTH / 2 - 8, tr('brew'), result.ok, () => this.brew(), true),
    ];
    this.focusRows = [...rows, ...shelfRows, actions];
  }

  renderCauldron(y) {
    const shop = this.shop;
    const result = preview(shop);
    const k = this.k;
    const cx = MARGIN + 110;
    // The swirl of the strongest essence rises from the cauldron.
    if (shop.cauldron.length) {
      const strongest = ELEMENTS[result.mix.indexOf(Math.max(...result.mix))];
      const swirl = this.image(cx, y - 40 * k, BREW_ART[strongest], 150 * k).setAlpha(0.9);
      this.tweens.add({ targets: swirl, y: swirl.y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.image(cx, y + 30 * k, 'cauldronOne', 170 * k);
    this.text(cx, y + 92 * k, `${shop.cauldron.length}/${MAX_IN_CAULDRON}`, { fontSize: '24px', color: '#d9c7b0' });

    // Balance bars: what the recipe wants (outline) and what's in the pot (filled).
    const target = potionById[shop.recipe].target;
    const sum = (v) => v.reduce((a, b) => a + b, 0) || 1;
    const left = MARGIN + 240;
    const barW = (720 - MARGIN - left) / 5;
    const barH = 120 * k;
    const base = y + 50 * k;
    const g = this.add.graphics();
    ELEMENTS.forEach((element, i) => {
      const x = left + i * barW + barW / 2;
      const want = (target[i] / sum(target)) * barH;
      const have = (result.mix[i] / sum(result.mix)) * barH;
      g.fillStyle(0x000000, 0.25).fillRect(x - barW / 2 + 8, base - barH, barW - 16, barH);
      g.fillStyle(ELEMENT_COLOURS[element], 0.9).fillRect(x - barW / 2 + 12, base - have, barW - 24, have);
      if (want) g.lineStyle(4, 0xffffff).strokeRect(x - barW / 2 + 8, base - want, barW - 16, want);
      this.text(x, base + 22, tr(element), { fontSize: '19px' });
    });
    this.layer.add(g);

    let status;
    let colour = '#ffb366';
    if (!shop.cauldron.length) status = tr('pickRecipe');
    else if (result.ok) {
      status = `${tr('match', { n: Math.round(result.quality * 100) })} · ${tr('makes', { n: result.count })}`;
      colour = '#8be38f';
    } else status = tr('noMatch');
    this.text(left + (720 - MARGIN - left) / 2, y - 92 * k, status, { fontSize: '24px', fontStyle: 'bold', color: colour, align: 'center', wordWrap: { width: 720 - MARGIN - left } });
  }

  actionButton(x, y, w, label, enabled, onPress, primary = false) {
    const item = this.card(x, y, w, 88, {
      fill: primary && enabled ? 0xe0a84f : CARD,
      edge: enabled ? 0xffd98a : CARD_EDGE,
      onPress,
    });
    this.text(x, y, label, { fontSize: '34px', fontStyle: 'bold', color: primary && enabled ? '#2a1c14' : '#ffffff' }).setAlpha(enabled ? 1 : 0.45);
    return item;
  }

  pickRecipe(id) {
    const shop = this.shop;
    if (shop.known.includes(id)) {
      playSound('select');
      shop.recipe = id;
      saveShop(shop);
      this.render();
      return;
    }
    const potion = potionById[id];
    if (shop.gold < potion.learn) return this.refuse(tr('tooPoor'));
    playSound('click');
    this.scene.pause();
    openConfirmDialog({
      ...THEME,
      title: tr('learnTitle', { name: tr(id) }),
      message: tr('learnMessage', { price: potion.learn, value: potion.value }),
      confirmLabel: tr('learnYes'),
      onConfirm: () => {
        this.scene.resume();
        if (learn(shop, id)) {
          playSound('levelUp');
          saveShop(shop);
          this.render();
        }
      },
      onClose: () => this.scene.resume(),
    });
  }

  addIngredient(id) {
    const problem = addToCauldron(this.shop, id);
    if (problem) return this.refuse(tr(problem));
    playSound('bubble');
    saveShop(this.shop);
    this.render();
  }

  empty() {
    if (!this.shop.cauldron.length) return;
    playSound('splash');
    emptyCauldron(this.shop);
    saveShop(this.shop);
    this.render();
    this.helpIfStuck();
  }

  brew() {
    const id = this.shop.recipe;
    const result = brew(this.shop);
    if (!result) return this.refuse(tr('noMatch'));
    playSound('brew');
    saveShop(this.shop);
    this.render();
    showToast(this, tr('brewed', { n: result.count, name: tr(id) }), { color: '#8be38f' });
    if (result.first && !this.firsts[id]) {
      this.time.delayedCall(1200, () =>
        claimFirstBrew(id, (claim) => {
          if (!claim) return;
          this.firsts[id] = claim.first;
          if (claim.you) {
            playSound('discover');
            showToast(this, tr('firstEver', { name: tr(id) }), { color: GOLD, duration: 3500 });
          }
          if (this.tab === 'brew') this.render();
        }),
      );
    }
  }

  // --- Buy tab ----------------------------------------------------------------------

  renderBuy() {
    const k = this.fit(660, 3);
    const [merchantY, offersY] = this.stack([200 * k, 460 * k]);
    const who = this.merchant();
    this.image(MARGIN + 80, merchantY, who, 200 * k);
    const bubble = this.card(MARGIN + 180 + (WIDTH - 180) / 2, merchantY, WIDTH - 190, 170, { fill: 0xf3e3c8, edge: 0x8a5a33 });
    this.text(bubble.x - bubble.w / 2 + 22, merchantY - 50, tr(who), { fontSize: '28px', fontStyle: 'bold', color: '#5a3a22' }, 0);
    this.text(bubble.x - bubble.w / 2 + 22, merchantY + 16, tr('merchantHello'), { fontSize: '23px', color: '#2a1c14', wordWrap: { width: bubble.w - 44 } }, 0);

    const offers = merchantStock();
    const cols = 4;
    const gap = 12;
    const w = (WIDTH - gap * (cols - 1)) / cols;
    const h = 224 * k;
    const rows = [[], []];
    offers.forEach((offer, i) => {
      const x = MARGIN + w / 2 + (i % cols) * (w + gap);
      const y = offersY - h / 2 - 6 + Math.floor(i / cols) * (h + 12);
      const affordable = this.shop.gold >= offer.price;
      rows[Math.floor(i / cols)].push(this.card(x, y, w, h, { onPress: () => this.buy(offer) }));
      this.image(x, y - 56 * k, offer.id, 74 * k);
      this.essenceBars(x, y - 4 * k, ingredientById[offer.id].essence, 100, 20);
      this.text(x, y + 30 * k, tr(offer.id), { fontSize: '21px', align: 'center', wordWrap: { width: w - 12 } });
      this.text(x, y + 68 * k, offer.price.toString(), { fontSize: '30px', fontStyle: 'bold', color: affordable ? GOLD : '#a3654a' });
      this.text(x, y + 98 * k, tr('owned', { n: count(this.shop, offer.id) }), { fontSize: '19px', color: '#d9c7b0' });
    });
    this.focusRows = rows;
  }

  buy(offer) {
    if (!buy(this.shop, offer.id, offer.price)) {
      if (this.helpIfStuck()) return undefined;
      return this.refuse(tr('tooPoor'));
    }
    playSound('coin');
    saveShop(this.shop);
    this.render();
    this.helpIfStuck();
  }

  // --- Sell tab ---------------------------------------------------------------------

  renderSell() {
    const { hot, pressure, online } = this.market;
    const rowsN = POTIONS.length / 2;
    const cardH = Math.min(150, (this.bottom - this.top - 90 - 8 * (rowsN - 1)) / rowsN);
    const [bannerY, listY] = this.stack([70, rowsN * cardH + 8 * (rowsN - 1)]);
    this.text(360, bannerY - (online ? 0 : 14), tr('hot', { name: tr(hot) }), { fontSize: '28px', fontStyle: 'bold', color: GOLD, align: 'center', wordWrap: { width: WIDTH } });
    if (!online) this.text(360, bannerY + 22, tr('offline'), { fontSize: '20px', color: '#d9c7b0' });

    const w = (WIDTH - 12) / 2;
    const rows = [];
    POTIONS.forEach((potion, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MARGIN + w / 2 + col * (w + 12);
      const y = listY - (rowsN * cardH + 8 * (rowsN - 1)) / 2 + cardH / 2 + row * (cardH + 8);
      const held = this.shop.stock[potion.id];
      const known = this.shop.known.includes(potion.id);
      const isHot = potion.id === hot;
      const quality = held?.quality ?? 1;
      const price = unitPrice(potion.id, pressure[potion.id] ?? 0, quality);
      const item = this.card(x, y, w, cardH, {
        fill: held ? 0x4a3020 : CARD,
        edge: isHot ? 0xffd98a : CARD_EDGE,
        width: isHot ? 5 : 3,
        onPress: () => this.sell(potion.id),
      });
      (rows[row] ??= []).push(item);
      this.image(x - w / 2 + 38, y, potion.id, Math.min(84, cardH - 16)).setAlpha(known ? 1 : 0.35);
      const textX = x - w / 2 + 76;
      this.text(textX, y - cardH * 0.22, tr(potion.id), { fontSize: '21px', fontStyle: 'bold', wordWrap: { width: w - 170 } }, 0).setAlpha(known ? 1 : 0.5);
      if (held) this.text(textX, y + cardH * 0.24, tr('sellAll', { n: Math.min(held.count, MAX_SELL) }), { fontSize: '20px', color: '#8be38f' }, 0);
      // Price each, with an arrow comparing it to the potion's usual value.
      const trend = price > potion.value * 1.05 ? '▲' : price < potion.value * 0.95 ? '▼' : '';
      const trendColour = trend === '▲' ? '#8be38f' : trend === '▼' ? '#ff8a6a' : GOLD;
      this.text(x + w / 2 - 14, y, `${price}${trend}`, { fontSize: '28px', fontStyle: 'bold', color: trendColour }, 1);
    });
    this.focusRows = rows;
  }

  async sell(id) {
    const held = this.shop.stock[id];
    if (!held) return this.refuse(tr('nothingToSell'));
    if (this.busy) return;
    this.busy = true;
    const n = Math.min(held.count, MAX_SELL);
    try {
      const total = await sell(this.shop, id, n, held.quality);
      recordSale(this.shop, id, n, total);
      this.market.pressure[id] = (this.market.pressure[id] ?? 0) + n;
      saveShop(this.shop);
      playSound('coin');
      showToast(this, tr('sold', { n: total }), { color: GOLD });
    } catch (error) {
      this.refuse(error?.busy ? tr('marketBusy') : tr('offline'));
    }
    this.busy = false;
    if (this.tab === 'sell') this.render();
  }
}
