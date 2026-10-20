// Canonical word tokeniser for read-along highlighting.
//
// A "word" is a maximal run of non-whitespace characters, so punctuation stays
// attached to its word ("Grandad's", "HRRRRNK…", "\"It's") and paragraph breaks
// are just whitespace. `start`/`end` are UTF-16 string offsets into `text`
// (end exclusive), i.e. `text.slice(start, end) === word`.
//
// WordTiming.w in lib/types.ts indexes into this array. The app MUST use an
// identical implementation; this file has no dependencies so it can be copied
// or imported verbatim:
//
//   export function tokenise(text) {
//     const out = [];
//     for (const m of String(text ?? '').matchAll(/\S+/gu)) {
//       out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
//     }
//     return out;
//   }
//
// Note: JavaScript's \s covers Unicode whitespace (including NBSP U+00A0 and
// the line/paragraph separators), so a non-breaking space SPLITS words. Avoid
// NBSP in book text if two words should highlight together.

/**
 * @param {string} text
 * @returns {{ word: string, start: number, end: number }[]}
 */
export function tokenise(text) {
  const out = [];
  for (const m of String(text ?? '').matchAll(/\S+/gu)) {
    out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export default tokenise;
