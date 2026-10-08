/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // ไฟล์ Pyodide (~13 MB) แยกโฟลเดอร์ตามเวอร์ชันและไม่เคยเปลี่ยน — ให้เบราว์เซอร์เก็บไว้ ไม่ต้องโหลดซ้ำ
  async headers() {
    return [
      {
        source: '/pyodide/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://127.0.0.1:4209'}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${process.env.BACKEND_URL ?? 'http://127.0.0.1:4209'}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
