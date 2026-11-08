import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  distDir: process.env.M3_TEST_DIST_DIR || '.next',
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      ],
    }];
  },
};
export default config;
