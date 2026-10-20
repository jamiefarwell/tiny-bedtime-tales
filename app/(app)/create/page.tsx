import type { Metadata } from 'next';
import { CreateFlow } from './CreateFlow';

export const metadata: Metadata = { title: 'Make tonight’s story' };

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ world?: string; continue?: string; again?: string }>;
}) {
  const q = await searchParams;
  return <CreateFlow initialWorld={q.world} continueId={q.continue} againId={q.again} />;
}
