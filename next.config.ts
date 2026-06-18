import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modules natifs / SDK : ne pas bundler côté serveur.
  // Sinon Turbopack casse le require du keychain natif → secret() ne trouve plus le token.
  serverExternalPackages: ["@napi-rs/keyring", "@elding/sdk"],
};

export default nextConfig;
