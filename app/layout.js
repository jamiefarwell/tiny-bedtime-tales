import './globals.css';

export const metadata = {
  title: 'Tiny Bedtime Tales',
  description: 'Personalised bedtime stories where your child is the hero.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#071327',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
