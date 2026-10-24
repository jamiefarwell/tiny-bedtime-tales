// Illustration prompts for personalised stories ("Starring your child").
// Same house style and rules as the library pipeline (scripts/lib/art-prompts.mjs):
// locked character designs attached as reference images, no text in the art.
//
// Privacy: the child's name never appears here. The story engine calls the
// hero HERO in its art directions, and the hero's look comes only from the
// palette in lib/heroLook.ts.

import type { AgeBand, Pronouns } from '@/lib/types';
import { HAIR_COLOURS, SKIN_TONES, heroLookPrompt, type HeroLook } from '@/lib/heroLook';

export const HOUSE_STYLE =
  'Premium contemporary picture-book illustration: soft painterly 3D look, rounded expressive characters, warm lamp-light against deep blue night, gentle film grain, rich but uncluttered compositions, cinematic depth of field. Consistent characters on every page.';

export const NO_TEXT_RULE = [
  'ABSOLUTELY NO TEXT IN THE IMAGE. Do not draw any words, letters, numbers, digits, captions, titles, speech or thought bubbles, labels,',
  'signs, signage, logos, watermarks, signatures, page numbers, borders, frames, panels, buttons or any user-interface elements.',
  'Objects that would normally carry writing (books, clocks, signs, posters, packaging, clothing, tickets, maps) must be blank, abstract,',
  'turned away or out of focus. This rule overrides everything else in this prompt.',
].join(' ');

/** The hero's outfit in every picture, so they're instantly recognisable. */
export const HERO_OUTFIT = 'soft blue cotton pyjamas with a scattering of tiny yellow moons, and cosy grey socks';

/** Bump when the hero sheet prompt changes, so cached sheets are redrawn. */
export const HERO_SHEET_VERSION = 'h1';

const AGE: Record<AgeBand, string> = {
  'Newborn–1': 'about one year old, able to sit up, with a round baby face',
  '2–3': 'about three years old, with a round toddler face and short limbs',
  '4–5': 'about five years old',
  '6–7': 'about seven years old',
  '8–9': 'about nine years old',
  '10–12': 'about eleven years old',
  'Older kids': 'about eleven years old',
};

function who(ageBand: AgeBand, pronouns: Pronouns) {
  const kind = ageBand === 'Newborn–1' ? 'baby' : pronouns === 'she' ? 'girl' : pronouns === 'he' ? 'boy' : 'child';
  return `a ${ageBand === '2–3' ? `toddler ${kind}` : kind} ${AGE[ageBand] ?? AGE['4–5']}`;
}

/** Locked text description of the hero, pasted into every prompt. */
export function heroDescription(look: HeroLook, ageBand: AgeBand, pronouns: Pronouns): string {
  const skin = SKIN_TONES.find((s) => s.id === look.skin);
  const hair = HAIR_COLOURS.find((h) => h.id === look.hair);
  return [
    `HERO is ${who(ageBand, pronouns)}: ${heroLookPrompt(look)}.`,
    skin ? `Skin tone close to ${skin.swatch}.` : '',
    hair ? `Hair colour close to ${hair.swatch}.` : '',
    `Wearing ${HERO_OUTFIT}.`,
    'Friendly, appealing storybook proportions (slightly large head, rounded features, big expressive eyes). A fictional character, not a real person, not photorealistic.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function heroSheetPrompt(look: HeroLook, ageBand: AgeBand, pronouns: Pronouns): string {
  return [
    'Character reference sheet for HERO, the child star of a personalised bedtime picture book.',
    '',
    `CHARACTER (locked design, follow exactly): ${heroDescription(look, ageBand, pronouns)}`,
    '',
    `ART STYLE: ${HOUSE_STYLE}`,
    '',
    'COMPOSITION:',
    '- One single full-body view of HERO only, head to toe fully in frame with generous space around them, centred.',
    '- Relaxed standing pose (sitting for a baby), body turned slightly three-quarters toward the viewer, warm happy expression, eyes clearly visible.',
    '- Plain, seamless, warm cream-to-soft-peach studio background with a soft contact shadow. No scenery, no props, no other characters.',
    '- Soft, even, flattering light so skin tone, hair, face and clothing are easy to read.',
    '',
    NO_TEXT_RULE,
  ].join('\n');
}

export interface CastInput {
  name: string;
  role: string;
  look: string;
}

export function castSheetPrompt(cast: CastInput[]): string {
  return [
    'Character reference line-up for the supporting characters of a personalised bedtime picture book.',
    '',
    'Image 1 is the reference sheet for the book’s child hero. It is a STYLE AND SCALE ANCHOR ONLY: do NOT draw the hero. Match its rendering style, line quality, shading and lighting exactly.',
    '',
    'DRAW THESE CHARACTERS, left to right, each a single full-body view, evenly spaced and not overlapping (locked designs, follow exactly):',
    ...cast.map((c, i) => `${i + 1}. ${c.name} (${c.role}): ${c.look}`),
    '',
    'If a character is a member of the hero’s family, give them the same skin tone as the hero in image 1 and a family resemblance.',
    'Size each character as described, relative to the hero in image 1.',
    '',
    `ART STYLE: ${HOUSE_STYLE}`,
    '',
    'COMPOSITION: plain, seamless, warm cream background with soft contact shadows. Neutral friendly poses, three-quarters toward the viewer, faces clearly visible. No scenery, no props unless part of a character’s description.',
    '',
    NO_TEXT_RULE,
  ].join('\n');
}

export function scenePrompt(args: {
  hero: string;
  cast: CastInput[];
  hasCastSheet: boolean;
  shot: string;
  scene: string;
  index: number;
  total: number;
  aspectRatio: string;
}): string {
  const { hero, cast, hasCastSheet, shot, scene, index, total, aspectRatio } = args;
  const last = index >= total - 1;
  const castLines = cast.map(
    (c, i) => `- ${c.name} (${c.role})${hasCastSheet ? ` [image 2, character ${i + 1} from the left]` : ''}: ${c.look}`,
  );
  return [
    `Illustration ${index + 1} of ${total} for a personalised children's bedtime picture book.`,
    '',
    `ART STYLE (identical in every picture): ${HOUSE_STYLE}`,
    '',
    'CHARACTERS. They must look IDENTICAL to their attached reference sheets: same face, head shape, proportions, skin tone, hair, clothing, markings and accessories. Do not redesign, restyle, age or recolour them. Show only the characters this scene calls for:',
    `- HERO [image 1]: ${hero}`,
    ...castLines,
    'Family members of HERO share HERO’s skin tone.',
    '',
    `SCENE: ${scene}`,
    `CAMERA / SHOT: ${shot || 'A clear, cinematic picture-book composition that suits the scene.'}`,
    last
      ? 'MOOD: Dim, soft, low-contrast night lighting; muted colours; drowsy, peaceful, very calm.'
      : 'MOOD: Warm and inviting, with clear readable expressions. Never frightening.',
    '',
    'COMPOSITION:',
    `- Single full-bleed ${aspectRatio} portrait illustration of one moment. No panels, borders, frames, vignettes or split screens.`,
    '- Keep the important action, faces and hands in the upper and middle parts of the frame.',
    '- Keep the bottom 15% of the image calm and low-detail because the app fades it softly into the text area.',
    '- Characters large enough to read clearly on a phone screen.',
    '- Gentle and reassuring for a bedtime audience: nothing scary, gory or unsafe.',
    '',
    NO_TEXT_RULE,
  ].join('\n');
}
