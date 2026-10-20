// "Hero look": how a child appears in illustrated stories, chosen by the
// parent from a fixed palette (never a photo). Because the options are
// finite, each combination's reference sheet is generated once and shared by
// every family who picks it — the same face every night, for a fraction of
// the cost. See docs/COST_OPTIMISATION.md.
//
// Privacy: skin tone can be special-category data. It lives only on the
// child's profile, is never sent to the story-writing model, never logged in
// analytics, and the shared sheet bank holds no link back to any family.

export interface HeroLook {
  skin: string;
  hair: string;
  style: string;
  glasses: boolean;
  freckles: boolean;
}

export const SKIN_TONES = [
  { id: 's1', label: 'Very light', swatch: '#f6dccb' },
  { id: 's2', label: 'Light', swatch: '#eac1a3' },
  { id: 's3', label: 'Light-medium', swatch: '#d9a37f' },
  { id: 's4', label: 'Medium', swatch: '#c18760' },
  { id: 's5', label: 'Medium-tan', swatch: '#a66d47' },
  { id: 's6', label: 'Tan', swatch: '#8a5636' },
  { id: 's7', label: 'Brown', swatch: '#6b4028' },
  { id: 's8', label: 'Deep brown', swatch: '#4a2c1c' },
] as const;

export const HAIR_COLOURS = [
  { id: 'black', label: 'Black', swatch: '#1b1716' },
  { id: 'darkbrown', label: 'Dark brown', swatch: '#3b2519' },
  { id: 'brown', label: 'Brown', swatch: '#6b4428' },
  { id: 'auburn', label: 'Auburn', swatch: '#8c3b1f' },
  { id: 'red', label: 'Red', swatch: '#c2521f' },
  { id: 'blonde', label: 'Blonde', swatch: '#d8b064' },
  { id: 'lightblonde', label: 'Light blonde', swatch: '#efd9a0' },
] as const;

export const HAIR_STYLES = [
  { id: 'short', label: 'Short' },
  { id: 'shortcurly', label: 'Short and curly' },
  { id: 'buzz', label: 'Very short' },
  { id: 'longstraight', label: 'Long and straight' },
  { id: 'longwavy', label: 'Long and wavy' },
  { id: 'curly', label: 'Big curls' },
  { id: 'puffs', label: 'Puffs' },
  { id: 'braids', label: 'Braids' },
  { id: 'bunches', label: 'Bunches' },
  { id: 'ponytail', label: 'Ponytail' },
] as const;

/** Stable key for the shared reference-sheet bank. */
export function heroLookKey(look: HeroLook, ageBand: string): string {
  const age = ['Newborn–1', '2–3'].includes(ageBand) ? 'toddler' : ['4–5', '6–7'].includes(ageBand) ? 'young' : 'older';
  return [look.skin, look.hair, look.style, look.glasses ? 'g' : 'ng', look.freckles ? 'f' : 'nf', age].join('-');
}

/** Description used in illustration prompts (not in story text prompts). */
export function heroLookPrompt(look: HeroLook): string {
  const skin = SKIN_TONES.find((s) => s.id === look.skin)?.label.toLowerCase() ?? 'warm';
  const hair = HAIR_COLOURS.find((h) => h.id === look.hair)?.label.toLowerCase() ?? 'brown';
  const style = HAIR_STYLES.find((h) => h.id === look.style)?.label.toLowerCase() ?? 'short';
  return [
    `${skin} skin`,
    `${hair} hair, ${style}`,
    look.glasses ? 'round glasses' : '',
    look.freckles ? 'a few freckles' : '',
  ]
    .filter(Boolean)
    .join(', ');
}
