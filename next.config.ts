import type { NextConfig } from 'next';
const config: NextConfig = { devIndicators: false, distDir: process.env.M3_TEST_DIST_DIR || '.next' };
export default config;
