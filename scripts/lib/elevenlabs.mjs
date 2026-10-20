// ElevenLabs text-to-speech "with timestamps" over REST, no SDK.
//
//   POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128
//   header xi-api-key: $ELEVENLABS_API_KEY
//   { text, model_id, voice_settings, previous_text, next_text, previous_request_ids, seed, ... }
//   -> { audio_base64, alignment: { characters[], character_start_times_seconds[], character_end_times_seconds[] },
//        normalized_alignment: {...} }   + response header `request-id` (used for request stitching)
//
// Sources (checked 2026-10-20):
//   https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
//   https://elevenlabs.io/docs/developers/guides/cookbooks/text-to-speech/request-stitching
//   https://elevenlabs.io/docs/models
//   https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4
//   https://elevenlabs.io/pricing/api

import { fetchWithRetry } from './http.mjs';

export const ELEVENLABS_BASE = 'https://api.elevenlabs.io';
// ELEVENLABS_API_BASE overrides the host (regional endpoint, proxy, or the offline tests' mock server).
const base = () => (process.env.ELEVENLABS_API_BASE || ELEVENLABS_BASE).replace(/\/+$/, '');
export const DEFAULT_NARRATION_MODEL = 'eleven_multilingual_v2';

/**
 * Per-model capabilities and API price (USD per 1,000 characters).
 * stitching: accepts previous_request_ids / next_request_ids.
 * style/speed: honours voice_settings.style / voice_settings.speed.
 */
export const TTS_MODELS = {
  eleven_multilingual_v2: { maxChars: 10_000, stitching: true, style: true, speed: true, per1k: 0.08 },
  eleven_v4: { maxChars: 10_000, stitching: true, style: false, speed: false, per1k: 0.08 },
  eleven_v4_turbo: { maxChars: 10_000, stitching: true, style: false, speed: false, per1k: 0.04 },
  eleven_v3: { maxChars: 5_000, stitching: false, style: false, speed: true, per1k: 0.08, discreteStability: [0, 0.5, 1] },
  eleven_flash_v2_5: { maxChars: 40_000, stitching: true, style: false, speed: true, per1k: 0.04 },
  eleven_flash_v2: { maxChars: 30_000, stitching: true, style: false, speed: true, per1k: 0.04 },
};

export function modelInfo(model) {
  return TTS_MODELS[model] ?? { maxChars: 5_000, stitching: false, style: true, speed: true, per1k: null, unknown: true };
}

/**
 * Build the HTTP request for one page.
 * @param {object} a
 * @param {string} a.voiceId
 * @param {string} a.model
 * @param {string} a.text
 * @param {{ stability: number, similarity_boost: number, style?: number, speed?: number, use_speaker_boost: boolean }} a.voiceSettings
 * @param {string} [a.previousText]
 * @param {string} [a.nextText]
 * @param {string[]} [a.previousRequestIds]
 * @param {number} [a.seed]
 * @param {string} [a.languageCode]
 * @param {string} [a.outputFormat]
 * @param {string} [a.apiKey]
 */
export function buildTtsRequest(a) {
  const info = modelInfo(a.model);
  const body = {
    text: a.text,
    model_id: a.model,
    voice_settings: a.voiceSettings,
    apply_text_normalization: 'auto',
  };
  if (a.seed !== undefined) body.seed = a.seed;
  if (a.languageCode) body.language_code = a.languageCode;
  if (a.previousText) body.previous_text = a.previousText;
  if (a.nextText) body.next_text = a.nextText;
  if (info.stitching && a.previousRequestIds?.length) body.previous_request_ids = a.previousRequestIds.slice(-3);
  const qs = new URLSearchParams({ output_format: a.outputFormat ?? 'mp3_44100_128' });
  return {
    method: 'POST',
    url: `${base()}/v1/text-to-speech/${encodeURIComponent(a.voiceId)}/with-timestamps?${qs}`,
    headers: { 'content-type': 'application/json', accept: 'application/json', 'xi-api-key': a.apiKey ?? '<ELEVENLABS_API_KEY>' },
    body,
  };
}

/** Call ElevenLabs. Returns mp3 bytes, alignment and the request id for stitching. */
export async function synthesize(args, { label, log }) {
  const req = buildTtsRequest(args);
  const res = await fetchWithRetry(
    req.url,
    { method: req.method, headers: req.headers, body: JSON.stringify(req.body) },
    { label, log, timeoutMs: 180_000, retries: 5, baseDelayMs: 2000 },
  );
  const requestId = res.headers.get('request-id') ?? res.headers.get('x-request-id') ?? null;
  const json = await res.json();
  if (!json?.audio_base64) throw new Error(`${label}: response had no audio_base64`);
  return {
    audio: Buffer.from(json.audio_base64, 'base64'),
    alignment: json.alignment ?? null,
    normalizedAlignment: json.normalized_alignment ?? null,
    requestId,
  };
}
