/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shu/shared-types', '@shu/utils', '@shu/ui-components'],
};

export default nextConfig;
