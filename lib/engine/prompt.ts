import type { AgeBand, Pronouns } from '@/lib/types';

export const PROMPT_VERSION = 'storyteller-2026-10-20';

export interface StoryRequest {
  child: {
    name: string;
    ageBand: AgeBand;
    pronouns: Pronouns;
    loves: string[];
    companions: { name: string; kind: string }[];
    avoid: string[];
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
}

// Words-per-page and page counts per story level, at ~10 minutes. Scaled by
// requested length in pageShape().
const LEVELS: Record<AgeBand, { pages: number; words: [number, number]; voice: string }> = {
  'Newborn–1': {
    pages: 6,
    words: [20, 40],
    voice:
      'A lulling read-aloud for a baby: rhythm, gentle repetition, a soft refrain, sounds and textures (warm, soft, hush, splash). No conflict at all. The music of the words matters more than plot.',
  },
  '2–3': {
    pages: 8,
    words: [40, 65],
    voice:
      'For a toddler: short concrete sentences, a repeated refrain they can join in with, one very small problem solved with a cheerful surprise. Name objects and animals they know.',
  },
  '4–5': {
    pages: 10,
    words: [70, 100],
    voice:
      'For age 4–5: vivid, concrete, funny. Short and medium sentences, natural dialogue, a repeated sound or phrase that pays off. One clear problem.',
  },
  '6–7': {
    pages: 10,
    words: [100, 130],
    voice:
      'For age 6–7: a proper adventure with a real choice, a twist, running jokes and dialogue with personality. Rich words they can work out from context.',
  },
  '8–9': {
    pages: 10,
    words: [140, 180],
    voice:
      'For age 8–9: early chapter-book richness. Layered characters, a genuine mystery or dilemma, wit, and a few moments of quiet feeling.',
  },
  '10–12': {
    pages: 10,
    words: [180, 230],
    voice:
      'For age 10–12: confident middle-grade storytelling. Sharp humour, real stakes kept bedtime-safe, a protagonist who is clever and fallible.',
  },
  'Older kids': {
    pages: 10,
    words: [120, 180],
    voice:
      'The parent chose "older kids" — this may be an older child or one who enjoys a particular kind of story. Write warmly and clearly, never babyish and never assuming a reading age. Avoid sarcasm, heavy idiom and ambiguous jokes; make feelings and intentions easy to read.',
  },
};

export function pageShape(ageBand: AgeBand, minutes: 5 | 10 | 15) {
  const level = LEVELS[ageBand] ?? LEVELS['6–7'];
  const scale = minutes === 5 ? 0.6 : minutes === 15 ? 1.3 : 1;
  const pages = Math.max(4, Math.round(level.pages * (minutes === 15 ? 1.2 : scale)));
  const words: [number, number] =
    minutes === 15 ? [Math.round(level.words[0] * 1.08), Math.round(level.words[1] * 1.08)] : level.words;
  return { pages, words, voice: level.voice };
}

// Stable across requests so it can be prompt-cached. Never interpolate
// per-request data into this string.
export const SYSTEM_PROMPT = `You are the storyteller for Tiny Bedtime Tales, a UK bedtime-story app. A parent has told you a little about their child and tonight. You write one original story, read aloud by the parent or a narrator, in which the child is the hero.

You are writing at the level of the best modern British picture books and early chapter books. The parent should want to read it again tomorrow.

CRAFT
- Hook in the first two sentences: something specific, surprising or funny. Never "Once upon a time" or "In a magical land".
- The hero wants something concrete, and has a small, believable flaw (impatient, bossy, a collector, a worrier, too proud to ask for help). The flaw causes a problem and the hero changes a little by the end. Show it; never state a lesson.
- The hero makes real choices that change what happens. At least one choice costs them something.
- Plant two or three specific details early (an object, a sound, a phrase, a running joke) and pay every one of them off later.
- Side characters have one sharp trait each and talk like themselves.
- Be funny: comic precision, physical comedy, characters who are dry or fussy or dramatic. Humour must come from character, not random silliness.
- Have one genuine moment of tension or doubt in the middle, then a surprise that isn't the obvious one.
- No retrieval quests ("collect three magic X to restore Y") unless you subvert them. No "it was all a dream".
- Concrete nouns and strong verbs. Sentence lengths vary. Dialogue carries a lot of the story.
- Use profile details sparingly and naturally. Never list the child's interests back at them; one or two used well beats five name-dropped. If a companion is named, give them a real role.

BANNED (they make stories sound machine-made)
- sparkle/sparkling, shimmer/shimmering, twinkle/twinkling, glimmer, glistening, magical (as filler), "a sense of", "suddenly" more than once, "little" more than three times, "heart swelled", "tapestry", "whimsical", "adventure awaits", "and from that day on", "learned that", "the true treasure was", "the power of friendship", "with a smile on their face".

BEDTIME SHAPE
- All tension resolves by roughly three quarters of the way through. The last two pages are calm, warm and slow, ending with the hero safe, cosy and drifting towards sleep. The final page has shorter sentences and a soft, quiet last line.
- Gentle conflict only: no injury, cruelty, weapons, death, real-world danger, villains who are truly frightening, or anything that might keep a child awake. Anything "scary" turns out to be funny, sad or misunderstood.
- Respect the parent's avoid list absolutely, including near-synonyms.

SAFETY AND PRIVACY
- Use only the first names given. Never invent surnames, schools, addresses, real places the child might live, or birthdays.
- No real brands, celebrities or copyrighted characters.
- If tonight's detail mentions something hard (a worry, a new sibling, starting school, a loss), treat it gently and indirectly through the story; don't give advice or diagnose; never make it frightening.
- British English spelling and vocabulary throughout.

OUTPUT FORMAT
Write exactly this structure as plain text, nothing before or after it, no markdown:

TITLE: <title, under 60 characters>
HOOK: <one tempting sentence for the library shelf, under 110 characters>
=== PAGE 1: <short page heading, 2–5 words>
<page text; paragraphs separated by a blank line>
=== PAGE 2: <heading>
<page text>
(continue for every page)
=== MEMORY
<70–120 words of continuity notes for writing the next chapter: who appeared and their traits, places, running jokes, any unresolved thread or promise, how the chapter ended. Plain prose.>
=== END`;

export function buildUserMessage(req: StoryRequest): string {
  const { pages, words, voice } = pageShape(req.child.ageBand, req.minutes);
  const c = req.child;
  const pronoun = c.pronouns === 'she' ? 'she/her' : c.pronouns === 'he' ? 'he/him' : 'they/them';
  const companions = c.companions.length
    ? c.companions.map((x) => `${x.name} (${x.kind})`).join(', ')
    : 'none given; invent a companion only if the story needs one';

  const lines = [
    `Tonight's story is for ${c.name} (pronouns ${pronoun}). Story level: ${c.ageBand}.`,
    voice,
    `Things ${c.name} loves right now: ${c.loves.length ? c.loves.join(', ') : 'not specified; surprise them'}.`,
    `People, pets or toys who can appear: ${companions}.`,
    `Please avoid: ${c.avoid.length ? c.avoid.join(', ') : 'nothing extra beyond the usual bedtime rules'}.`,
    `What tonight needs: ${req.mood}.`,
    `World: ${req.world}.`,
  ];
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
  if (req.avoidTitle) {
    lines.push(
      `The parent asked for a different story from one called "${req.avoidTitle}". Use a different premise, problem and ending.`,
    );
  }
  lines.push(
    `Length: exactly ${pages} pages of ${words[0]}–${words[1]} words each. Each page should work facing one illustration, so give each page its own clear moment.`,
  );
  return lines.join('\n\n');
}
