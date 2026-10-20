// Convert a TTS provider's character-level alignment into WordTiming[] that
// index words exactly as tokenise(text) does.
//
// ElevenLabs returns `alignment.characters[]` (one entry per character of the
// submitted text) with parallel start/end second arrays. In practice those
// characters usually match the input 1:1, but we do not rely on it: we walk the
// page text and the alignment characters together, skipping whitespace on either
// side and re-synchronising after small mismatches (normalised quotes, dropped
// characters, expanded numbers when only `normalized_alignment` is available).

import { tokenise } from './tokenise.mjs';

const WS = /\s/u;
const LOOKAHEAD = 12;

/** Fold characters that providers commonly normalise so they still match. */
function fold(ch) {
  switch (ch) {
    case '‘': case '’': case '‚': case '′': case '`': return "'";
    case '“': case '”': case '„': case '″': return '"';
    case '–': case '—': case '−': return '-';
    case '…': return '.';
    default: return ch.toLowerCase();
  }
}

/** Split a string into code points with their UTF-16 offsets. */
function codePoints(text) {
  const out = [];
  let i = 0;
  for (const ch of text) {
    out.push({ ch, at: i });
    i += ch.length;
  }
  return out;
}

/**
 * @param {string} text  exactly the text that was sent to the provider
 * @param {{ characters: string[], character_start_times_seconds: number[], character_end_times_seconds: number[] }} alignment
 * @returns {{ timings: { w: number, start: number, end: number }[], matched: number, total: number }}
 */
export function alignmentToWordTimings(text, alignment) {
  const words = tokenise(text);
  if (!alignment || !Array.isArray(alignment.characters) || alignment.characters.length === 0) {
    throw new Error('Provider returned no character alignment');
  }
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  if (starts?.length !== chars.length || ends?.length !== chars.length) {
    throw new Error('Alignment arrays have mismatched lengths');
  }

  // textOffset (UTF-16) -> alignment index
  /** @type {Map<number, number>} */
  const map = new Map();
  const cps = codePoints(text);
  let i = 0;
  let j = 0;
  while (i < cps.length && j < chars.length) {
    const tc = cps[i].ch;
    const ac = String(chars[j] ?? '');
    if (WS.test(tc)) { i++; continue; }
    if (ac === '' || WS.test(ac)) { j++; continue; }
    if (fold(tc) === fold(ac) || tc === ac) {
      map.set(cps[i].at, j);
      i++; j++;
      continue;
    }
    // Mismatch: find the nearest re-sync point in either stream.
    let k;
    for (k = 1; k <= LOOKAHEAD && j + k < chars.length; k++) {
      if (fold(String(chars[j + k])) === fold(tc)) break;
    }
    let m;
    for (m = 1; m <= LOOKAHEAD && i + m < cps.length; m++) {
      if (!WS.test(cps[i + m].ch) && fold(cps[i + m].ch) === fold(ac)) break;
    }
    const kOk = k <= LOOKAHEAD && j + k < chars.length;
    const mOk = m <= LOOKAHEAD && i + m < cps.length;
    if (kOk && (!mOk || k <= m)) {
      j += k; // provider inserted characters (e.g. expanded a number): skip them
    } else if (mOk) {
      i += m; // provider dropped text characters: leave them unmapped
    } else {
      // Substitution: map it anyway so timing stays roughly in place.
      map.set(cps[i].at, j);
      i++; j++;
    }
  }
  const nonWsText = cps.filter((c) => !WS.test(c.ch)).length;

  const raw = words.map((w) => {
    let s = Infinity;
    let e = -Infinity;
    for (let off = w.start; off < w.end; off++) {
      const a = map.get(off);
      if (a === undefined) continue;
      s = Math.min(s, Number(starts[a]));
      e = Math.max(e, Number(ends[a]));
    }
    return Number.isFinite(s) ? { s, e } : null;
  });

  // Interpolate words with no mapped characters between their neighbours.
  const audioEnd = Math.max(0, ...ends.map(Number).filter(Number.isFinite));
  for (let k = 0; k < raw.length; k++) {
    if (raw[k]) continue;
    let p = k - 1;
    while (p >= 0 && !raw[p]) p--;
    let n = k + 1;
    while (n < raw.length && !raw[n]) n++;
    const from = p >= 0 ? raw[p].e : 0;
    const to = n < raw.length ? raw[n].s : audioEnd;
    const gaps = n - p; // number of slots between known neighbours
    const step = Math.max(0, to - from) / gaps;
    for (let q = p + 1; q < n; q++) {
      const s = from + step * (q - p - 1);
      raw[q] = { s, e: s + step, interpolated: true };
    }
    k = n - 1;
  }

  // Enforce monotonic, non-overlapping-in-start, end >= start; round to ms.
  const r3 = (x) => Math.round(x * 1000) / 1000;
  let prevStart = 0;
  const timings = raw.map((t, w) => {
    const start = Math.max(prevStart, t.s);
    const end = Math.max(start, t.e);
    prevStart = start;
    return { w, start: r3(start), end: r3(end) };
  });

  const matchedChars = map.size;
  return { timings, matched: matchedChars, total: nonWsText };
}
