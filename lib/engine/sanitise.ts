import type { AgeBand, Pronouns } from '@/lib/types';
import { pickShape, STORY_SHAPES, type StoryRequest } from './prompt';

export const AGE_BANDS: AgeBand[] = ['Newborn–1', '2–3', '4–5', '6–7', '8–9', '10–12', 'Older kids'];
const PRONOUNS: Pronouns[] = ['she', 'he', 'they'];
const BAD = /\b(?:sex(?:ual)?|porn\w*|nude|naked|suicide|self[- ]?harm|murder|torture|rape|cocaine|heroin|gun|knife|kill\w*|blood\w*)\b/i;

export class RequestError extends Error {}

/** Strip anything that looks like contact or location detail. */
export function scrub(value: unknown, max = 200): string {
  let s = String(value ?? '').slice(0, max);
  s = s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '');
  s = s.replace(/(?:\+44\s?\d|0\d)[\d\s()-]{8,}/g, '');
  s = s.replace(/\b(?:GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/gi, '');
  s = s.replace(/https?:\/\/\S+|www\.\S+/gi, '');
  s = s.replace(/\b\d{5,}\b/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

function firstName(value: unknown): string {
  const first = String(value ?? '').trim().split(/\s+/)[0] ?? '';
  return first.replace(/[^\p{L}'’-]/gu, '').slice(0, 24);
}

function list(value: unknown, maxItems: number, maxLen = 40): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => scrub(v, maxLen)).filter(Boolean).slice(0, maxItems);
}

export function parseStoryRequest(body: unknown): StoryRequest {
  const b = (body ?? {}) as Record<string, any>;
  const c = (b.child ?? {}) as Record<string, any>;
  const name = firstName(c.name);
  if (!name) throw new RequestError('Add a first name or nickname for the hero.');

  const req: StoryRequest = {
    child: {
      name,
      ageBand: AGE_BANDS.includes(c.ageBand) ? c.ageBand : '4–5',
      pronouns: PRONOUNS.includes(c.pronouns) ? c.pronouns : 'they',
      loves: list(c.loves, 6),
      companions: (Array.isArray(c.companions) ? c.companions : [])
        .map((x: any) => ({ name: firstName(x?.name), kind: scrub(x?.kind, 30) || 'friend', note: scrub(x?.note, 80) }))
        .filter((x: { name: string }) => x.name)
        .slice(0, 4),
      avoid: list(c.avoid, 10),
      personality: list(c.personality, 4, 24),
      laughs: list(c.laughs, 4, 40),
      comfort: scrub(c.comfort, 60),
      learning: scrub(c.learning, 80),
    },
    mood: scrub(b.mood, 80) || 'a cosy adventure',
    world: scrub(b.world, 80) || 'somewhere surprising',
    minutes: b.minutes === 5 || b.minutes === 15 ? b.minutes : 10,
    todayDetail: scrub(b.todayDetail, 240),
    memory: scrub(b.memory, 1400),
    chapter: Math.max(1, Math.min(99, Number(b.chapter) || 1)),
    avoidTitle: scrub(b.avoidTitle, 120),
    history: (Array.isArray(b.history) ? b.history : [])
      .slice(0, 10)
      .map((h: any) => ({
        title: scrub(h?.title, 80),
        premise: scrub(h?.premise, 200),
        shape: STORY_SHAPES.some((s) => s.id === h?.shape) ? String(h.shape) : '',
      }))
      .filter((h: { title: string }) => h.title),
    shape: '',
    illustrated: b.illustrated === true,
  };
  req.shape = pickShape(req.history.map((h) => h.shape).filter(Boolean));

  if (BAD.test(JSON.stringify(req))) {
    throw new RequestError('Let’s keep tonight’s story right for bedtime. Try different words?');
  }
  return req;
}
