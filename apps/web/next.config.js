/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sardoba/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

module.exports = nextConfig;
