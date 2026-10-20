import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '80dvh', display: 'grid', placeContent: 'center', gap: 16, textAlign: 'center', padding: 24 }}>
      <p className="eyebrow">Lost page</p>
      <h1 style={{ fontSize: 40 }}>This page wandered off</h1>
      <p style={{ color: 'var(--cream-dim)' }}>It may be under the sofa with all the odd socks.</p>
      <Link href="/" className="btn btn-primary">
        Back to tonight
      </Link>
    </main>
  );
}
