import type { NextConfig } from 'next';
const securityHeaders = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  {
    key: 'Content-Security-Policy',
    value:
      "frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
];
const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/', headers: securityHeaders },
      { source: '/:path*', headers: securityHeaders },
      { source: '/kartim', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/giris', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/uye-ol', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/kart/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
    ];
  },
};
export default nextConfig;
