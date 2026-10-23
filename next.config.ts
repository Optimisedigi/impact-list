import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The production build type-checks app code only. Test files have their own
  // loose mock typings; `npx tsc --noEmit` still checks everything.
  typescript: { tsconfigPath: "tsconfig.build.json" },
};

export default nextConfig;
