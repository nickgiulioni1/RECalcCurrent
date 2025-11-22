/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'offleashconstruction.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;  