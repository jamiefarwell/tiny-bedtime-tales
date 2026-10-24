import 'server-only';

// Minimal Gemini image client for the app (the asset pipeline has a fuller
// one in scripts/lib/gemini-image.mjs). Interactions API, store: false so
// Google keeps no copy of prompts or reference art.

const BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const ILLUSTRATION_MODEL = process.env.ILLUSTRATION_MODEL || 'gemini-nano-banana-2.1';

export type ImagePart = { kind: 'text'; text: string } | { kind: 'image'; mimeType: string; data: string };

export class ImageError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

export const illustratorConnected = () => Boolean(process.env.GEMINI_API_KEY);

async function once(parts: ImagePart[], aspectRatio: string, signal?: AbortSignal): Promise<Buffer> {
  const res = await fetch(`${BASE}/interactions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY ?? '' },
    body: JSON.stringify({
      model: ILLUSTRATION_MODEL,
      input: parts.map((p) => (p.kind === 'text' ? { type: 'text', text: p.text } : { type: 'image', mime_type: p.mimeType, data: p.data })),
      response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: aspectRatio, image_size: '1K' },
      store: false,
    }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(150_000)]) : AbortSignal.timeout(150_000),
  });
  if (!res.ok) {
    // Never echo the body: it can quote the request.
    const code = res.status === 429 ? 'rate' : res.status >= 500 ? `busy-${res.status}` : `api-${res.status}`;
    throw new ImageError(`Illustrator returned ${res.status}`, code);
  }
  const json: any = await res.json();
  if (json?.status && json.status !== 'completed') throw new ImageError(`Illustrator status ${json.status}`, 'incomplete');
  let data: string | null = null;
  for (const step of json?.steps ?? []) {
    if (step?.type && step.type !== 'model_output') continue;
    for (const c of step?.content ?? []) if (c?.type === 'image' && c.data) data = c.data;
  }
  for (const c of json?.outputs ?? []) if (c?.type === 'image' && c.data) data = c.data;
  if (!data) throw new ImageError('Illustrator returned no image', 'no-image');
  return Buffer.from(data, 'base64');
}

/** Generate one 1K image. One retry for busy or empty answers. */
export async function generateImage(parts: ImagePart[], aspectRatio: string, signal?: AbortSignal): Promise<Buffer> {
  try {
    return await once(parts, aspectRatio, signal);
  } catch (e) {
    const retry = e instanceof ImageError ? ['rate', 'no-image', 'incomplete'].includes(e.code) || e.code.startsWith('busy') : !signal?.aborted;
    if (!retry) throw e;
    await new Promise((r) => setTimeout(r, 3000));
    return once(parts, aspectRatio, signal);
  }
}
