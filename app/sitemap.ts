import type { MetadataRoute } from 'next';

// FR-J1: marketing pages ONLY — NEVER include /results (personal data)
// or the auth pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://yourpersonas.com';

  return [
    {
      url: base,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: { id: `${base}/id` } },
    },
    {
      url: `${base}/onboarding`,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: { languages: { id: `${base}/id/onboarding` } },
    },
  ];
}
