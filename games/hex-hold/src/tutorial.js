// The guided start on a new island: one step at a time, each done the moment it's
// true, with a small reward to keep things moving. `suggest` marks the building card
// to highlight in the build menu.
const count = (state, type) => state.buildings.filter((b) => b.type === type).length;

export const TUTORIAL = [
  { id: 'farm', suggest: 'farm', reward: { wood: 20 }, check: (s) => count(s, 'farm') > 0 },
  { id: 'home', suggest: 'home', reward: { wood: 20 }, check: (s) => count(s, 'home') > 0 },
  { id: 'lumbermill', suggest: 'lumbermill', reward: { wood: 20 }, check: (s) => count(s, 'lumbermill') > 0 },
  { id: 'mine', suggest: 'mine', reward: { wood: 30 }, check: (s) => count(s, 'mine') > 0 },
  { id: 'wait', reward: {}, check: (s) => s.buildings.every((b) => b.state !== 'building') },
  { id: 'barracks', suggest: 'barracks', reward: { stone: 20 }, check: (s) => count(s, 'barracks') > 0 },
  { id: 'knight', reward: { food: 30, gold: 20 }, check: (s) => s.units.length > 0 || s.buildings.some((b) => b.queue?.length) },
  { id: 'move', reward: {}, check: (s) => (s.stats?.moves ?? 0) > 0 },
  { id: 'tower', suggest: 'tower', reward: { stone: 30 }, check: (s) => count(s, 'tower') > 0 },
  { id: 'end', reward: {}, check: () => false }, // finished with the "Got it" button
];

export const tutorialStep = (state) => (state.tutorial && !state.tutorial.done ? TUTORIAL[state.tutorial.step] : null);

// Moves on past every step that is already true. Returns the steps just completed.
export function advanceTutorial(state) {
  const done = [];
  let step = tutorialStep(state);
  while (step && step.check(state)) {
    done.push(step);
    state.tutorial.step++;
    step = tutorialStep(state);
  }
  return done;
}

export function endTutorial(state) {
  if (state.tutorial) state.tutorial.done = true;
}
