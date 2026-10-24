import sharp from 'sharp';
import type { AgeBand, Pronouns } from '@/lib/types';
import { AGE_BANDS } from '@/lib/engine/sanitise';
import { HAIR_COLOURS, HAIR_STYLES, SKIN_TONES, type HeroLook } from '@/lib/heroLook';
import { castSheetPrompt, heroDescription, heroSheetPrompt, scenePrompt, type CastInput } from '@/lib/art/prompts';
import { ImageError, generateImage, illustratorConnected, type ImagePart } from '@/lib/server/gemini';
import { castSigned, sceneSigned } from '@/lib/server/artSign';
import { cloudEnabled } from '@/lib/server/config';
import { currentUser } from '@/lib/server/supabase';

// Draws the pictures for "Starring your child":
//   hero  – the child's reference sheet, from the look palette (no free text)
//   cast  – one line-up of the story's other recurring characters
//   scene – one picture facing two pages
// Cast and scene directions must carry the story route's signature.
// Returns image/webp bytes; the client keeps them on the device.

export const runtime = 'nodejs';
export const maxDuration = 300;

const SCENE_ASPECT = '4:5';

// Per-instance soft limits for the preview, like /api/story.
type Hits = Map<string, { n: number; reset: number }>;
const hits: Hits = (globalThis as any).__tbtArtHits || ((globalThis as any).__tbtArtHits = new Map());
function over(key: string, limit: number, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return false;
  }
  e.n += 1;
  return e.n > limit;
}

class Bad extends Error {}

const ID = /^[a-z0-9]{6,40}$/i;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

function look(v: any): HeroLook {
  const l: HeroLook = {
    skin: String(v?.skin ?? ''),
    hair: String(v?.hair ?? ''),
    style: String(v?.style ?? ''),
    glasses: v?.glasses === true,
    freckles: v?.freckles === true,
  };
  if (!SKIN_TONES.some((s) => s.id === l.skin) || !HAIR_COLOURS.some((h) => h.id === l.hair) || !HAIR_STYLES.some((h) => h.id === l.style)) {
    throw new Bad('Unknown look');
  }
  return l;
}
const ageBand = (v: unknown): AgeBand => (AGE_BANDS.includes(v as AgeBand) ? (v as AgeBand) : '4–5');
const pronouns = (v: unknown): Pronouns => (v === 'she' || v === 'he' ? v : 'they');

function refImage(v: any): ImagePart {
  const data = typeof v?.data === 'string' ? v.data : '';
  const mimeType = v?.mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
  if (!data || data.length > 2_000_000 || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new Bad('Missing reference image');
  return { kind: 'image', mimeType, data };
}

function cast(v: unknown): CastInput[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 3).map((c: any) => ({ name: str(c?.name, 40), role: str(c?.role, 60), look: str(c?.look, 400) }));
}

export async function POST(request: Request) {
  if (!illustratorConnected()) {
    return Response.json({ error: 'not_connected', message: 'Pictures aren’t switched on yet.' }, { status: 503 });
  }
  if (cloudEnabled() && !(await currentUser())) {
    return Response.json({ error: 'sign_in', message: 'Sign in to draw pictures.' }, { status: 401 });
  }
  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();

  let parts: ImagePart[];
  let aspect = SCENE_ASPECT;
  let limitKey: string;
  let limit: number;
  try {
    const b = (await request.json()) as Record<string, any>;
    if (b.kind === 'hero') {
      const l = look(b.look);
      parts = [{ kind: 'text', text: heroSheetPrompt(l, ageBand(b.ageBand), pronouns(b.pronouns)) }];
      aspect = '3:4';
      limitKey = `hero:${ip}`;
      limit = 10;
    } else if (b.kind === 'cast') {
      const storyId = String(b.storyId ?? '');
      const c = cast(b.cast);
      if (!ID.test(storyId) || !c.length || !castSigned(storyId, c, String(b.castSig ?? ''))) throw new Bad('Unsigned cast');
      parts = [{ kind: 'text', text: castSheetPrompt(c) }, refImage(b.hero)];
      aspect = c.length > 1 ? '4:3' : '1:1';
      limitKey = `cast:${storyId}`;
      limit = 2;
    } else if (b.kind === 'scene') {
      const storyId = String(b.storyId ?? '');
      const index = Number(b.index);
      const total = Math.min(10, Math.max(1, Number(b.total) || 1));
      const art = { shot: str(b.art?.shot, 300), prompt: str(b.art?.prompt, 900) };
      if (!ID.test(storyId) || !Number.isInteger(index) || index < 0 || index > 20) throw new Bad('Bad scene');
      if (!art.prompt || !sceneSigned(storyId, index, art, String(b.artSig ?? ''))) throw new Bad('Unsigned scene');
      const c = cast(b.cast);
      if (c.length && !castSigned(storyId, c, String(b.castSig ?? ''))) throw new Bad('Unsigned cast');
      const sheet = b.castSheet && c.length ? refImage(b.castSheet) : null;
      const hero = heroDescription(look(b.look), ageBand(b.ageBand), pronouns(b.pronouns));
      parts = [
        { kind: 'text', text: scenePrompt({ hero, cast: c, hasCastSheet: Boolean(sheet), shot: art.shot, scene: art.prompt, index: Number(b.scene) || 0, total, aspectRatio: SCENE_ASPECT }) },
        refImage(b.hero),
        ...(sheet ? [sheet] : []),
      ];
      limitKey = `scene:${storyId}:${index}`;
      limit = 3;
    } else {
      throw new Bad('Unknown kind');
    }
  } catch (e) {
    return Response.json({ error: 'bad_request', message: e instanceof Bad ? e.message : 'We couldn’t read that request.' }, { status: 400 });
  }

  if (over(`ip:${ip}`, 60) || over(limitKey, limit)) {
    return Response.json({ error: 'rate_limited', message: 'That’s a lot of pictures. Try again a little later.' }, { status: 429 });
  }

  const started = Date.now();
  try {
    const jpeg = await generateImage(parts, aspect, request.signal);
    const webp = await sharp(jpeg).webp({ quality: 80 }).toBuffer();
    console.info('picture drawn', { kind: limitKey.split(':')[0], ms: Date.now() - started, kb: Math.round(webp.length / 1024) });
    return new Response(new Uint8Array(webp), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' } });
  } catch (e) {
    const code = e instanceof ImageError ? e.code : request.signal.aborted ? 'cancelled' : 'network';
    console.error('picture failed', limitKey.split(':')[0], code, String(e));
    return Response.json({ error: 'failed', code, message: 'That picture didn’t come out. We’ll try again next time.' }, { status: 502 });
  }
}
