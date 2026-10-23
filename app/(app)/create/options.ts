import type { AgeBand } from '@/lib/types';

// Story worlds. `ages` is who a world suits best (young ≈ 0–5, middle ≈ 6–9,
// older ≈ 10+); `matches` are interests that pull it to the front for a child.
// Tiles live in public/art/worlds/<id>.webp (scripts/make-world-tiles.sh).
type AgeGroup = 'young' | 'middle' | 'older';
export const WORLDS = [
  { id: 'home', label: 'Magic at home', tint: '#f2b45a', ages: ['young', 'middle', 'older'], matches: ['toys', 'home', 'pets', 'lego'], prompt: 'their own home at night, where something magical and surprising happens' },
  { id: 'trains', label: 'Trains & diggers', tint: '#e0665c', ages: ['young'], matches: ['trains', 'diggers', 'tractors', 'cars', 'trucks', 'vehicles', 'buses'], prompt: 'a busy world of trains, diggers, tractors and friendly machines' },
  { id: 'animals', label: 'Animal friends', tint: '#f09a4a', ages: ['young', 'middle'], matches: ['animals', 'pets', 'dogs', 'cats', 'horses', 'farm', 'bugs'], prompt: 'a woodland, farm or jungle full of talking animals' },
  { id: 'ocean', label: 'Under the sea', tint: '#3fb6c9', ages: ['young', 'middle'], matches: ['mermaids', 'sea', 'ocean', 'fish', 'whales', 'swimming'], prompt: 'deep under the sea' },
  { id: 'dinosaurs', label: 'Dinosaurs', tint: '#5fb36b', ages: ['young', 'middle'], matches: ['dinosaurs', 'dinos', 'fossils'], prompt: 'a world where dinosaurs still roam' },
  { id: 'unicorns', label: 'Unicorns & fairies', tint: '#e58bc9', ages: ['young', 'middle'], matches: ['unicorns', 'fairies', 'magic', 'rainbows', 'mermaids'], prompt: 'a hidden land of unicorns, fairies and enchanted woods' },
  { id: 'dragons', label: 'Dragons', tint: '#4fa88f', ages: ['young', 'middle', 'older'], matches: ['dragons', 'magic', 'knights'], prompt: 'a land of dragons' },
  { id: 'space', label: 'Space', tint: '#6d7cf2', ages: ['young', 'middle', 'older'], matches: ['space', 'planets', 'rockets', 'aliens', 'stars', 'astronauts'], prompt: 'outer space' },
  { id: 'pirates', label: 'Pirates', tint: '#c99a56', ages: ['young', 'middle'], matches: ['pirates', 'treasure', 'boats', 'ships'], prompt: 'the high seas with pirates' },
  { id: 'royal', label: 'Castles & kingdoms', tint: '#b58be8', ages: ['young', 'middle'], matches: ['princesses', 'princes', 'castles', 'knights', 'royal'], prompt: 'a kingdom of castles, princesses, princes and knights' },
  { id: 'heroes', label: 'Superheroes', tint: '#e8554f', ages: ['young', 'middle', 'older'], matches: ['superheroes', 'heroes'], prompt: 'a city that needs a superhero' },
  { id: 'football', label: 'Football & sport', tint: '#57b06a', ages: ['middle', 'older'], matches: ['football', 'sport', 'sports', 'running', 'gymnastics', 'dancing', 'rugby', 'cricket'], prompt: 'a world where a big match or competition is the adventure' },
  { id: 'robots', label: 'Robots & inventions', tint: '#7fb7d6', ages: ['middle', 'older'], matches: ['robots', 'inventing', 'building', 'science', 'lego', 'gadgets', 'coding'], prompt: 'a world of robots and brilliant inventions' },
  { id: 'mystery', label: 'Mysteries & detectives', tint: '#c9a35b', ages: ['middle', 'older'], matches: ['mysteries', 'puzzles', 'detectives', 'secrets', 'codes'], prompt: 'a gentle mystery with clues to follow and a puzzle to solve' },
  { id: 'magicschool', label: 'Magic school', tint: '#9a7be0', ages: ['middle', 'older'], matches: ['magic', 'wizards', 'witches', 'spells'], prompt: 'a school for young witches and wizards' },
  { id: 'other', label: 'Something else', tint: '#a787e8', ages: ['young', 'middle', 'older'], matches: [], prompt: '' },
] as const satisfies readonly { id: string; label: string; tint: string; ages: readonly AgeGroup[]; matches: readonly string[]; prompt: string }[];

export type World = (typeof WORLDS)[number];

export function ageGroup(band: AgeBand | undefined): AgeGroup {
  if (!band || ['Newborn–1', '2–3', '4–5'].includes(band)) return 'young';
  if (['6–7', '8–9'].includes(band)) return 'middle';
  return 'older';
}

/** Worlds in the order to suggest them for a child: their interests first, then what suits their age. */
export function suggestWorlds(child?: { ageBand: AgeBand; loves: string[] } | null): World[] {
  const group = ageGroup(child?.ageBand);
  const loves = (child?.loves ?? []).map((l) => l.toLowerCase());
  const score = (w: World) => {
    if (w.id === 'other') return -100;
    const interest = w.matches.some((m) => loves.some((l) => l.includes(m) || m.includes(l))) ? 10 : 0;
    const age = (w.ages as readonly string[]).includes(group) ? 2 : -4;
    return interest + age;
  };
  return [...WORLDS].map((w, i) => ({ w, s: score(w) - i * 0.01 })).sort((a, b) => b.s - a.s).map((x) => x.w);
}

export const worldTile = (id: string) => `/art/worlds/${id}.webp`;

export type WorldId = (typeof WORLDS)[number]['id'];

export const MOODS = [
  { id: 'adventure', label: 'A big adventure', note: 'Daring, exciting, a proper quest', prompt: 'an exciting adventure with a daring moment' },
  { id: 'funny', label: 'Something silly', note: 'Giggles guaranteed', prompt: 'something really funny and silly, full of comic moments' },
  { id: 'cosy', label: 'Calm and cosy', note: 'Gentle from start to finish', prompt: 'a calm, cosy, gentle story with very little tension' },
  { id: 'brave', label: 'Feeling brave', note: 'For a wobbly moment', prompt: 'a story that quietly helps a child feel brave about something new or worrying' },
  { id: 'bigday', label: 'Big day tomorrow', note: 'School trip, party, first day…', prompt: 'a story that makes a big day tomorrow feel exciting rather than worrying' },
  { id: 'mystery', label: 'A mystery', note: 'Clues, twists and a reveal', prompt: 'a gentle mystery with clues the child can spot and a satisfying reveal' },
] as const;

export const AGE_OPTIONS: { value: AgeBand; label: string }[] = [
  { value: 'Newborn–1', label: 'Baby' },
  { value: '2–3', label: '2–3' },
  { value: '4–5', label: '4–5' },
  { value: '6–7', label: '6–7' },
  { value: '8–9', label: '8–9' },
  { value: '10–12', label: '10–12' },
  { value: 'Older kids', label: 'Older kids' },
];

export const LOVES = ['Dinosaurs', 'Football', 'Unicorns', 'Trains', 'Drawing', 'Space', 'Animals', 'Dancing', 'Diggers', 'Magic', 'Baking', 'Superheroes', 'Mermaids', 'Robots', 'Bugs', 'Music'];

export const AVOIDS = ['Spiders', 'The dark', 'Monsters', 'Storms', 'Getting lost', 'Loud noises', 'Being alone', 'Doctors'];

export const LENGTHS = [
  { value: 5, label: 'Short', note: '5 min' },
  { value: 10, label: 'Bedtime', note: '10 min' },
  { value: 15, label: 'Long', note: '15 min' },
] as const;

export const PERSONALITY = ['Brave', 'Shy', 'Curious', 'Cheeky', 'Kind', 'Bossy', 'A worrier', 'Silly', 'Determined', 'Dreamy', 'Chatty', 'Thoughtful', 'Energetic', 'Gentle'];

export const LAUGHS = ['Silly noises', 'Things going wrong', 'Animals acting like people', 'Burps and bottoms', 'Grown-ups being silly', 'Funny voices', 'Surprises', 'Silly words'];
