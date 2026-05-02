import { useState } from "react";
import { Search, Copy, Check } from "lucide-react";

interface RdapEvent {
  eventAction: string;
  eventDate: string;
}

interface RdapNameserver {
  ldhName: string;
}

interface RdapEntity {
  roles: string[];
  vcardArray?: [string, [string, unknown, string, string][]][];
  publicIds?: { type: string; identifier: string }[];
}

interface RdapResponse {
  ldhName?: string;
  handle?: string;
  status?: string[];
  events?: RdapEvent[];
  nameservers?: RdapNameserver[];
  entities?: RdapEntity[];
  notices?: { title: string; description: string[] }[];
}

interface ParsedWhois {
  domain: string;
  handle?: string;
  status: string[];
  registered?: string;
  updated?: string;
  expires?: string;
  registrar?: string;
  registrarId?: string;
  registrant?: string;
  nameservers: string[];
  rawEvents: RdapEvent[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toUTCString();
  } catch {
    return iso;
  }
}

function isExpired(isoDate?: string): boolean {
  if (!isoDate) return false;
  return new Date(isoDate) < new Date();
}

function extractEntityName(entity: RdapEntity): string | undefined {
  if (!entity.vcardArray) return undefined;
  const cards = entity.vcardArray[1];
  const fn = cards?.find((c) => c[0] === "fn");
  return fn ? String(fn[3]) : undefined;
}

function parseRdap(data: RdapResponse, domain: string): ParsedWhois {
  const findEvent = (action: string) =>
    data.events?.find((e) => e.eventAction === action)?.eventDate;

  const registrarEntity = data.entities?.find((e) => e.roles?.includes("registrar"));
  const registrantEntity = data.entities?.find((e) => e.roles?.includes("registrant"));

  const registrarName = registrarEntity ? extractEntityName(registrarEntity) : undefined;
  const registrarId = registrarEntity?.publicIds?.find((p) => p.type === "IANA Registrar ID")?.identifier;
  const registrantName = registrantEntity ? extractEntityName(registrantEntity) : undefined;

  return {
    domain: data.ldhName ?? domain,
    handle: data.handle,
    status: data.status ?? [],
    registered: findEvent("registration"),
    updated: findEvent("last changed"),
    expires: findEvent("expiration"),
    registrar: registrarName,
    registrarId,
    registrant: registrantName,
    nameservers: data.nameservers?.map((ns) => ns.ldhName.toUpperCase()) ?? [],
    rawEvents: data.events ?? [],
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="flex items-center gap-1 px-3 py-1 border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all text-xs"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

interface RowProps {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  testId?: string;
}

function Row({ label, value, highlight, warn, testId }: RowProps) {
  return (
    <div data-testid={testId} className="flex gap-2 text-xs sm:text-sm items-start">
      <span className="text-primary shrink-0">{">>"}</span>
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span
        className={
          warn
            ? "text-destructive font-bold"
            : highlight
            ? "text-primary font-bold"
            : "text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function WhoisLookup() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedWhois | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    const target = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    if (!target) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(target)}`, {
        headers: { Accept: "application/rdap+json" },
      });

      if (res.status === 404) throw new Error("Domain not found — may be unregistered or not in RDAP");
      if (!res.ok) throw new Error(`RDAP server returned ${res.status}`);

      const data: RdapResponse = await res.json();
      setResult(parseRdap(data, target));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const expired = isExpired(result?.expires ?? undefined);

  const summaryText = result
    ? [
        `DOMAIN:      ${result.domain}`,
        result.handle ? `HANDLE:      ${result.handle}` : "",
        result.registrar ? `REGISTRAR:   ${result.registrar}` : "",
        result.registrant ? `REGISTRANT:  ${result.registrant}` : "",
        result.registered ? `REGISTERED:  ${formatDate(result.registered)}` : "",
        result.updated ? `UPDATED:     ${formatDate(result.updated)}` : "",
        result.expires ? `EXPIRES:     ${formatDate(result.expires)}` : "",
        `STATUS:      ${result.status.join(", ")}`,
        `NAMESERVERS: ${result.nameservers.join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: WHOIS / RDAP LOOKUP</h2>
        <p className="text-muted-foreground text-sm">
          Query domain registration data via RDAP (Registration Data Access Protocol) — the modern WHOIS replacement.
        </p>
      </div>

      <div className="flex gap-3 flex-col sm:flex-row">
        <input
          data-testid="input-whois-domain"
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && lookup()}
          disabled={loading}
          className="flex-1 bg-input border border-border text-foreground p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
          placeholder="example.com"
        />
        <button
          data-testid="btn-whois-lookup"
          onClick={lookup}
          disabled={loading || !domain.trim()}
          className="px-6 py-3 bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all font-bold flex items-center gap-2 justify-center disabled:opacity-40"
        >
          <Search size={18} />
          {loading ? "QUERYING..." : "LOOKUP"}
        </button>
      </div>

      <div className="bg-black border border-border p-4 font-mono text-sm min-h-[380px] relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted-foreground">{"// RDAP QUERY RESULTS"}</span>
          {summaryText && <CopyButton text={summaryText} />}
        </div>

        {!loading && !result && !error && (
          <div className="text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-50">
            [ IDLE — ENTER DOMAIN AND PRESS LOOKUP ]
          </div>
        )}

        {loading && (
          <div className="text-primary animate-pulse flex items-center gap-2">
            <span className="terminal-cursor">_</span>
            CONTACTING RDAP SERVER...
          </div>
        )}

        {error && (
          <div className="text-destructive font-bold space-y-1">
            <div>{">>"} [ERROR] {error}</div>
            <div className="text-muted-foreground text-xs mt-2">
              Note: RDAP coverage varies by TLD. Some ccTLDs or legacy TLDs may not support RDAP.
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <Row label="DOMAIN:" value={result.domain.toUpperCase()} highlight testId="whois-domain" />

            {result.handle && (
              <Row label="HANDLE:" value={result.handle} testId="whois-handle" />
            )}

            {result.registrar && (
              <Row
                label="REGISTRAR:"
                value={result.registrar + (result.registrarId ? ` (IANA #${result.registrarId})` : "")}
                testId="whois-registrar"
              />
            )}

            {result.registrant && (
              <Row label="REGISTRANT:" value={result.registrant} testId="whois-registrant" />
            )}

            {result.registered && (
              <Row
                label="REGISTERED:"
                value={formatDate(result.registered)}
                testId="whois-registered"
              />
            )}

            {result.updated && (
              <Row label="UPDATED:" value={formatDate(result.updated)} testId="whois-updated" />
            )}

            {result.expires && (
              <Row
                label="EXPIRES:"
                value={`${formatDate(result.expires)}${expired ? " — EXPIRED" : ""}`}
                warn={expired}
                testId="whois-expires"
              />
            )}

            {result.status.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-2">
                  <span className="text-primary">{">>"}</span>
                  <span className="text-muted-foreground w-28 shrink-0">STATUS:</span>
                </div>
                {result.status.map((s, i) => (
                  <div key={i} data-testid={`whois-status-${i}`} className="flex gap-2 ml-6 text-xs">
                    <span className="text-primary">•</span>
                    <span className="text-foreground/80">{s}</span>
                  </div>
                ))}
              </div>
            )}

            {result.nameservers.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex gap-2">
                  <span className="text-primary">{">>"}</span>
                  <span className="text-muted-foreground w-28 shrink-0">NAMESERVERS:</span>
                </div>
                {result.nameservers.map((ns, i) => (
                  <div key={i} data-testid={`whois-ns-${i}`} className="flex gap-2 ml-6 text-xs">
                    <span className="text-primary">•</span>
                    <span className="text-foreground/80">{ns}</span>
                  </div>
                ))}
              </div>
            )}

            {result.rawEvents.length > 0 && (
              <div className="space-y-1 pt-3 border-t border-border mt-3">
                <div className="text-xs text-muted-foreground mb-2">{"// EVENT TIMELINE"}</div>
                {result.rawEvents
                  .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
                  .map((ev, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-primary">{">>"}</span>
                      <span className="text-muted-foreground w-28 shrink-0 uppercase">{ev.eventAction}:</span>
                      <span className="text-foreground/70">{formatDate(ev.eventDate)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-center">
          <div className="border border-border p-3">
            <div className="text-primary font-bold text-sm">{result.nameservers.length}</div>
            <div className="text-muted-foreground mt-1">NAMESERVERS</div>
          </div>
          <div className="border border-border p-3">
            <div className="text-primary font-bold text-sm">{result.status.length}</div>
            <div className="text-muted-foreground mt-1">STATUS FLAGS</div>
          </div>
          <div className="border border-border p-3">
            <div className={`font-bold text-sm ${expired ? "text-destructive" : "text-primary"}`}>
              {expired ? "EXPIRED" : result.expires ? "ACTIVE" : "UNKNOWN"}
            </div>
            <div className="text-muted-foreground mt-1">EXPIRY STATE</div>
          </div>
          <div className="border border-border p-3">
            <div className="text-primary font-bold text-sm">{result.rawEvents.length}</div>
            <div className="text-muted-foreground mt-1">EVENTS</div>
          </div>
        </div>
      )}
    </div>
  );
}
