/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4202/api/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:4202/auth/:path*',
      },
    ];
  },
};

export default nextConfig;