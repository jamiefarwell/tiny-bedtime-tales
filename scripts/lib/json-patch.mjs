// Format-preserving JSON editing.
//
// The book JSON files are hand-formatted (inline arrays, compact palettes), so
// re-serialising them with JSON.stringify would rewrite every line and make
// reviews and concurrent edits painful. Instead we parse the source with value
// spans, diff the old and new objects, and splice only the changed values (or
// insert new keys) into the original text.

/**
 * @typedef {{ type: 'object', start: number, end: number, entries: { key: string, keyStart: number, node: Node }[] }
 *   | { type: 'array', start: number, end: number, items: Node[] }
 *   | { type: 'scalar', start: number, end: number }} Node
 */

/** Parse JSON text, returning a span tree. Throws on invalid JSON. */
export function parseSpans(text) {
  let i = 0;
  const ws = () => { while (i < text.length && ' \t\n\r'.includes(text[i])) i++; };
  const fail = (m) => { throw new Error(`JSON parse error at ${i}: ${m}`); };
  function str() {
    const s = i;
    if (text[i] !== '"') fail('expected string');
    i++;
    while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    if (text[i] !== '"') fail('unterminated string');
    i++;
    return { start: s, end: i, value: JSON.parse(text.slice(s, i)) };
  }
  /** @returns {Node} */
  function value() {
    ws();
    const s = i;
    const c = text[i];
    if (c === '{') {
      i++;
      const entries = [];
      ws();
      if (text[i] === '}') { i++; return { type: 'object', start: s, end: i, entries }; }
      for (;;) {
        ws();
        const k = str();
        ws();
        if (text[i] !== ':') fail('expected :');
        i++;
        const node = value();
        entries.push({ key: k.value, keyStart: k.start, node });
        ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === '}') { i++; return { type: 'object', start: s, end: i, entries }; }
        fail('expected , or }');
      }
    }
    if (c === '[') {
      i++;
      const items = [];
      ws();
      if (text[i] === ']') { i++; return { type: 'array', start: s, end: i, items }; }
      for (;;) {
        items.push(value());
        ws();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; return { type: 'array', start: s, end: i, items }; }
        fail('expected , or ]');
      }
    }
    if (c === '"') { const r = str(); return { type: 'scalar', start: r.start, end: r.end }; }
    const m = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i, i + 64));
    if (!m) fail('unexpected token');
    i += m[0].length;
    return { type: 'scalar', start: s, end: i };
  }
  const root = value();
  ws();
  if (i !== text.length) fail('trailing content');
  return root;
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function lineIndent(text, pos) {
  const ls = text.lastIndexOf('\n', pos - 1) + 1;
  return /^[ \t]*/.exec(text.slice(ls))[0];
}

function detectUnit(text) {
  const m = text.match(/\n([ \t]+)"/);
  return m ? (m[1].includes('\t') ? '\t' : ' '.repeat(Math.min(m[1].length, 4))) : '  ';
}

/** Serialise a value to sit at a given indentation. Arrays of flat objects get one item per line. */
export function formatValue(v, indent, unit = '  ') {
  if (!v || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const flat = v.every((x) => x === null || typeof x !== 'object' || (isObj(x) && Object.values(x).every((y) => y === null || typeof y !== 'object')));
    if (flat) return `[\n${v.map((x) => indent + unit + JSON.stringify(x)).join(',\n')}\n${indent}]`;
  }
  return JSON.stringify(v, null, unit).split('\n').map((l, k) => (k ? indent + l : l)).join('\n');
}

/**
 * Compute splice edits turning `before` (parsed from `text`) into `after`.
 * Deleted keys are not supported (never needed by the pipeline) and throw.
 */
function diff(text, node, before, after, edits, unit) {
  if (same(before, after)) return;
  if (node.type === 'object' && isObj(before) && isObj(after)) {
    for (const k of Object.keys(before)) if (!(k in after)) throw new Error(`json-patch: deleting key "${k}" is not supported`);
    const added = [];
    for (const [k, v] of Object.entries(after)) {
      const entry = node.entries.find((e) => e.key === k);
      if (entry) diff(text, entry.node, before[k], v, edits, unit);
      else added.push([k, v]);
    }
    if (added.length) {
      const last = node.entries.at(-1);
      if (last) {
        const ind = lineIndent(text, last.keyStart);
        const sameLine = !text.slice(node.start, node.end).includes('\n');
        const ins = added.map(([k, v]) => (sameLine ? `, ${JSON.stringify(k)}: ${JSON.stringify(v)}` : `,\n${ind}${JSON.stringify(k)}: ${formatValue(v, ind, unit)}`)).join('');
        edits.push({ start: last.node.end, end: last.node.end, text: ins });
      } else {
        const ind = lineIndent(text, node.start);
        edits.push({ start: node.start, end: node.end, text: formatValue(after, ind, unit) });
      }
    }
    return;
  }
  if (node.type === 'array' && Array.isArray(before) && Array.isArray(after) && before.length === after.length) {
    after.forEach((v, k) => diff(text, node.items[k], before[k], v, edits, unit));
    return;
  }
  edits.push({ start: node.start, end: node.end, text: formatValue(after, lineIndent(text, node.start), unit) });
}

/**
 * Apply `mutate` to the parsed JSON in `text` and return the new text with
 * the original formatting preserved everywhere that did not change.
 * @param {string} text
 * @param {(obj: any) => void} mutate
 * @returns {{ text: string, changed: boolean }}
 */
export function patchJsonText(text, mutate) {
  const bom = text.startsWith('﻿') ? '﻿' : '';
  const src = bom ? text.slice(1) : text;
  const before = JSON.parse(src);
  const after = structuredClone(before);
  mutate(after);
  if (same(before, after)) return { text, changed: false };
  const root = parseSpans(src);
  const edits = [];
  diff(src, root, before, after, edits, detectUnit(src));
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  // Safety net: the result must parse back to exactly `after`.
  if (!same(JSON.parse(out), after)) throw new Error('json-patch: internal error (round-trip mismatch)');
  return { text: bom + out, changed: true };
}
