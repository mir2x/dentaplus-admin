import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // traced node_modules, so the runtime image doesn't ship the full install.
  output: "standalone",
};

export default nextConfig;
