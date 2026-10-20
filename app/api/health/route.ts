export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'tiny-bedtime-tales',
      storyteller: Boolean(process.env.ANTHROPIC_API_KEY),
      storyModel: process.env.STORY_MODEL || 'claude-opus-5-5',
      cloudDatabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      commit: process.env.VERCEL_GIT_COMMIT_SHA || '',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
