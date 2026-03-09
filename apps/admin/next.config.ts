import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sardoba/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
