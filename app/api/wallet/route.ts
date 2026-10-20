import { walletView } from '@/lib/server/wallet';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json(await walletView(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('wallet read failed', String(error));
    return Response.json({ error: 'wallet_failed' }, { status: 500 });
  }
}
