/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://127.0.0.1:4202'}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://127.0.0.1:4202'}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
