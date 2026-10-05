/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every page is pre-rendered from the SQLite seed at build time.
  outputFileTracingIncludes: { '/**': ['./data/learnai.db'] },
};
export default nextConfig;
