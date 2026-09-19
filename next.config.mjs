/**
 * Next.js configuration for OpenHub.
 *
 * Notes:
 * - `output: "standalone"` produces a minimal production server image (used by the Dockerfile).
 * - Security headers are attached in `headers()`. Frame protection can be relaxed with
 *   ALLOW_EMBED=true, which is useful for local previews / iframe based demos. Never enable it
 *   on a public production deployment.
 */

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  // Next.js inlines small style attributes; Tailwind itself is emitted as a stylesheet.
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  // Map provider abstraction: OpenStreetMap embeds work without any API key.
  "frame-src 'self' https://www.openstreetmap.org https://*.tile.openstreetmap.org",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

if (process.env.CSP_EXTRA) {
  cspDirectives.push(process.env.CSP_EXTRA);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  // Native and engine packages must stay outside the server bundle, otherwise
  // their native bindings are stripped and Prisma fails at first query.
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-better-sqlite3',
    '@prisma/adapter-pg',
    'better-sqlite3',
    'pg',
    'qrcode',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    const headers = [
      { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
    ];

    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_EMBED !== 'true') {
      headers.push({ key: 'X-Frame-Options', value: 'DENY' });
    }
    if (process.env.ENABLE_HSTS === 'true') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
