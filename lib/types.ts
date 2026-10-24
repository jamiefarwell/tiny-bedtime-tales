// Shared content model. A Ready-to-Read book and a personalised story use the
// same page shape, so one reader engine plays both.

/** Word-level narration timing, in seconds, against the page's `text`. */
export interface WordTiming {
  /** Index of the word in `tokenise(page.text)` order. */
  w: number;
  start: number;
  end: number;
}

export interface Page {
  heading: string;
  /** Story text. Paragraphs separated by a blank line. */
  text: string;
  /** Public path to clean artwork (no text baked in), or null while pending. */
  image: string | null;
  imageAlt: string;
  /** Public path to this page's narration file, or null to use device voice. */
  audio: string | null;
  timings: WordTiming[] | null;
  /** Drives the placeholder palette and the wind-down dimming curve. */
  mood?: 'warm' | 'curious' | 'funny' | 'tense' | 'wonder' | 'sleepy';
  /** Art direction for the illustration pipeline. Never rendered in the app. */
  art?: { shot: string; prompt: string };
  /** Personalised stories: server signature over `art`, so only scenes our storyteller wrote get drawn. */
  artSig?: string;
}

export interface CastMember {
  id: string;
  name: string;
  role: string;
  /** Locked visual description, reused verbatim in every illustration prompt. */
  look: string;
}

export interface Book {
  slug: string;
  title: string;
  ages: string;
  minutes: number;
  tags: string[];
  blurb: string;
  /** One-line hook for shelves. */
  hook: string;
  cover: string | null;
  coverAlt: string;
  /** Hex colours used for covers and art-pending placeholders. */
  palette: { sky: string; glow: string; ink: string };
  artStatus: 'final' | 'interim' | 'pending';
  narrator?: { voice: string; notes: string };
  cast: CastMember[];
  world?: string;
  style?: string;
  pages: Page[];
}

export type AgeBand = 'Newborn–1' | '2–3' | '4–5' | '6–7' | '8–9' | '10–12' | 'Older kids';
export type Pronouns = 'she' | 'he' | 'they';

export interface ChildProfile {
  id: string;
  name: string;
  ageBand: AgeBand;
  pronouns: Pronouns;
  loves: string[];
  /** First names only: pets, friends, siblings, toys. */
  companions: { name: string; kind: string; note?: string }[];
  avoid: string[];
  /** Up to three words for who they are; shapes the hero's voice and flaw. */
  personality?: string[];
  /** What makes them laugh; shapes the jokes. */
  laughs?: string[];
  /** Bedtime comfort toy, e.g. "Bun, a floppy grey rabbit". */
  comfort?: string;
  /** Something they're working on, e.g. "riding without stabilisers". */
  learning?: string;
  /** How they appear in illustrated stories (see lib/heroLook.ts). Optional. */
  look?: import('./heroLook').HeroLook;
  createdAt: number;
}

export interface PersonalStory {
  id: string;
  childId: string;
  title: string;
  hook: string;
  /** One-line summary the engine uses to avoid repeating itself. */
  premise?: string;
  /** Story structure the engine used (see STORY_SHAPES). */
  shape?: string;
  world: string;
  mood: string;
  minutes: number;
  pages: Page[];
  /** Compact continuity memory for the next chapter. */
  memory: string;
  seriesId: string;
  chapter: number;
  model: string;
  createdAt: number;
  /** Pictures starring the child (see lib/pictures.ts). Images live on the device, keyed by story id. */
  illustrated?: boolean;
  /** Recurring characters other than the hero, drawn once on a cast sheet. */
  cast?: { name: string; role: string; look: string }[];
  castSig?: string;
}
