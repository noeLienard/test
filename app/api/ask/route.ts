import { configure } from "@elding/sdk";

// Exemple minimal : 3 lignes pour appeler une API protégée par Elding.
export async function GET() {
  // 1. configure() → placeholder + proxy. La vraie clé ne touche jamais ce process.
  const { apiKey, baseURL } = await configure("MISTRAL_KEY", "https://api.mistral.ai");

  // 2. fetch normal : on met le placeholder dans le header, le proxy le remplace.
  const res = await fetch(`https://api.mistral.ai/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: "Dis bonjour en une phrase." }],
    }),
  });

  // 3. réponse
  const data = await res.json();
  return Response.json({ reply: data.choices?.[0]?.message?.content });
}
