import { configure, secret, isProxyActive } from "@elding/sdk";

// 6 clés API HTTP gérées par Elding via configure() (proxy → clé hors du process).
// Toutes mettent leur clé dans un EN-TÊTE (le proxy substitue les headers, pas l'URL).
const PROVIDERS = {
  MISTRAL_KEY: { target: "https://api.mistral.ai", header: (k: string) => ({ Authorization: `Bearer ${k}` }) },
  PEXELS_KEY: { target: "https://api.pexels.com", header: (k: string) => ({ Authorization: k }) },
  RESEND_KEY: { target: "https://api.resend.com", header: (k: string) => ({ Authorization: `Bearer ${k}` }) },
  ELEVENLABS_KEY: { target: "https://api.elevenlabs.io", header: (k: string) => ({ "xi-api-key": k }) },
  STRIPE_KEY: { target: "https://api.stripe.com", header: (k: string) => ({ Authorization: `Bearer ${k}` }) },
  FIRMA_KEY: { target: "https://api.firma.dev", header: (k: string) => ({ Authorization: `Bearer ${k}` }) },
} as const;

type Provider = keyof typeof PROVIDERS;

// Appel HTTP via Elding. Lit le texte d'abord (évite le crash si réponse non-JSON).
async function call(name: Provider, path: string, init: RequestInit = {}) {
  const { apiKey, baseURL, defaultHeaders } = await configure(name, PROVIDERS[name].target);
  const res = await fetch(`${baseURL ?? PROVIDERS[name].target}${path}`, {
    ...init,
    headers: { ...defaultHeaders, ...PROVIDERS[name].header(apiKey), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* réponse texte brut */ }
  return { ok: res.ok, status: res.status, raw: text.slice(0, 200), data: data as Record<string, unknown> };
}

// Exécute une feature, capture l'erreur sans casser les autres.
async function feature(fn: () => Promise<unknown>) {
  try { return await fn(); } catch (e) { return `erreur : ${(e as Error).message}`; }
}

export async function GET() {
  const result: Record<string, unknown> = { _proxyActive: isProxyActive() };

  // 1. MISTRAL — résumé IA (POST chat completions)
  result.mistral = await feature(async () => {
    const r = await call("MISTRAL_KEY", "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: "Résume l'actu tech du jour en une phrase." }],
      }),
    });
    if (!r.ok) return `erreur ${r.status} · ${r.raw}`;
    return (r.data.choices as { message: { content: string } }[])?.[0]?.message?.content;
  });

  // 2. PEXELS — une photo d'illustration
  result.pexels = await feature(async () => {
    const r = await call("PEXELS_KEY", "/v1/search?query=technology&per_page=1");
    if (!r.ok) return `erreur ${r.status}`;
    return (r.data.photos as { src: { medium: string } }[])?.[0]?.src?.medium;
  });

  // 3. RESEND — envoie un mail de test (clé restreinte à l'envoi)
  result.resend = await feature(async () => {
    const r = await call("RESEND_KEY", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "AI Daily Brief <onboarding@resend.dev>",
        to: ["delivered@resend.dev"],
        subject: "Brief du jour",
        text: "Brief généré via Elding, clé jamais exposée.",
      }),
    });
    return r.ok ? `mail envoyé · id ${r.data.id}` : `erreur ${r.status} · ${r.raw}`;
  });

  // 4. ELEVENLABS — liste les voix disponibles
  result.elevenlabs = await feature(async () => {
    const r = await call("ELEVENLABS_KEY", "/v1/voices");
    return r.ok ? `${(r.data.voices as unknown[])?.length ?? 0} voix` : `erreur ${r.status}`;
  });

  // 5. STRIPE — solde du compte
  result.stripe = await feature(async () => {
    const r = await call("STRIPE_KEY", "/v1/balance");
    const av = (r.data.available as { amount: number; currency: string }[])?.[0];
    return r.ok && av ? `${(av.amount / 100).toFixed(2)} ${av.currency.toUpperCase()}` : `erreur ${r.status}`;
  });

  // 6. FIRMA — crée une demande de signature électronique
  result.firma = await feature(async () => {
    const r = await call("FIRMA_KEY", "/v1/signatures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: "brief.pdf", signer: "demo@elding.fr" }),
    });
    return r.ok ? `signature créée · id ${r.data.id ?? "?"}` : `erreur ${r.status}`;
  });

  // Secret non-HTTP via secret() : DATABASE_URL (valeur brute, jamais renvoyée)
  result.dbConfigured = await feature(async () => !!(await secret("DATABASE_URL")));

  // Preuve : aucune clé HTTP dans process.env de l'app.
  result._keysInProcess = Object.keys(PROVIDERS).filter((k) => process.env[k]);

  return Response.json(result);
}
