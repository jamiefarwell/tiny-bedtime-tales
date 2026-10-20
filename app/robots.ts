import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Preview build: keep it out of search until launch.
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
