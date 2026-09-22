// Arithmetic puzzles for the dead ends: one question, four whole-number options,
// exactly one correct. Wrong options are believable slips, not random numbers.

const randInt = (random, min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (random, list) => list[Math.floor(random() * list.length)];

// What a level asks for. Numbers and operations grow slowly with depth.
export function tierFor(level) {
  if (level <= 5) return { ops: ['+', '−'], addMin: -10, addMax: 20, table: 0 };
  if (level <= 10) return { ops: ['+', '−', '×', '÷'], addMin: -30, addMax: 50, table: 10 };
  if (level <= 20) return { ops: ['+', '−', '×', '÷'], addMin: -99, addMax: 99, table: 12 };
  return { ops: ['+', '−', '×', '÷'], addMin: -250, addMax: 250, table: 15 };
}

export function makePuzzle(level, random = Math.random) {
  const tier = tierFor(level);
  const op = pick(random, tier.ops);
  let a;
  let b;
  let answer;
  let slips;

  if (op === '+' || op === '−') {
    a = randInt(random, tier.addMin, tier.addMax);
    b = randInt(random, tier.addMin, tier.addMax);
    if (b === 0) b = randInt(random, 1, tier.addMax);
    answer = op === '+' ? a + b : a - b;
    slips =
      op === '+'
        ? [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, a - b, -answer]
        : [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, b - a, a + b];
  } else {
    const x = randInt(random, 2, tier.table);
    const y = randInt(random, 2, tier.table);
    if (op === '×') {
      a = x;
      b = y;
      answer = x * y;
      // Neighbouring times-table answers and small counting slips.
      slips = [answer + x, answer - x, answer + y, answer - y, answer + 1, answer - 1, answer + 2, answer - 2];
    } else {
      // Built backwards from a multiplication so it always divides exactly.
      a = x * y;
      b = x;
      answer = y;
      slips = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 3, b];
    }
  }

  const allowNegative = op === '+' || op === '−';
  const wrong = [];
  const seen = new Set([answer]);
  const candidates = [...slips];
  // Shuffle so the same kinds of slip don't always show up.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const value of candidates) {
    if (wrong.length === 3) break;
    if (!Number.isInteger(value) || seen.has(value) || (!allowNegative && value < 0)) continue;
    // Stay close: within 10, or within a fifth of the answer for big products.
    if (Math.abs(value - answer) > Math.max(10, Math.abs(answer) * 0.2)) continue;
    seen.add(value);
    wrong.push(value);
  }
  for (let step = 1; wrong.length < 3; step++) {
    for (const value of [answer + step, answer - step]) {
      if (wrong.length < 3 && !seen.has(value) && (allowNegative || value >= 0)) {
        seen.add(value);
        wrong.push(value);
      }
    }
  }

  const options = [answer, ...wrong];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { a, op, b, answer, options, text: `${formatNumber(a, false)} ${op} ${formatNumber(b, true)} = ?` };
}

// Proper minus sign; negative right-hand numbers get brackets: 7 + (−3).
export function formatNumber(n, bracketNegative) {
  if (n >= 0) return String(n);
  const text = `−${Math.abs(n)}`;
  return bracketNegative ? `(${text})` : text;
}
