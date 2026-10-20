import type { AgeBand } from '@/lib/types';

export const WORLDS = [
  { id: 'dinosaurs', label: 'Dinosaurs', emoji: '🦕', tint: '#5fb36b', prompt: 'a world where dinosaurs still roam' },
  { id: 'dragons', label: 'Dragons', emoji: '🐉', tint: '#e0665c', prompt: 'a land of dragons' },
  { id: 'space', label: 'Space', emoji: '🚀', tint: '#6d7cf2', prompt: 'outer space' },
  { id: 'pirates', label: 'Pirates', emoji: '🏴‍☠️', tint: '#c99a56', prompt: 'the high seas with pirates' },
  { id: 'royal', label: 'Castles', emoji: '👑', tint: '#e58bc9', prompt: 'a kingdom of castles, princesses and princes' },
  { id: 'animals', label: 'Animals', emoji: '🦊', tint: '#f09a4a', prompt: 'a woodland or jungle full of talking animals' },
  { id: 'heroes', label: 'Superheroes', emoji: '🦸', tint: '#e8554f', prompt: 'a city that needs a superhero' },
  { id: 'ocean', label: 'Under the sea', emoji: '🐙', tint: '#3fb6c9', prompt: 'deep under the sea' },
  { id: 'other', label: 'Something else', emoji: '✨', tint: '#a787e8', prompt: '' },
] as const;

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
