/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
  transpilePackages: ['@shu/shared-types', '@shu/utils', '@shu/ui-components'],
};
module.exports = nextConfig;
