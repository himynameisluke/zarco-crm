import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // OAuth 2.1 + MCP discovery metadata. Folders starting with a dot are
      // awkward in App Router, so we serve them from /well-known and rewrite.
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/well-known/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/well-known/oauth-authorization-server",
      },
    ];
  },
};

export default nextConfig;
