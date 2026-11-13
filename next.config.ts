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
  // The party games (`lib/party-games.ts`) are single-file pages in public/.
  // Next serves a public file only at its exact path, so the bare URL is
  // pointed at index.html. They stay at the root on purpose: the pages link
  // `../games/shim.js` and `../api/`, which resolve the same from `/bride-quest`
  // and `/bride-quest/` only because `..` can't climb above the root.
  async rewrites() {
    return [
      { source: "/aaronpardy", destination: "/aaronpardy/index.html" },
      { source: "/bride-quest", destination: "/bride-quest/index.html" },
    ];
  },
  async headers() {
    const gamePage = [
      // The first visit carries ?key= until the shim strips it.
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      // Unlisted: reached by a link someone was sent, never by a search.
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/:game(aaronpardy|bride-quest)", headers: gamePage },
      { source: "/:game(aaronpardy|bride-quest)/index.html", headers: gamePage },
    ];
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
