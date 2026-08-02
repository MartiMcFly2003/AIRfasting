import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // swisseph-wasm (used by src/lib/calendar/ephemeris.ts for the Ekadashi tithi calculation,
  // only reachable from /calendar) loads its .wasm/.data files at runtime via paths Next.js's
  // static file tracing can't see, so the Vercel serverless bundle silently omits them —
  // producing "ENOENT: no such file or directory" only in production, never locally where the
  // full node_modules tree is on disk. This forces those files into the /calendar function's
  // deployment bundle explicitly.
  outputFileTracingIncludes: {
    "/calendar": ["./node_modules/swisseph-wasm/wasm/**"],
  },
};

export default nextConfig;
