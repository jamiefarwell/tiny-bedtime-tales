// Gemini image generation ("Nano Banana" family) over REST, no SDK.
//
// Primary transport: the Interactions API (recommended by Google for new
// projects, Oct 2026):
//   POST https://generativelanguage.googleapis.com/v1beta/interactions
//   header x-goog-api-key: $GEMINI_API_KEY
//   { model, input: [ {type:'text',text}, {type:'image',mime_type,data}, ... ],
//     response_format: { type:'image', mime_type, aspect_ratio, image_size },
//     store: false }
//   -> { id, status, steps: [ { type:'model_output', content:[ {type:'image', mime_type, data} ] } ], usage }
//   Sources: https://ai.google.dev/gemini-api/docs/image-generation
//            https://ai.google.dev/api/interactions-api
//            https://ai.google.dev/gemini-api/docs/migrate-to-interactions
//
// Fallback transport (GEMINI_IMAGE_API=generateContent): the original
// models/{model}:generateContent endpoint, which Google says "remains fully
// supported". Uses generationConfig.responseModalities + imageConfig.

import { fetchWithRetry } from './http.mjs';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// GEMINI_API_BASE overrides the host (for a proxy or the offline tests' mock server).
const base = () => (process.env.GEMINI_API_BASE || GEMINI_BASE).replace(/\/+$/, '');

export const DEFAULT_ILLUSTRATION_MODEL = 'gemini-nano-banana-2.1';

/**
 * Standard (paid tier, non-batch) USD prices, from
 * https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-20).
 * perImage: price per generated image by output size.
 * inputPerM: price per 1M input tokens (text + image).
 * maxRefs: documented reference-image ceiling.
 */
export const IMAGE_PRICING = {
  'gemini-nano-banana-2.1': { perImage: { '1K': 0.0336, '2K': 0.0504, '4K': 0.113 }, inputPerM: 1.5, maxRefs: 14, maxCharacters: 4 },
  'gemini-3.1-flash-image': { perImage: { '512px': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 }, inputPerM: 0.5, maxRefs: 14, maxCharacters: 4 },
  'gemini-3.1-flash-lite-image': { perImage: { '1K': 0.0336 }, inputPerM: 0.25, maxRefs: 14, maxCharacters: 4 },
  'gemini-3-pro-image': { perImage: { '1K': 0.134, '2K': 0.134, '4K': 0.24 }, inputPerM: 2.0, maxRefs: 14, maxCharacters: 5 },
};

/** Rough input-token cost of one reference image (Google does not publish a per-image figure for every model). */
export const EST_TOKENS_PER_INPUT_IMAGE = 1120;

export function priceFor(model, size) {
  const p = IMAGE_PRICING[model];
  const override = Number(process.env.ILLUSTRATION_PRICE_PER_IMAGE);
  const perImage = Number.isFinite(override) && override > 0 ? override : p?.perImage[size] ?? p?.perImage['1K'] ?? null;
  return { perImage, inputPerM: p?.inputPerM ?? null, known: Boolean(p) };
}

/**
 * @typedef {{ kind: 'text', text: string } | { kind: 'image', mimeType: string, data: string }} Part
 */

/** Build the HTTP request for a generation call, for either transport. */
export function buildImageRequest({ api = 'interactions', model, parts, aspectRatio, imageSize, outputMime = 'image/png', apiKey = '<GEMINI_API_KEY>' }) {
  const headers = { 'content-type': 'application/json', 'x-goog-api-key': apiKey };
  if (api === 'generateContent') {
    return {
      method: 'POST',
      url: `${base()}/models/${encodeURIComponent(model)}:generateContent`,
      headers,
      body: {
        contents: [
          {
            role: 'user',
            parts: parts.map((p) => (p.kind === 'text' ? { text: p.text } : { inline_data: { mime_type: p.mimeType, data: p.data } })),
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio, imageSize },
        },
      },
    };
  }
  return {
    method: 'POST',
    url: `${base()}/interactions`,
    headers,
    body: {
      model,
      input: parts.map((p) => (p.kind === 'text' ? { type: 'text', text: p.text } : { type: 'image', mime_type: p.mimeType, data: p.data })),
      response_format: { type: 'image', mime_type: outputMime, aspect_ratio: aspectRatio, image_size: imageSize },
      // Do not keep prompts / reference art on Google's side (store defaults to true).
      store: false,
    },
  };
}

class SoftError extends Error {
  constructor(msg) { super(msg); this.softRetry = true; }
}

/**
 * Pull the final generated image (and usage) out of either response shape.
 * Thought images (interim drafts the model makes while planning) are skipped.
 */
export function extractImage(json) {
  /** @type {{ mimeType: string, data: string }[]} */
  const images = [];
  const texts = [];

  // Interactions API
  if (Array.isArray(json?.steps)) {
    for (const step of json.steps) {
      if (step?.type && step.type !== 'model_output') continue;
      for (const c of step?.content ?? []) {
        if (c?.type === 'image' && c.data) images.push({ mimeType: c.mime_type ?? 'image/png', data: c.data });
        else if (c?.type === 'text' && c.text) texts.push(c.text);
      }
    }
  }
  // Older interactions preview shape
  if (Array.isArray(json?.outputs)) {
    for (const c of json.outputs) {
      if (c?.type === 'image' && c.data) images.push({ mimeType: c.mime_type ?? 'image/png', data: c.data });
      else if (c?.type === 'text' && c.text) texts.push(c.text);
    }
  }
  // generateContent
  let finishReason;
  if (Array.isArray(json?.candidates)) {
    for (const cand of json.candidates) {
      finishReason ??= cand?.finishReason;
      for (const part of cand?.content?.parts ?? []) {
        if (part?.thought) continue;
        const blob = part?.inlineData ?? part?.inline_data;
        if (blob?.data) images.push({ mimeType: blob.mimeType ?? blob.mime_type ?? 'image/png', data: blob.data });
        else if (part?.text) texts.push(part.text);
      }
    }
  }

  const u = json?.usage ?? json?.usageMetadata ?? {};
  const usage = {
    inputTokens: u.total_input_tokens ?? u.promptTokenCount ?? null,
    outputTokens: u.total_output_tokens ?? u.candidatesTokenCount ?? null,
    thoughtTokens: u.total_thought_tokens ?? u.thoughtsTokenCount ?? null,
  };

  return { image: images.at(-1) ?? null, texts, usage, status: json?.status, finishReason, errors: json?.errors };
}

/**
 * Call the model and return the final image bytes.
 * Throws SoftError (retried by the caller) when the model answers without an image.
 */
export async function generateImage({ api, model, parts, aspectRatio, imageSize, apiKey, label, log }) {
  const req = buildImageRequest({ api, model, parts, aspectRatio, imageSize, apiKey });
  const res = await fetchWithRetry(
    req.url,
    { method: req.method, headers: req.headers, body: JSON.stringify(req.body) },
    { label, log, timeoutMs: 240_000, retries: 5, baseDelayMs: 4000 },
  );
  const json = await res.json();
  const out = extractImage(json);
  if (out.status && out.status !== 'completed') {
    const why = (out.errors ?? []).map((e) => e?.message).filter(Boolean).join('; ');
    throw new SoftError(`interaction status "${out.status}"${why ? `: ${why}` : ''}`);
  }
  if (!out.image) {
    const said = out.texts.join(' ').slice(0, 300);
    const reason = out.finishReason ? ` (finishReason ${out.finishReason})` : '';
    const err = new SoftError(`model returned no image${reason}${said ? ` - model said: "${said}"` : ''}`);
    // Safety blocks will not change on retry with the same prompt.
    if (/SAFETY|PROHIBITED|BLOCKLIST/.test(out.finishReason ?? '')) err.softRetry = false;
    throw err;
  }
  return { buffer: Buffer.from(out.image.data, 'base64'), mimeType: out.image.mimeType, usage: out.usage, texts: out.texts };
}
