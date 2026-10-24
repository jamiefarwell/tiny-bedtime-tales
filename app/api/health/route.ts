import { cloudEnabled, paymentsEnabled } from '@/lib/server/config';

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'tiny-bedtime-tales',
      storyteller: Boolean(process.env.ANTHROPIC_API_KEY),
      workspace: Boolean(process.env.ANTHROPIC_WORKSPACE_ID),
      storyModel: process.env.STORY_MODEL || 'claude-opus-5-5',
      illustrator: Boolean(process.env.GEMINI_API_KEY),
      cloud: cloudEnabled(),
      payments: paymentsEnabled(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA || '',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
