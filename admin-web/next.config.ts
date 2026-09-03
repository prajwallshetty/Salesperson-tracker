import type { NextConfig } from "next";

// Product images are uploaded to the API server and served from
// NEXT_PUBLIC_API_URL (see lib/api.ts#assetUrl) — allow next/image to
// optimize them from that origin. Falls back to localhost:4000 for local
// dev if the env var isn't set at build time.
function apiImagePattern() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || "",
    };
  } catch {
    return { protocol: "http" as const, hostname: "localhost", port: "4000" };
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ ...apiImagePattern(), pathname: "/uploads/**" }],
  },
};

export default nextConfig;
