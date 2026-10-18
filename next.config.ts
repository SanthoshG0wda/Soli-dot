import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  // The desktop app ships .next/standalone: a minimal server.js plus only the node_modules it needs.
  output: "standalone",
  // Runtime data is found through process.cwd(), so tracing would copy it in. It must never ship.
  outputFileTracingExcludes: { "*": [".data/**", ".env*", ".gstack/**", "dist/**", "scripts/**"] },
  // The floating dev badge sits on top of the sidebar's Settings link.
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backend}/api/:path*`,
      },
      {
        source: "/api/vakil/:path*",
        destination: "/api/dots/:path*",
      },
      {
        source: "/api/legal/:path*",
        destination: `${backend}/api/legal/:path*`,
      },
    ];
  },
};

export default nextConfig;
