import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker image target <150MB — the runtime only needs .next/standalone (AGENTS.md Commands).
  output: 'standalone',
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
