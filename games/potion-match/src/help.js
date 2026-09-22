import { openHelpDialog } from '../../../shared/help-dialog.js';
import { MOVES } from './logic.js';
import { SPECIAL_ART, artPath } from './art.js';

export function openHelp(onClose) {
  const specials = Object.values(SPECIAL_ART)
    .map(
      (s) => `<div class="help-row"><img src="${artPath(s.key)}" alt="" style="width:48px;height:64px;object-fit:contain">
        <div><b>${s.name}</b><span>${s.how}. ${s.does}</span></div></div>`,
    )
    .join('');

  openHelpDialog({
    title: 'How to play',
    onClose,
    html: `
      <ul>
        <li>Swap two neighbouring potions to line up <b>3 or more</b> of the same colour.</li>
        <li>Swipe a potion towards its neighbour, or tap one potion and then the other.</li>
        <li>Swaps that make a match are free. A swap that <b>doesn't</b> make a match slides back and costs a move.</li>
        <li>You start with <b>${MOVES} moves</b>. When they're gone the game ends, so a careful player can keep going forever.</li>
        <li>Stuck? After a few seconds a possible move starts to wiggle.</li>
      </ul>
      <h3>Special potions</h3>
      <p>Bigger matches leave a special potion behind. Specials don't match by colour: they go off when you swap them
        with a neighbour, or when another special's blast reaches them.</p>
      ${specials}
      <p>Swapping two rainbows together clears the whole board.</p>
      <h3>Scoring</h3>
      <ul>
        <li>10 points per potion cleared, 50 for each special you make.</li>
        <li>When falling potions make new matches, each step of the chain multiplies the points: ×2, ×3 and so on.</li>
      </ul>`,
  });
}
