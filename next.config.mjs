import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    const target = process.env.API_INTERNAL_URL ?? 'http://localhost:8080';
    return [{ source: '/api/be/:path*', destination: `${target}/:path*` }];
  },
};

export default withNextIntl(nextConfig);
