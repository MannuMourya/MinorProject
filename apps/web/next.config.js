/**
 * Next.js configuration for the WinCVEx frontend.
 *
 * We enable the standalone output so that the compiled server
 * can run within a slim Node.js runtime in Docker.  We do not
 * enable experimental flags such as appDir since Next.js 14
 * enables the app router by default.  Additional configuration
 * can be added here if needed.
 */
const nextConfig = {
  output: 'standalone'
};

module.exports = nextConfig;