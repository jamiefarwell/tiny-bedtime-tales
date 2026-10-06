export async function GET() {
  return Response.json({
    ok: true,
    service: 'tiny-bedtime-tales',
    storyEngine: 'ready',
    aiGatewayAuth: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
    cloudDatabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || ''
  }, { headers: { 'Cache-Control': 'no-store' } });
}
