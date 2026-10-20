import type { Metadata, Viewport } from 'next';
import { Andika, Fraunces, Nunito } from 'next/font/google';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], axes: ['SOFT', 'opsz'], variable: '--font-display' });
const ui = Nunito({ subsets: ['latin'], variable: '--font-ui' });
// Andika's single-storey a and g are designed for children learning to read.
const story = Andika({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-story' });

export const metadata: Metadata = {
  title: { default: 'Tiny Bedtime Tales', template: '%s · Tiny Bedtime Tales' },
  description: 'Bedtime stories where your child is the hero, and a world that remembers them night after night.',
  applicationName: 'Tiny Bedtime Tales',
  appleWebApp: { capable: true, title: 'Bedtime Tales', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e1129',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${ui.variable} ${story.variable}`}>
      <body>{children}</body>
    </html>
  );
}
