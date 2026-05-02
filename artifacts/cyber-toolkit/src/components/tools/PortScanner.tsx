import { useState, useRef } from "react";
import { Radio } from "lucide-react";

interface PortResult {
  port: number;
  service: string;
  status: "open" | "closed" | "filtered" | "scanning" | "pending";
  latency: number | null;
}

const PORT_INFO: Record<number, string> = {
  21: "FTP",
  22: "SSH",
  23: "TELNET",
  25: "SMTP",
  53: "DNS",
  80: "HTTP",
  110: "POP3",
  143: "IMAP",
  443: "HTTPS",
  3306: "MySQL",
  3389: "RDP",
  8080: "HTTP-ALT",
  8443: "HTTPS-ALT",
};

const SCAN_PORTS = [21, 22, 23, 25, 53, 80, 110, 143, 443, 3306, 3389, 8080, 8443];

const BROWSER_BLOCKED = new Set([21, 22, 23, 25, 53, 110, 143]);

const PROBE_TIMEOUT = 3000;

function probeHttpPort(hostname: string, port: number, https: boolean): Promise<{ open: boolean; latency: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const protocol = https ? "https" : "http";
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
      resolve({ open: false, latency: Date.now() - start });
    }, PROBE_TIMEOUT);

    fetch(`${protocol}://${hostname}:${port}/`, {
      mode: "no-cors",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(() => {
        clearTimeout(timer);
        resolve({ open: true, latency: Date.now() - start });
      })
      .catch((err: Error) => {
        clearTimeout(timer);
        const elapsed = Date.now() - start;
        if (err.name === "AbortError") {
          resolve({ open: false, latency: elapsed });
        } else {
          resolve({ open: elapsed > 150, latency: elapsed });
        }
      });
  });
}

function probeWsPort(hostname: string, port: number): Promise<{ open: boolean; latency: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;

    const settle = (open: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch (_) { /* ignore */ }
      resolve({ open, latency: Date.now() - start });
    };

    const timer = setTimeout(() => settle(true), PROBE_TIMEOUT);

    let ws: WebSocket;
    try {
      ws = new WebSocket(`ws://${hostname}:${port}`);
    } catch (_) {
      settle(false);
      return;
    }

    ws.onopen = () => settle(true);

    ws.onerror = () => {
      const elapsed = Date.now() - start;
      settle(elapsed > 400);
    };

    ws.onclose = () => {
      const elapsed = Date.now() - start;
      settle(elapsed > 400);
    };
  });
}

async function probePort(hostname: string, port: number): Promise<{ open: boolean; latency: number }> {
  if (port === 80 || port === 8080) return probeHttpPort(hostname, port, false);
  if (port === 443 || port === 8443) return probeHttpPort(hostname, port, true);
  return probeWsPort(hostname, port);
}

export function PortScanner() {
  const [host, setHost] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<PortResult[]>([]);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [scanDuration, setScanDuration] = useState<number | null>(null);
  const [scanDone, setScanDone] = useState(false);
  const abortRef = useRef(false);

  const startScan = async () => {
    const target = host.trim();
    if (!target) return;

    abortRef.current = false;
    setScanning(true);
    setScanDone(false);
    setScanDuration(null);
    const start = Date.now();
    setScanStartTime(start);

    const initial: PortResult[] = SCAN_PORTS.map((port) => ({
      port,
      service: PORT_INFO[port] ?? "UNKNOWN",
      status: "pending",
      latency: null,
    }));
    setResults(initial);

    for (let i = 0; i < SCAN_PORTS.length; i++) {
      if (abortRef.current) break;
      const port = SCAN_PORTS[i];

      setResults((prev) =>
        prev.map((r) => (r.port === port ? { ...r, status: "scanning" } : r))
      );

      let status: PortResult["status"];
      let latency: number | null = null;

      if (BROWSER_BLOCKED.has(port)) {
        status = "filtered";
        latency = null;
      } else {
        const { open, latency: ms } = await probePort(target, port);
        status = open ? "open" : "closed";
        latency = ms;
      }

      if (!abortRef.current) {
        setResults((prev) =>
          prev.map((r) => (r.port === port ? { ...r, status, latency } : r))
        );
      }
    }

    setScanDuration(Date.now() - start);
    setScanDone(true);
    setScanning(false);
  };

  const stopScan = () => {
    abortRef.current = true;
    setScanning(false);
    setScanDone(true);
  };

  const resetScan = () => {
    setResults([]);
    setScanDone(false);
    setScanDuration(null);
    setScanStartTime(null);
  };

  const openCount = results.filter((r) => r.status === "open").length;
  const closedCount = results.filter((r) => r.status === "closed").length;
  const filteredCount = results.filter((r) => r.status === "filtered").length;

  const statusColor = (status: PortResult["status"]) => {
    switch (status) {
      case "open": return "text-primary";
      case "closed": return "text-destructive";
      case "filtered": return "text-yellow-500";
      case "scanning": return "text-primary animate-pulse";
      default: return "text-muted-foreground";
    }
  };

  const statusLabel = (status: PortResult["status"]) => {
    switch (status) {
      case "open": return "[OPEN]";
      case "closed": return "[CLOSED]";
      case "filtered": return "[FILTERED]";
      case "scanning": return "[SCANNING...]";
      default: return "[--]";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: PORT SCAN</h2>
        <p className="text-muted-foreground text-sm">
          Probe common service ports on a host. HTTP/HTTPS ports are probed via fetch; TCP ports via WebSocket.
          Browser security policy restricts FTP, SSH, SMTP, DNS, POP3, IMAP — these show as FILTERED.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          data-testid="input-host"
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !scanning && startScan()}
          className="flex-1 bg-input border border-border text-foreground p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm"
          placeholder="hostname or IP (e.g. example.com or 8.8.8.8)"
          disabled={scanning}
        />
        {!scanning ? (
          <button
            data-testid="btn-scan"
            onClick={startScan}
            disabled={!host.trim()}
            className="px-6 py-3 bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all font-bold flex items-center gap-2 justify-center disabled:opacity-40"
          >
            <Radio size={18} />
            SCAN
          </button>
        ) : (
          <button
            data-testid="btn-stop"
            onClick={stopScan}
            className="px-6 py-3 bg-destructive/10 border border-destructive text-destructive hover:bg-destructive/20 transition-all font-bold flex items-center gap-2 justify-center"
          >
            ABORT
          </button>
        )}
        {results.length > 0 && !scanning && (
          <button
            data-testid="btn-reset"
            onClick={resetScan}
            className="px-6 py-3 bg-transparent border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-all font-bold"
          >
            CLEAR
          </button>
        )}
      </div>

      <div className="bg-black border border-border p-4 font-mono text-sm min-h-[420px] relative">
        <div className="text-muted-foreground mb-4">{"// SCAN OUTPUT"}</div>

        {results.length === 0 && !scanning && (
          <div className="text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-50">
            [ IDLE — ENTER TARGET AND PRESS SCAN ]
          </div>
        )}

        {scanning && results.length > 0 && (
          <div className="text-primary mb-3 flex items-center gap-2 text-xs">
            <span className="terminal-cursor">_</span>
            SCANNING {host.toUpperCase()} — {results.filter((r) => r.status !== "pending" && r.status !== "scanning").length}/{SCAN_PORTS.length} PORTS PROBED
          </div>
        )}

        {scanDone && scanDuration !== null && (
          <div className="text-muted-foreground mb-3 text-xs">
            {">>"} SCAN COMPLETE IN {(scanDuration / 1000).toFixed(2)}s &mdash; {openCount} OPEN &middot; {closedCount} CLOSED &middot; {filteredCount} FILTERED
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((r) => (
              <div
                key={r.port}
                data-testid={`port-row-${r.port}`}
                className="flex items-center gap-0 text-xs sm:text-sm"
              >
                <span className="text-primary w-4 mr-2">{">>"}</span>
                <span className="text-muted-foreground w-6 text-right mr-3 tabular-nums">{r.port}</span>
                <span className="text-muted-foreground w-2 mr-3">/</span>
                <span className="text-foreground/70 w-16 mr-4 uppercase">{r.service}</span>
                <span className={`w-28 font-bold ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                {r.latency !== null && r.status !== "scanning" && (
                  <span className="text-muted-foreground text-xs ml-2">{r.latency}ms</span>
                )}
                {r.status === "filtered" && (
                  <span className="text-yellow-500/60 text-xs ml-2">browser policy</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {scanDone && results.length > 0 && (
        <div className="grid grid-cols-3 gap-4 text-center text-xs font-mono">
          <div className="border border-primary/30 p-3">
            <div className="text-primary text-2xl font-bold">{openCount}</div>
            <div className="text-muted-foreground mt-1">OPEN</div>
          </div>
          <div className="border border-destructive/30 p-3">
            <div className="text-destructive text-2xl font-bold">{closedCount}</div>
            <div className="text-muted-foreground mt-1">CLOSED</div>
          </div>
          <div className="border border-yellow-500/30 p-3">
            <div className="text-yellow-500 text-2xl font-bold">{filteredCount}</div>
            <div className="text-muted-foreground mt-1">FILTERED</div>
          </div>
        </div>
      )}
    </div>
  );
}
