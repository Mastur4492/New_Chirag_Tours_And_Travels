/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@chirag/types', '@chirag/ui', '@chirag/utils', '@chirag/validation'],
  async rewrites() {
    const defaultApiUrl = process.env.NODE_ENV === 'production'
      ? 'https://newchirag-api.onrender.com/api/v1'
      : 'http://127.0.0.1:5000/api/v1';
    const targetApiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || defaultApiUrl;
    const apiOrigin = targetApiUrl.replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${targetApiUrl}/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${targetApiUrl}/:path*`,
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
        source: '/(branding|images)/:path*',
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
