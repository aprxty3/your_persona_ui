import type { MetadataRoute } from 'next';

// FR-J1: allow general crawlers + AI answer engines, but NEVER index the
// personal pages (results/dashboard/auth) — first layer alongside the
// X-Robots-Tag the BE also sends on /v1/results/*.
export default function robots(): MetadataRoute.Robots {
  const disallow = ['/results/', '/dashboard', '/auth'];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      // AI crawlers are explicitly welcomed (GEO; FR-J3 llms.txt complements this).
      { userAgent: 'GPTBot', allow: '/', disallow },
      { userAgent: 'PerplexityBot', allow: '/', disallow },
      { userAgent: 'ClaudeBot', allow: '/', disallow },
      { userAgent: 'Google-Extended', allow: '/', disallow },
    ],
    sitemap: 'https://yourpersonas.com/sitemap.xml',
  };
}
