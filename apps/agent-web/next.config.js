/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@chirag/types', '@chirag/ui', '@chirag/utils', '@chirag/validation', '@chirag/pricing'],
  async rewrites() {
    const apiOrigin = (process.env.API_URL || 'http://127.0.0.1:5000/api/v1').replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.API_URL || 'http://127.0.0.1:5000/api/v1'}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/branding/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
