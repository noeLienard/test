import { isProxyActive, secret } from "@elding/sdk";

// Inventaire des 9 secrets de l'app : 6 clés API HTTP (configure) + 3 non-HTTP (secret).
const HTTP_KEYS = [
  "MISTRAL_KEY", "PEXELS_KEY", "RESEND_KEY",
  "ELEVENLABS_KEY", "STRIPE_KEY", "FIRMA_KEY",
];
const NON_HTTP = ["DATABASE_URL", "REDIS_URL", "JWT_SECRET"];

export async function GET() {
  // NOMBRE = valeur brute (pas une clé HTTP) → récupérée via secret().
  let nombre: string | null = null;
  try { nombre = await secret("NOMBRE"); } catch { /* absent du set */ }

  return Response.json({
    proxyActive: isProxyActive(),
    nombre,
    httpKeys: HTTP_KEYS.map((name) => ({
      name,
      tool: "configure()",
      protected: true,
      inProcessEnv: process.env[name] ?? null, // doit être null en mode proxy
    })),
    nonHttp: NON_HTTP.map((name) => ({
      name,
      tool: "secret()",
      protected: false,
      inProcessEnv: process.env[name] ?? null,
    })),
    // Aucune des 6 clés HTTP ne doit apparaître dans process.env.
    leakedHttpKeys: HTTP_KEYS.filter((k) => process.env[k]),
  });
}
