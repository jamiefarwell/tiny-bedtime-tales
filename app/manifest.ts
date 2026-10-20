import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tiny Bedtime Tales',
    short_name: 'Bedtime Tales',
    description: 'Bedtime stories where your child is the hero.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0e1129',
    theme_color: '#0e1129',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
