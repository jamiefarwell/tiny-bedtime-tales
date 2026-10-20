import Anthropic from '@anthropic-ai/sdk';
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserMessage } from '@/lib/engine/prompt';
import { StoryParser, bannedPhraseCount, type ParseEvent } from '@/lib/engine/parse';
import { RequestError, parseStoryRequest } from '@/lib/engine/sanitise';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MODEL = process.env.STORY_MODEL || 'claude-opus-5-5';
const EFFORT = (process.env.STORY_EFFORT || 'low') as 'low' | 'medium' | 'high';

// Per-instance soft limit for the preview. Real limits move to entitlements
// once accounts exist.
const hits: Map<string, { n: number; reset: number }> =
  (globalThis as any).__tbtHits || ((globalThis as any).__tbtHits = new Map());
function rateLimited(request: Request): boolean {
  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60 * 60 * 1000 });
    return false;
  }
  entry.n += 1;
  return entry.n > 15;
}

type Out =
  | ParseEvent
  | { type: 'done'; model: string; promptVersion: string }
  | { type: 'error'; message: string; code: string };

// Short codes shown under the error so a parent's screenshot tells us the cause.
function classify(error: unknown): { code: string; message: string } {
  const busy = 'The storyteller is very busy right now. Try again in a minute.';
  const generic = 'Something went wrong writing tonight’s story.';
  if (!(error instanceof Anthropic.APIError)) {
    return { code: error instanceof Anthropic.APIConnectionTimeoutError ? 'timeout' : 'network', message: busy };
  }
  const text = String(error.message).toLowerCase();
  if (error instanceof Anthropic.AuthenticationError) return { code: 'auth', message: generic };
  if (error instanceof Anthropic.PermissionDeniedError) return { code: 'permission', message: generic };
  if (error instanceof Anthropic.NotFoundError) return { code: 'model', message: generic };
  if (error instanceof Anthropic.RateLimitError) return { code: 'rate', message: busy };
  if (text.includes('workspace')) return { code: 'workspace', message: generic };
  if (text.includes('credit balance')) return { code: 'credit', message: generic };
  if ((error.status ?? 0) >= 500) return { code: `busy-${error.status}`, message: busy };
  return { code: `api-${error.status ?? 'x'}`, message: generic };
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'not_connected', message: 'The storyteller isn’t connected yet.' },
      { status: 503 },
    );
  }
  if (rateLimited(request)) {
    return Response.json(
      { error: 'rate_limited', message: 'That’s a lot of stories for one night. Try again a little later.' },
      { status: 429 },
    );
  }

  let story;
  try {
    story = parseStoryRequest(await request.json());
  } catch (e) {
    const message = e instanceof RequestError ? e.message : 'We couldn’t read that request.';
    return Response.json({ error: 'bad_request', message }, { status: 400 });
  }

  // Pin the endpoint: an ambient ANTHROPIC_BASE_URL (e.g. from developer
  // tooling) must never redirect the story key elsewhere.
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: process.env.STORY_API_BASE_URL || 'https://api.anthropic.com',
    // Org-level keys must name the workspace to bill; workspace keys don't need it.
    defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID
      ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID }
      : undefined,
  });
  const encoder = new TextEncoder();
  const started = Date.now();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Out) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      const parser = new StoryParser();
      let full = '';
      try {
        const stream = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 32000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: EFFORT },
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: buildUserMessage(story) }],
          },
          { signal: request.signal },
        );
        stream.on('text', (delta) => {
          full += delta;
          for (const event of parser.push(delta)) send(event);
        });
        const final = await stream.finalMessage();
        for (const event of parser.end()) send(event);

        if (final.stop_reason === 'refusal') {
          send({ type: 'error', code: 'refusal', message: 'The storyteller couldn’t write that one. Try a different idea?' });
        } else {
          send({ type: 'done', model: final.model, promptVersion: PROMPT_VERSION });
        }
        console.info('story generated', {
          model: final.model,
          ms: Date.now() - started,
          input: final.usage.input_tokens,
          cacheRead: final.usage.cache_read_input_tokens,
          output: final.usage.output_tokens,
          banned: bannedPhraseCount(full),
        });
      } catch (error) {
        const { code, message } = request.signal.aborted ? { code: 'cancelled', message: 'The story was interrupted.' } : classify(error);
        console.error('story generation failed', code, error instanceof Anthropic.APIError ? error.status : '', String(error));
        try {
          send({ type: 'error', code, message });
        } catch {
          // The client has gone; nothing left to tell it.
        }
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
