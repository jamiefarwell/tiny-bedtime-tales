// Cheap, dependency-free readability measures used to check a story against
// its level's limits. Logged on every generation so prompt changes can be
// judged on numbers, not impressions.

export interface Readability {
  sentences: number;
  avgSentence: number;
  longestSentence: number;
  overLimit: number;
  /** Share of words with 3+ syllables (rough count). */
  hardWords: number;
  hardWordList: string[];
}

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export function readability(text: string, maxSentence: number): Readability {
  // Treat sound effects and dialogue fragments as sentences in their own right.
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])["”’]?\s+/)
    .map((s) => s.trim())
    .filter((s) => /[a-z]/i.test(s));
  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const words = text.match(/[A-Za-z’']+/g) ?? [];
  // Proper names and sound effects inflate the count; skip capitalised words
  // and anything with a repeated letter run (Fweeee, HRRRNK).
  const hard = words.filter((w) => !/^[A-Z]/.test(w) && !/(.)\1\1/.test(w) && syllables(w) >= 3);
  return {
    sentences: sentences.length,
    avgSentence: lengths.length ? +(lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1) : 0,
    longestSentence: Math.max(0, ...lengths),
    overLimit: lengths.filter((l) => l > maxSentence).length,
    hardWords: words.length ? +(hard.length / words.length).toFixed(3) : 0,
    hardWordList: Array.from(new Set(hard.map((w) => w.toLowerCase()))).slice(0, 30),
  };
}
