import { useState } from "react";
import { Search } from "lucide-react";

const COMMON_SUBDOMAINS = [
  "www", "mail", "ftp", "admin", "dev", "api", "test",
  "staging", "app", "blog", "shop", "m", "vpn", "smtp",
  "pop", "imap", "ns1", "ns2", "cdn", "static", "media",
  "img", "assets", "portal", "dashboard", "remote", "ssh",
];

interface SubResult {
  subdomain: string;
  fqdn: string;
  status: "found" | "not-found" | "checking" | "pending";
  ip?: string;
}

async function checkSubdomain(fqdn: string): Promise<{ found: boolean; ip?: string }> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(fqdn)}&type=A`,
      { headers: { Accept: "application/dns-json" } }
    );
    if (!res.ok) return { found: false };
    const data = await res.json();
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      const aRecord = data.Answer.find((r: { type: number }) => r.type === 1);
      return { found: true, ip: aRecord?.data };
    }
    return { found: false };
  } catch {
    return { found: false };
  }
}

export function SubdomainFinder() {
  const [domain, setDomain] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<SubResult[]>([]);
  const [done, setDone] = useState(false);
  const [aborted, setAborted] = useState(false);
  const abortRef = { current: false };

  const startScan = async () => {
    const target = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!target) return;

    abortRef.current = false;
    setAborted(false);
    setScanning(true);
    setDone(false);

    const initial: SubResult[] = COMMON_SUBDOMAINS.map((sub) => ({
      subdomain: sub,
      fqdn: `${sub}.${target}`,
      status: "pending",
    }));
    setResults(initial);

    const CONCURRENCY = 6;
    const chunks: string[][] = [];
    for (let i = 0; i < COMMON_SUBDOMAINS.length; i += CONCURRENCY) {
      chunks.push(COMMON_SUBDOMAINS.slice(i, i + CONCURRENCY));
    }

    for (const chunk of chunks) {
      if (abortRef.current) break;

      setResults((prev) =>
        prev.map((r) =>
          chunk.includes(r.subdomain) ? { ...r, status: "checking" } : r
        )
      );

      await Promise.all(
        chunk.map(async (sub) => {
          const fqdn = `${sub}.${target}`;
          const { found, ip } = await checkSubdomain(fqdn);
          if (!abortRef.current) {
            setResults((prev) =>
              prev.map((r) =>
                r.subdomain === sub
                  ? { ...r, status: found ? "found" : "not-found", ip }
                  : r
              )
            );
          }
        })
      );
    }

    setScanning(false);
    setDone(true);
  };

  const stopScan = () => {
    abortRef.current = true;
    setScanning(false);
    setAborted(true);
    setDone(true);
  };

  const reset = () => {
    setResults([]);
    setDone(false);
    setAborted(false);
  };

  const found = results.filter((r) => r.status === "found");
  const checked = results.filter((r) => r.status !== "pending" && r.status !== "checking").length;

  const statusColor = (s: SubResult["status"]) => {
    if (s === "found") return "text-primary";
    if (s === "not-found") return "text-muted-foreground";
    if (s === "checking") return "text-primary animate-pulse";
    return "text-muted-foreground/40";
  };

  const statusLabel = (s: SubResult["status"]) => {
    if (s === "found") return "[FOUND]";
    if (s === "not-found") return "[NOT FOUND]";
    if (s === "checking") return "[CHECKING...]";
    return "[--]";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: SUBDOMAIN FINDER</h2>
        <p className="text-muted-foreground text-sm">
          Check {COMMON_SUBDOMAINS.length} common subdomains via Cloudflare DNS over HTTPS (DoH).
        </p>
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
        <input
          data-testid="input-domain"
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !scanning && startScan()}
          disabled={scanning}
          className="flex-1 bg-input border border-border text-foreground p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
          placeholder="example.com"
        />
        {!scanning ? (
          <button
            data-testid="btn-scan-sub"
            onClick={startScan}
            disabled={!domain.trim()}
            className="px-6 py-3 bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all font-bold flex items-center gap-2 justify-center disabled:opacity-40"
          >
            <Search size={18} />
            SCAN
          </button>
        ) : (
          <button
            data-testid="btn-stop-sub"
            onClick={stopScan}
            className="px-6 py-3 bg-destructive/10 border border-destructive text-destructive hover:bg-destructive/20 transition-all font-bold"
          >
            ABORT
          </button>
        )}
        {results.length > 0 && !scanning && (
          <button
            data-testid="btn-reset-sub"
            onClick={reset}
            className="px-6 py-3 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-all font-bold"
          >
            CLEAR
          </button>
        )}
      </div>

      <div className="bg-black border border-border p-4 font-mono text-sm min-h-[380px] relative">
        <div className="text-muted-foreground mb-3">{"// SUBDOMAIN SCAN OUTPUT"}</div>

        {results.length === 0 && (
          <div className="text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-50">
            [ IDLE — ENTER DOMAIN AND PRESS SCAN ]
          </div>
        )}

        {scanning && (
          <div className="text-xs text-primary mb-3 flex items-center gap-2">
            <span className="terminal-cursor">_</span>
            PROBING... {checked}/{COMMON_SUBDOMAINS.length}
          </div>
        )}

        {done && (
          <div className="text-xs text-muted-foreground mb-3">
            {">>"} SCAN {aborted ? "ABORTED" : "COMPLETE"} — {found.length} SUBDOMAINS FOUND
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((r) => (
              <div
                key={r.subdomain}
                data-testid={`sub-row-${r.subdomain}`}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <span className="text-primary w-4">{">>"}</span>
                <span className="text-muted-foreground w-20">{r.subdomain}</span>
                <span className="text-foreground/50 hidden sm:inline">→</span>
                <span className="text-foreground/70 hidden sm:inline truncate max-w-[180px]">{r.fqdn}</span>
                <span className={`w-28 font-bold ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                {r.ip && r.status === "found" && (
                  <span className="text-muted-foreground text-xs">{r.ip}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {done && found.length > 0 && (
        <div className="border border-primary/30 p-4">
          <div className="text-xs text-muted-foreground mb-3">{"// FOUND SUBDOMAINS"}</div>
          <div className="flex flex-wrap gap-2">
            {found.map((r) => (
              <span
                key={r.subdomain}
                data-testid={`found-badge-${r.subdomain}`}
                className="px-3 py-1 border border-primary text-primary text-xs font-bold"
              >
                {r.fqdn}
                {r.ip && <span className="text-muted-foreground ml-2">({r.ip})</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
