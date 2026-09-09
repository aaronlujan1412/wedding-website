import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Guest photos live in a public Supabase Storage bucket, so next/image
      // has to be told the CDN host is allowed. Scoped to the public object
      // path so nothing else on the project can be proxied through the
      // optimizer.
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Photo uploads go through a server action, whose default body cap is
      // 1 MB. The browser resizes to roughly 500 KB first, so this is headroom
      // for the occasional photo that resists compression — not the target.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
