import { useState } from "react";
import { Search } from "lucide-react";

type RecordType = "A" | "MX" | "TXT" | "CNAME" | "NS" | "AAAA";

const RECORD_TYPES: RecordType[] = ["A", "AAAA", "MX", "TXT", "CNAME", "NS"];

const TYPE_CODES: Record<RecordType, number> = {
  A: 1,
  AAAA: 28,
  MX: 15,
  TXT: 16,
  CNAME: 5,
  NS: 2,
};

interface DnsRecord {
  name: string;
  type: RecordType;
  ttl: number;
  data: string;
}

interface LookupResult {
  type: RecordType;
  records: DnsRecord[];
  error?: string;
}

async function queryDns(domain: string, type: RecordType): Promise<LookupResult> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { Accept: "application/dns-json" } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.Status !== 0) {
      const rCodes: Record<number, string> = {
        1: "FORMAT ERROR",
        2: "SERVER FAILURE",
        3: "NXDOMAIN (domain not found)",
        4: "NOT IMPLEMENTED",
        5: "REFUSED",
      };
      return {
        type,
        records: [],
        error: rCodes[data.Status] ?? `RCODE ${data.Status}`,
      };
    }

    if (!data.Answer || data.Answer.length === 0) {
      return { type, records: [], error: "NO RECORDS FOUND" };
    }

    const records: DnsRecord[] = data.Answer
      .filter((r: { type: number }) => r.type === TYPE_CODES[type])
      .map((r: { name: string; TTL: number; data: string }) => ({
        name: r.name,
        type,
        ttl: r.TTL,
        data: r.data.replace(/"/g, ""),
      }));

    return { type, records: records.length ? records : [], error: records.length ? undefined : "NO RECORDS FOUND" };
  } catch (e: unknown) {
    return { type, records: [], error: e instanceof Error ? e.message : "LOOKUP FAILED" };
  }
}

export function DnsLookup() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LookupResult[]>([]);
  const [queried, setQueried] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<RecordType>>(
    new Set(["A", "MX", "TXT", "CNAME"])
  );

  const toggleType = (t: RecordType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size === 1) return prev;
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  };

  const lookup = async () => {
    const target = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!target) return;

    setLoading(true);
    setResults([]);
    setQueried(target);

    const types = Array.from(selectedTypes);
    const res = await Promise.all(types.map((t) => queryDns(target, t)));
    setResults(res);
    setLoading(false);
  };

  const hasResults = results.some((r) => r.records.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: DNS LOOKUP</h2>
        <p className="text-muted-foreground text-sm">
          Query DNS records via Cloudflare DNS over HTTPS (DoH). Select record types then enter a domain.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {RECORD_TYPES.map((t) => (
            <button
              key={t}
              data-testid={`btn-type-${t}`}
              onClick={() => toggleType(t)}
              className={`px-4 py-1.5 border text-sm font-bold transition-all ${
                selectedTypes.has(t)
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-col sm:flex-row">
          <input
            data-testid="input-dns-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && lookup()}
            disabled={loading}
            className="flex-1 bg-input border border-border text-foreground p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
            placeholder="example.com"
          />
          <button
            data-testid="btn-dns-lookup"
            onClick={lookup}
            disabled={loading || !domain.trim()}
            className="px-6 py-3 bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all font-bold flex items-center gap-2 justify-center disabled:opacity-40"
          >
            <Search size={18} />
            {loading ? "QUERYING..." : "LOOKUP"}
          </button>
        </div>
      </div>

      <div className="bg-black border border-border p-4 font-mono text-sm min-h-[360px] relative">
        <div className="text-muted-foreground mb-3">{"// DNS QUERY RESULTS"}</div>

        {!loading && results.length === 0 && (
          <div className="text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-50">
            [ IDLE — ENTER DOMAIN AND PRESS LOOKUP ]
          </div>
        )}

        {loading && (
          <div className="text-primary animate-pulse flex items-center gap-2 text-sm">
            <span className="terminal-cursor">_</span>
            QUERYING DNS SERVERS...
          </div>
        )}

        {!loading && queried && (
          <div className="text-xs text-muted-foreground mb-4">
            {">>"} DOMAIN: <span className="text-primary font-bold">{queried}</span>
            {" — "}TYPES: {Array.from(selectedTypes).join(", ")}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-5">
            {results.map((result) => (
              <div key={result.type} data-testid={`dns-section-${result.type}`} className="space-y-2">
                <div className="text-xs font-bold border-b border-border pb-1 flex items-center gap-2">
                  <span className="text-primary">[{result.type}]</span>
                  <span className="text-muted-foreground">{result.error ? result.error : `${result.records.length} record${result.records.length !== 1 ? "s" : ""}`}</span>
                </div>

                {result.records.map((rec, i) => (
                  <div
                    key={i}
                    data-testid={`dns-record-${result.type}-${i}`}
                    className="flex gap-2 text-xs items-start"
                  >
                    <span className="text-primary shrink-0">{">>"}</span>
                    <span
                      className="text-foreground break-all"
                      style={{ wordBreak: "break-word" }}
                    >
                      {rec.data}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-auto pl-4">
                      TTL: {rec.ttl}s
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {!loading && results.length > 0 && !hasResults && (
          <div className="text-yellow-500 text-xs mt-2">
            {">>"} [NOTICE] No DNS records found for the selected types. Domain may not exist or records may be private.
          </div>
        )}
      </div>
    </div>
  );
}
