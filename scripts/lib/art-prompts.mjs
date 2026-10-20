// Prompt builders for the illustration pipeline. Pure functions (no IO) so they
// can be unit-tested and reviewed in --dry-run output.
//
// Principles:
// - The cast `look` strings are LOCKED: they are pasted verbatim into every
//   prompt, and each character's reference sheet is attached as an image with a
//   label saying which character it is.
// - The book `style` and `world` are pasted verbatim too, so every page shares
//   one visual bible.
// - The app owns all typography and UI, so the image must contain no text.

export const NO_TEXT_RULE = [
  'ABSOLUTELY NO TEXT IN THE IMAGE. Do not draw any words, letters, numbers, digits, captions, titles, speech or thought bubbles, labels,',
  'signs, signage, logos, watermarks, signatures, page numbers, borders, frames, panels, buttons or any user-interface elements.',
  'Objects that would normally carry writing (books, clocks, signs, posters, packaging, clothing, tickets, maps) must be blank, abstract,',
  'turned away or out of focus. This rule overrides everything else in this prompt.',
].join(' ');

const MOOD_LIGHT = {
  warm: 'Warm, cosy lamp-light; gentle contrast; inviting.',
  curious: 'Intriguing pools of light leading the eye into the scene; a sense of discovery.',
  funny: 'Bright, playful staging with clear readable expressions and comic timing in the poses.',
  tense: 'Slightly cooler shadows and stronger contrast, but never frightening: this is a bedtime book for young children.',
  wonder: 'Magical glow, soft sparkles of light, awe on the characters’ faces.',
  sleepy: 'Dim, soft, low-contrast night lighting; muted colours; drowsy, peaceful, very calm.',
};

/**
 * Find which cast members appear in a page's picture. Uses the art direction
 * when present (the story text mentions characters who are not in the shot),
 * else the alt text, else the story text.
 */
export function castForPage(book, page, maxCharacters = 4) {
  const source = page.art?.prompt ? [page.art.prompt, page.art.shot] : page.imageAlt ? [page.imageAlt] : [page.text];
  const hay = source.filter(Boolean).join(' \n ').toLowerCase();
  const mentioned = book.cast.filter((c) => {
    const names = new Set([c.id, c.name, c.name?.replace(/^the\s+/i, '')].filter(Boolean).map((s) => s.toLowerCase()));
    return [...names].some((n) => new RegExp(`(^|[^\\p{L}])${escapeRe(n)}([^\\p{L}]|$)`, 'u').test(hay));
  });
  const chosen = mentioned.length ? mentioned : book.cast.slice(0, 1);
  return { chosen: chosen.slice(0, maxCharacters), dropped: chosen.slice(maxCharacters), inferred: !mentioned.length };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function castBlock(members, refIndexByCastId) {
  return members
    .map((c) => {
      const ref = refIndexByCastId.get(c.id);
      return `- ${c.name} (${c.role})${ref ? ` [reference sheet: image ${ref}]` : ''}: ${c.look}`;
    })
    .join('\n');
}

/** Prompt for one character's reference sheet. */
export function refSheetPrompt(book, member, { hasStyleAnchor }) {
  return [
    `Character reference sheet for "${member.name}" (${member.role}) from the children's picture book "${book.title}".`,
    '',
    `CHARACTER (locked design, follow exactly): ${member.look}`,
    '',
    `ART STYLE: ${book.style ?? 'Premium contemporary picture-book illustration.'}`,
    '',
    'COMPOSITION:',
    '- One single full-body view of this one character only, head to toe fully in frame with generous space around them, centred.',
    '- Neutral, relaxed standing pose (or natural resting pose for animals/creatures), body turned slightly three-quarters toward the viewer, friendly calm expression, eyes clearly visible.',
    '- Plain, seamless, warm cream-to-soft-peach studio background with a soft contact shadow. No scenery, no props unless they are part of the character description, no other characters.',
    '- Soft, even, flattering light so colours, proportions, clothing and markings are easy to read.',
    '- If the description mentions an outfit or item that only appears later in the story, show the character’s default look from the start of the story.',
    hasStyleAnchor
      ? '- The attached image is a STYLE ANCHOR from another character in the same book: match its rendering style, line quality, shading and lighting exactly, but do NOT copy that character’s appearance.'
      : null,
    '',
    NO_TEXT_RULE,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/**
 * Prompt for one interior page.
 * @param {object} args
 * @param {any} args.book
 * @param {any} args.page
 * @param {number} args.pageNumber 1-based
 * @param {any[]} args.members cast in this scene
 * @param {Map<string, number>} args.refIndexByCastId image numbers of attached ref sheets
 * @param {number|null} args.previousImageIndex image number of the previous page, if attached
 * @param {string} args.aspectRatio
 */
export function pagePrompt({ book, page, pageNumber, members, refIndexByCastId, previousImageIndex, aspectRatio }) {
  const total = book.pages.length;
  const scene = page.art?.prompt ?? `${page.imageAlt}. (Story text for context, do not write it in the image: ${page.text.slice(0, 600)})`;
  const shot = page.art?.shot ?? 'Choose a clear, cinematic picture-book composition that suits the scene.';
  const lines = [
    `Illustration for page ${pageNumber} of ${total} of the children's bedtime picture book "${book.title}" (ages ${book.ages ?? '3-7'}).`,
    '',
    `ART STYLE (identical on every page): ${book.style ?? 'Premium contemporary picture-book illustration.'}`,
  ];
  if (book.world) lines.push('', `WORLD / SETTING BIBLE: ${book.world}`);
  lines.push(
    '',
    'CHARACTERS IN THIS SCENE. They must look IDENTICAL to their attached reference sheets: same face, head shape, proportions, skin/fur/colours, hair, clothing, markings and accessories. Do not redesign, restyle, age or recolour them. Show only the characters the scene calls for:',
    castBlock(members, refIndexByCastId),
    '',
    `SCENE: ${scene}`,
    `CAMERA / SHOT: ${shot}`,
  );
  if (page.mood && MOOD_LIGHT[page.mood]) lines.push(`MOOD: ${MOOD_LIGHT[page.mood]}`);
  if (previousImageIndex) {
    lines.push(
      '',
      `CONTINUITY: image ${previousImageIndex} is the previous page of this book. Keep the same rendering style, colour palette, lighting logic, setting details and character designs, but create a NEW composition for this page; do not copy its framing.`,
    );
  }
  lines.push(
    '',
    'COMPOSITION:',
    `- Single full-bleed ${aspectRatio} portrait illustration of one moment. No panels, borders, frames, vignettes or split screens.`,
    '- Keep the important action, faces and hands in the upper and middle parts of the frame.',
    '- Keep the bottom 15% of the image calm and low-detail (soft floor, ground, bedding or shadow with no faces, hands, key objects or busy pattern) because the app fades it softly into the text area.',
    '- Characters should be large enough to read clearly on a phone screen.',
    '- Gentle and reassuring for a bedtime audience: nothing scary, gory or unsafe.',
    '',
    NO_TEXT_RULE,
  );
  return lines.join('\n');
}

/** Prompt for the cover. */
export function coverPrompt({ book, members, refIndexByCastId, styleImageIndexes, aspectRatio }) {
  const lines = [
    `Front cover illustration for the children's bedtime picture book "${book.title}" (ages ${book.ages ?? '3-7'}). The app will typeset the title itself; you must NOT draw it.`,
    '',
    `ART STYLE (identical to the interior pages): ${book.style ?? 'Premium contemporary picture-book illustration.'}`,
  ];
  if (book.world) lines.push('', `WORLD / SETTING BIBLE: ${book.world}`);
  lines.push(
    '',
    `STORY: ${book.blurb ?? ''} ${book.hook ? `Hook: ${book.hook}` : ''}`.trim(),
    '',
    'CHARACTERS (must match their attached reference sheets exactly; do not redesign them):',
    castBlock(members, refIndexByCastId),
  );
  if (styleImageIndexes.length) {
    lines.push('', `STYLE MATCH: image(s) ${styleImageIndexes.join(', ')} are interior pages of this book. Match their rendering, palette and lighting; do not copy their compositions.`);
  }
  if (book.coverAlt) lines.push('', `COVER BRIEF: ${book.coverAlt}`);
  lines.push(
    '',
    'COMPOSITION:',
    `- Single full-bleed ${aspectRatio} portrait hero image: the main character(s) large, appealing and clearly readable, mid-action or in an iconic moment from the story, with a strong silhouette and a warm glowing focal point.`,
    '- Leave the TOP 30% of the image as calm, simple, uncluttered space (open sky, soft gradient, gentle bokeh or plain wall) with no faces or important detail, so a title can be overlaid there and stay legible.',
    '- Keep the bottom 10% calm too. Characters sit in the middle-to-lower-middle of the frame.',
    '- Inviting, magical and cosy: it should make a child want to open the book at bedtime.',
    '',
    NO_TEXT_RULE,
  );
  return lines.join('\n');
}
