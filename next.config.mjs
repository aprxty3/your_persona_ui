import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker image target <150MB — the runtime only needs .next/standalone (AGENTS.md Commands).
  output: 'standalone',
  reactStrictMode: true,
  // FE-03: proxy the BE through this same origin so cookies (`session_id`,
  // `csrf_token`, `SameSite=Strict`) are always first-party, regardless of
  // whether FE/BE end up on different registrable domains (two flat DuckDNS
  // names count as different sites). `API_INTERNAL_URL` is read at server
  // start (verified empirically — NOT frozen into the build like
  // NEXT_PUBLIC_* — so it can differ per docker-compose file without a
  // separate Docker build per environment).
  async rewrites() {
    const target = process.env.API_INTERNAL_URL ?? 'http://localhost:8080';
    return [{ source: '/api/be/:path*', destination: `${target}/:path*` }];
  },
};

export default withNextIntl(nextConfig);
