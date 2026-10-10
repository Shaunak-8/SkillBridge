import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve localhost vs 127.0.0.1 for the development auth canonical redirect.
  // Otherwise Next turns that cross-host redirect into a same-path loop.
  skipProxyUrlNormalize: true,
};

export default nextConfig;
