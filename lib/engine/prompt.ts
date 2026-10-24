import type { AgeBand, Pronouns } from '@/lib/types';

export const PROMPT_VERSION = 'storyteller-2026-10-24';

export interface StoryRequest {
  child: {
    name: string;
    ageBand: AgeBand;
    pronouns: Pronouns;
    loves: string[];
    companions: { name: string; kind: string; note: string }[];
    avoid: string[];
    personality: string[];
    laughs: string[];
    comfort: string;
    learning: string;
  };
  mood: string;
  world: string;
  minutes: 5 | 10 | 15;
  /** Something that really happened today, in the parent's words. */
  todayDetail: string;
  /** Present when continuing a series. */
  memory: string;
  chapter: number;
  /** Present when regenerating: the title to steer away from. */
  avoidTitle: string;
  /** This child's recent stories, newest first, so tonight's is different. */
  history: { title: string; premise: string; shape: string }[];
  /** Chosen server-side from STORY_SHAPES. */
  shape: string;
  /** Tonight's story gets pictures: the engine adds CAST and ART lines. */
  illustrated: boolean;
}

// Story structures the engine rotates through so a child's library never
// settles into one formula. Picked server-side, skipping recent ones.
export const STORY_SHAPES: { id: string; brief: string }[] = [
  { id: 'visitor', brief: 'An unexpected visitor turns up needing help, and isn’t what they first seem.' },
  { id: 'swap', brief: 'The hero swaps places or jobs with someone (or something) for one night.' },
  { id: 'rule', brief: 'One ordinary rule of the world flips for a night (things fall up, toys talk, colours swap) and the hero has to work with it.' },
  { id: 'size', brief: 'The hero becomes tiny or enormous, and the familiar world turns into an adventure.' },
  { id: 'contest', brief: 'The hero enters a contest or race for the wrong reason and discovers a better one.' },
  { id: 'mixup', brief: 'A funny misunderstanding: everyone has got something completely wrong, and the hero untangles it.' },
  { id: 'runaway', brief: 'Something or someone has run away, and the hero has to understand why before they can bring it home.' },
  { id: 'door', brief: 'A hidden door or way in, somewhere very ordinary, leads to a place with one small problem only the hero can solve.' },
  { id: 'job', brief: 'The hero is put in charge of something important for one night, and it immediately gets complicated.' },
  { id: 'wish', brief: 'A wish comes true far too literally, and the hero has to un-wish it cleverly.' },
  { id: 'invention', brief: 'The hero makes or builds something that works brilliantly, then far too well.' },
  { id: 'journey', brief: 'A night-time journey somewhere and home again before morning, with one surprise on the way.' },
  { id: 'friend', brief: 'The hero befriends someone everyone else has misjudged.' },
  { id: 'promise', brief: 'The hero made a promise, and keeping it turns out to be much harder (and funnier) than expected.' },
  { id: 'copycat', brief: 'Something starts copying the hero exactly, which is funny until it isn’t, then funny again.' },
  { id: 'show', brief: 'The hero has to put on a show, party or celebration for someone, with everything going wrong first.' },
];

export function pickShape(recent: string[], random = Math.random): string {
  const recentSet = new Set(recent.slice(0, 8));
  const pool = STORY_SHAPES.filter((s) => !recentSet.has(s.id));
  const from = pool.length ? pool : STORY_SHAPES;
  return from[Math.floor(random() * from.length)].id;
}

// Per-level writing rules. Sentence and word limits are hard constraints and
// are checked after generation (see readability.ts).
export const LEVELS: Record<
  AgeBand,
  { pages: number; words: [number, number]; avgSentence: number; maxSentence: number; rules: string }
> = {
  'Newborn–1': {
    pages: 6,
    words: [20, 40],
    avgSentence: 6,
    maxSentence: 10,
    rules:
      'A lulling read-aloud for a baby. Rhythm and repetition, a soft refrain on every page, sounds and textures (warm, soft, hush, splash, pat-pat). Only the simplest everyday words. No conflict at all. The music of the words matters more than plot.',
  },
  '2–3': {
    pages: 8,
    words: [35, 55],
    avgSentence: 7,
    maxSentence: 11,
    rules:
      'For a toddler. Very short sentences. Only words a two- or three-year-old hears every day (dog, splash, bed, moon, big, sleepy). A repeated refrain they can join in with on most pages. Funny sounds and animal noises. One tiny problem fixed with a happy surprise. No wordplay, no irony.',
  },
  '4–5': {
    pages: 10,
    words: [50, 80],
    avgSentence: 9,
    maxSentence: 15,
    rules:
      'For age 4–5. Use words a four-year-old uses at home and at nursery. At most two "new" words in the whole story, each made obvious by what happens. Sentences are short and simple, mostly one idea each. Dialogue lines are short. Humour is physical and visual: silly sounds, things going wrong, animals acting like people, repetition with a twist. No grown-up wit, sarcasm, irony, idioms or posh-sounding characters (avoid words like irregular, frightfully, tragic, catastrophe, magnificent, peculiar, astonishing). One clear problem.',
  },
  '6–7': {
    pages: 10,
    words: [80, 115],
    avgSentence: 11,
    maxSentence: 18,
    rules:
      'For age 6–7. Words a confident six-year-old knows, plus a handful of fun bigger words they can work out from context. Mostly short sentences with some longer ones for rhythm. Humour can include simple wordplay, funny voices and characters who take themselves too seriously, but every joke must land for a child, not just the grown-up. A real choice and a twist.',
  },
  '8–9': {
    pages: 10,
    words: [130, 170],
    avgSentence: 13,
    maxSentence: 24,
    rules:
      'For age 8–9. Early chapter-book richness: layered characters, a genuine mystery or dilemma, wit, a few moments of quiet feeling. Richer vocabulary is fine when it is vivid rather than fancy.',
  },
  '10–12': {
    pages: 10,
    words: [170, 220],
    avgSentence: 15,
    maxSentence: 28,
    rules:
      'For age 10–12. Confident middle-grade storytelling: sharp humour, real stakes kept bedtime-safe, a protagonist who is clever and fallible.',
  },
  'Older kids': {
    pages: 10,
    words: [110, 160],
    avgSentence: 11,
    maxSentence: 18,
    rules:
      'The parent chose "older kids": this may be an older child, or one who enjoys a particular kind of story. Write warmly and clearly, never babyish, never assuming a reading age. Plain, literal language: avoid sarcasm, idioms and jokes that rely on reading between the lines. Make feelings and intentions easy to follow.',
  },
};

/** Pictures in an illustrated story: one per two pages, plus the last page's own. */
export const pictureCount = (pages: number) => Math.ceil(pages / 2) + (pages % 2 === 0 ? 1 : 0);

export function pageShape(ageBand: AgeBand, minutes: 5 | 10 | 15) {
  const level = LEVELS[ageBand] ?? LEVELS['6–7'];
  const pages = minutes === 5 ? Math.max(4, Math.round(level.pages * 0.6)) : minutes === 15 ? Math.round(level.pages * 1.2) : level.pages;
  const words: [number, number] =
    minutes === 15 ? [Math.round(level.words[0] * 1.08), Math.round(level.words[1] * 1.08)] : level.words;
  return { ...level, pages, words };
}

// Stable across requests so it can be prompt-cached. Never interpolate
// per-request data into this string.
export const SYSTEM_PROMPT = `You are the storyteller for Tiny Bedtime Tales, a UK bedtime-story app. A parent has told you about their child and tonight. You write one original story, read aloud by the parent or a narrator, in which the child is the hero.

You write at the level of the best modern British picture books and early chapter books. The parent should want to read it again tomorrow, and the child should understand every line of it.

STORY LEVEL COMES FIRST
- The story level's rules on vocabulary and sentence length are hard limits. A story that is clever but too hard for the child has failed.
- Write for the child's ears, not the grown-up's. Every joke must make the child laugh. Grown-up wit, irony and posh, fussy vocabulary belong only at age 8 and above.
- Picture-book authors for young children use plain words in surprising combinations. Be simple, not dull.

CRAFT
- Hook in the first two sentences: something specific, surprising or funny. Never "Once upon a time" or "In a magical land".
- The hero wants something concrete, and has a small, believable flaw that fits their personality. The flaw causes a problem and the hero changes a little by the end. Show it; never state a lesson.
- The hero makes real choices that change what happens. At least one choice costs them something.
- Plant two or three specific details early (an object, a sound, a phrase, a running joke) and pay every one of them off later.
- Side characters have one clear trait each and talk like themselves.
- Use the child's personality and what makes them laugh to shape the hero's voice and the jokes.
- Have one moment of tension or doubt in the middle, then a surprise that isn't the obvious one.
- Follow tonight's story shape. No "collect three magic things" quests. No "it was all a dream".
- Concrete nouns and strong verbs. Dialogue carries a lot of the story.
- Use profile details sparingly and naturally. Never list the child's interests back at them; one or two used well beats five name-dropped. If a companion is named, give them a real role.

FRESHNESS
- You may be shown this child's previous stories. Tonight's must feel completely different: a new premise, new central object or creature, new kind of problem, new title pattern and a different ending image. Do not reuse names you invented before unless this is a continuing chapter.

BANNED (they make stories sound machine-made)
- sparkle/sparkling, shimmer/shimmering, twinkle/twinkling, glimmer, glistening, magical (as filler), "a sense of", "suddenly" more than once, "little" more than three times, "heart swelled", "tapestry", "whimsical", "adventure awaits", "and from that day on", "learned that", "the true treasure was", "the power of friendship", "with a smile on their face".

BEDTIME SHAPE
- All tension resolves by roughly three quarters of the way through. The last two pages are calm, warm and slow, ending with the hero safe, cosy and drifting towards sleep. The final page has the shortest sentences in the story and a soft, quiet last line.
- Gentle conflict only: no injury, cruelty, weapons, death, real-world danger, villains who are truly frightening, or anything that might keep a child awake. Anything "scary" turns out to be funny, sad or misunderstood.
- Respect the parent's avoid list absolutely, including near-synonyms.

SAFETY AND PRIVACY
- Use only the first names given. Never invent surnames, schools, addresses, real places the child might live, or birthdays.
- No real brands, celebrities or copyrighted characters.
- If tonight's detail mentions something hard (a worry, a new sibling, starting school, a loss), treat it gently and indirectly through the story; don't give advice or diagnose; never make it frightening.
- British English spelling and vocabulary throughout.

PICTURES (only when tonight's request says the story is illustrated)
- An illustrator draws one picture for every two pages. You direct them with CAST and ART lines, which the reader never sees.
- The illustrator already knows exactly how the hero looks and draws them in cosy pyjamas. In CAST and ART lines, call the hero HERO, never by name, and never describe HERO's face, skin, hair or body. Mention anything extra HERO is holding or wearing in that picture (a crown, a torch).
- CAST lines: one for each character other than HERO who appears in more than one picture, at most three. Give each a fixed look the illustrator can repeat exactly: what they are, size next to HERO, colours, clothing and one distinctive feature, 15–35 words. For real people from the child's life (family, friends), describe only age, build and clothes, never skin, hair or face.
- ART lines: pages 1, 3, 5 and so on start with one ART line, before the page text, for the single picture that faces that page and the next. The last page always gets its own ART line too, for the sleepy final picture. Write the camera and framing (one short sentence), then a | and the scene in 30–60 words: who is in it, what they are doing, where, the light and the feeling. Show one clear moment a child can read at a glance, taken from the first of the two pages.
- Pictures are never frightening, and contain no writing, signs or labels. The last page's picture is calm, dim and sleepy: HERO safe and drifting off.

OUTPUT FORMAT
Write exactly this structure as plain text, nothing before or after it, no markdown:

TITLE: <title, under 60 characters>
HOOK: <one tempting sentence for the library shelf, under 110 characters, in words the child would understand>
PREMISE: <one plain sentence saying what happens, for our records>
CAST: <name> | <what they are, 2–5 words> | <fixed look>   (illustrated stories only; one line per character)
=== PAGE 1: <short page heading, 2–5 words>
ART: <camera and framing> | <scene>   (illustrated stories only; pages 1, 3, 5…)
<page text; paragraphs separated by a blank line>
=== PAGE 2: <heading>
<page text>
(continue for every page)
=== MEMORY
<70–120 words of continuity notes for writing the next chapter: who appeared and their traits, places, running jokes, any unresolved thread or promise, how the chapter ended. Plain prose.>
=== END`;

export function buildUserMessage(req: StoryRequest): string {
  const level = pageShape(req.child.ageBand, req.minutes);
  const c = req.child;
  const pronoun = c.pronouns === 'she' ? 'she/her' : c.pronouns === 'he' ? 'he/him' : 'they/them';
  const companions = c.companions.length
    ? c.companions.map((x) => `${x.name} (${x.kind}${x.note ? `: ${x.note}` : ''})`).join('; ')
    : 'none given; invent a companion only if the story needs one';
  const shape = STORY_SHAPES.find((s) => s.id === req.shape);

  const lines = [
    `Tonight's story is for ${c.name} (pronouns ${pronoun}). Story level: ${c.ageBand}.`,
    `STORY LEVEL RULES (hard limits): ${level.rules} Average sentence length at most ${level.avgSentence} words; no sentence longer than ${level.maxSentence} words.`,
  ];
  if (c.personality.length) lines.push(`${c.name}'s personality: ${c.personality.join(', ')}. Let the hero sound and act like this, and draw the hero's small flaw from it.`);
  if (c.laughs.length) lines.push(`What makes ${c.name} laugh: ${c.laughs.join(', ')}. Build the jokes from this.`);
  lines.push(`Things ${c.name} loves right now: ${c.loves.length ? c.loves.join(', ') : 'not specified; surprise them'}.`);
  lines.push(`People, pets or toys who can appear: ${companions}.`);
  if (c.comfort) lines.push(`Bedtime comfort toy: ${c.comfort}. It can make a small, warm appearance at the end.`);
  if (c.learning) lines.push(`Something ${c.name} is working on at the moment: ${c.learning}. Only weave it in if it fits naturally, and never as a lesson.`);
  lines.push(`Please avoid: ${c.avoid.length ? c.avoid.join(', ') : 'nothing extra beyond the usual bedtime rules'}.`);
  lines.push(`What tonight needs: ${req.mood}.`);
  lines.push(`World: ${req.world}.`);
  if (shape && !req.memory) lines.push(`Tonight's story shape: ${shape.brief}`);

  if (req.todayDetail) {
    lines.push(
      `Something from ${c.name}'s real day, in the parent's words: "${req.todayDetail}". Weave it in so it feels personal, but don't make the story only about it.`,
    );
  }
  if (req.memory) {
    lines.push(
      `This is chapter ${req.chapter} of an ongoing series. Continuity notes from the previous chapter:\n${req.memory}\nContinue the same world and characters. Call back to something from last time early on, then give this chapter its own complete problem and resolution. It must still make sense on its own.`,
    );
  }
  if (req.history.length) {
    const list = req.history.map((h) => `- "${h.title}": ${h.premise}`).join('\n');
    lines.push(
      `${c.name}'s recent stories (newest first). ${req.memory ? 'Apart from continuing the series, make' : 'Make'} tonight's feel completely different from all of these:\n${list}`,
    );
  }
  if (req.avoidTitle) {
    lines.push(`The parent asked for a different story from one called "${req.avoidTitle}". Use a different premise, problem and ending.`);
  }
  if (req.illustrated) {
    lines.push(
      `This story is illustrated: ${pictureCount(level.pages)} pictures, one facing pages 1–2, the next facing pages 3–4, and so on, plus a sleepy one on the last page. Follow the PICTURES rules: CAST lines after PREMISE, and an ART line at the start of every odd-numbered page and the last page.`,
    );
  }
  lines.push(
    `Length: exactly ${level.pages} pages of ${level.words[0]}–${level.words[1]} words each. Each page should work facing one illustration, so give each page its own clear moment.`,
  );
  return lines.join('\n\n');
}
