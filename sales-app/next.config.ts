import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

// Visit photos are served from the Express backend (NEXT_PUBLIC_API_URL), never from a
// data:/blob: URL, so next/image can optimize them — it just needs that host allow-listed.
// Parsed at build time so this keeps working across environments without hardcoding a host.
function backendImagePattern() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000");
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port || undefined,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: backendImagePattern(),
  },
};

export default withPWA(nextConfig);
