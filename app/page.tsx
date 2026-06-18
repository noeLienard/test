"use client";

import { useEffect, useState } from "react";

type Health = {
  proxyActive: boolean;
  nombre: string | null;
  httpKeys: { name: string; tool: string; inProcessEnv: string | null }[];
  nonHttp: { name: string; tool: string; inProcessEnv: string | null }[];
  leakedHttpKeys: string[];
};

export default function Page() {
  const [health, setHealth] = useState<Health | null>(null);
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
  }, []);

  async function generate() {
    setLoading(true);
    try {
      const r = await fetch("/api/brief");
      setBrief(await r.json());
    } finally {
      setLoading(false);
    }
  }

  const dot = (ok: boolean) => (ok ? "✅" : "❌");

  return (
    <main style={{ minHeight: "100vh", background: "#0b1220", color: "#fff", padding: "2rem 1.5rem 4rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <header>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 600 }}>
            <span style={{ color: "#006BFF" }}>Elding</span> · AI Daily Brief
          </h1>
          <p style={{ color: "#94a3b8", fontSize: ".9rem", marginTop: 4 }}>
            9 secrets, 100% hostés par Elding. Aucune clé dans le code ni le process.
          </p>
        </header>

        {health && (
          <section style={{ background: "#131c2e", borderRadius: 14, padding: "1.2rem", border: "1px solid #1e293b" }}>
            <div style={{ fontSize: ".85rem", color: "#94a3b8", marginBottom: 10 }}>
              Proxy actif : {dot(health.proxyActive)} · Clés HTTP fuitées dans process.env :{" "}
              <strong style={{ color: health.leakedHttpKeys.length === 0 ? "#4ade80" : "#f87171" }}>
                {health.leakedHttpKeys.length === 0 ? "aucune ✓" : health.leakedHttpKeys.join(", ")}
              </strong>
            </div>
            <div style={{ fontSize: ".95rem", marginBottom: 12 }}>
              NOMBRE (via <code>secret()</code>) :{" "}
              <strong style={{ color: "#006BFF", fontSize: "1.1rem" }}>
                {health.nombre ?? "absent du set"}
              </strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: ".82rem" }}>
              {[...health.httpKeys, ...health.nonHttp].map((k) => (
                <div key={k.name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#0b1220", borderRadius: 8 }}>
                  <span style={{ fontFamily: "monospace" }}>{k.name}</span>
                  <span style={{ color: "#64748b" }}>{k.tool} · {dot(k.inProcessEnv === null)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => void generate()}
          disabled={loading}
          style={{ width: "fit-content", padding: "0.8rem 1.5rem", borderRadius: 12, border: "none", background: "#006BFF", color: "#fff", fontWeight: 600, cursor: "pointer", opacity: loading ? 0.5 : 1 }}
        >
          {loading ? "Génération..." : "Générer le brief"}
        </button>

        {brief && (
          <section style={{ background: "#131c2e", borderRadius: 14, padding: "1.2rem", border: "1px solid #1e293b" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: ".82rem", color: "#cbd5e1" }}>
              {JSON.stringify(brief, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}
