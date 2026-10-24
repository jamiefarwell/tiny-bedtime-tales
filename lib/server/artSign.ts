import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { ArtLine, CastLine } from '@/lib/engine/parse';

// The illustrate endpoint only draws scenes our storyteller wrote. The story
// route signs each CAST list and ART line; the client hands the signature
// back with the drawing request, so the endpoint can't be used as a free
// image generator with made-up prompts.

function secret(): string {
  if (process.env.ART_SIGNING_SECRET) return process.env.ART_SIGNING_SECRET;
  // Derived from a server-only key, so it needs no extra setup.
  return createHash('sha256').update(`tbt-art:${process.env.ANTHROPIC_API_KEY ?? ''}:${process.env.GEMINI_API_KEY ?? ''}`).digest('hex');
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

const castPayload = (storyId: string, cast: CastLine[]) =>
  `cast|${storyId}|${JSON.stringify(cast.map((c) => [c.name, c.role, c.look]))}`;
const scenePayload = (storyId: string, index: number, art: ArtLine) => `scene|${storyId}|${index}|${art.shot}|${art.prompt}`;

export const signCast = (storyId: string, cast: CastLine[]) => sign(castPayload(storyId, cast));
export const signScene = (storyId: string, index: number, art: ArtLine) => sign(scenePayload(storyId, index, art));

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const castSigned = (storyId: string, cast: CastLine[], sig: string) => same(signCast(storyId, cast), sig);
export const sceneSigned = (storyId: string, index: number, art: ArtLine, sig: string) => same(signScene(storyId, index, art), sig);
