import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // NOTE: /api/be/* is proxied by app/api/be/[...path]/route.ts, NOT by rewrites().
  // With output:'standalone', rewrites() is evaluated at BUILD time and baked into
  // routes-manifest.json, so API_INTERNAL_URL set at container runtime was ignored.
};

export default withNextIntl(nextConfig);
