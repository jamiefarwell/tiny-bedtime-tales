// Must match scripts/lib/tokenise.mjs exactly: narration timings index words
// in this order. A word is a maximal run of non-whitespace, so punctuation
// stays attached to the word it follows.
export interface Token {
  word: string;
  start: number;
  end: number;
}

export function tokenise(text: string): Token[] {
  const out: Token[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

/** Index of the token containing (or starting nearest after) a character offset. */
export function tokenAt(tokens: Token[], charIndex: number): number {
  let lo = 0;
  let hi = tokens.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].start <= charIndex) {
      best = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return best;
}
