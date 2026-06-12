import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://api:8000/api";
const apiOrigin = apiUrl.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: ["localhost", "minio"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
      {
        source: "/openapi.json",
        destination: `${apiOrigin}/openapi.json`,
      },
      {
        source: "/docs",
        destination: `${apiOrigin}/docs`,
      },
      {
        source: "/redoc",
        destination: `${apiOrigin}/redoc`,
      },
    ];
  },
};

export default nextConfig;
