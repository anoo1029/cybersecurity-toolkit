import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  valid: boolean;
  error?: string;
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function decodeJwt(token: string): DecodedJwt | { error: string } {
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      return { error: "Invalid JWT: expected 3 parts (header.payload.signature)" };
    }
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return {
      header,
      payload,
      signature: parts[2],
      valid: true,
    };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed to decode JWT" };
  }
}

function formatTime(unix: number): string {
  try {
    return new Date(unix * 1000).toUTCString();
  } catch {
    return String(unix);
  }
}

function isExpired(exp: unknown): boolean {
  if (typeof exp !== "number") return false;
  return Date.now() / 1000 > exp;
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

function JsonBlock({
  data,
  label,
  testId,
}: {
  data: Record<string, unknown>;
  label: string;
  testId: string;
}) {
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{">>"} {label}</span>
        <CopyButton text={json} />
      </div>
      <pre
        data-testid={testId}
        className="bg-black border border-border p-4 text-primary text-xs font-mono overflow-auto max-h-[280px] whitespace-pre-wrap"
      >
        {json.split("\n").map((line, i) => {
          const keyMatch = line.match(/^(\s*)"([^"]+)":/);
          if (keyMatch) {
            const indent = keyMatch[1];
            const key = keyMatch[2];
            const rest = line.slice(keyMatch[0].length);
            return (
              <span key={i}>
                {indent}
                <span className="text-yellow-400">"{key}"</span>:{rest}
                {"\n"}
              </span>
            );
          }
          return <span key={i}>{line}{"\n"}</span>;
        })}
      </pre>
    </div>
  );
}

export function JwtDecoder() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<DecodedJwt | { error: string } | null>(null);

  const decode = () => {
    if (!token.trim()) return;
    setResult(decodeJwt(token));
  };

  const clear = () => {
    setToken("");
    setResult(null);
  };

  const expired = result && "payload" in result && isExpired(result.payload.exp);
  const exp = result && "payload" in result ? result.payload.exp : undefined;
  const iat = result && "payload" in result ? result.payload.iat : undefined;
  const nbf = result && "payload" in result ? result.payload.nbf : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: JWT DECODER</h2>
        <p className="text-muted-foreground text-sm">
          Decode JSON Web Tokens to inspect header, payload, and signature. Does not verify signature.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{">> PASTE JWT TOKEN"}</span>
          {token && <CopyButton text={token} />}
        </div>
        <textarea
          data-testid="input-jwt"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full bg-black border border-border text-foreground p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-xs resize-none h-28"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."
        />
      </div>

      <div className="flex gap-3">
        <button
          data-testid="btn-decode-jwt"
          onClick={decode}
          disabled={!token.trim()}
          className="px-6 py-3 bg-primary/10 border border-primary text-primary hover:bg-primary/20 transition-all font-bold disabled:opacity-40"
        >
          DECODE
        </button>
        {result && (
          <button
            data-testid="btn-clear-jwt"
            onClick={clear}
            className="px-6 py-3 border border-border text-muted-foreground hover:text-foreground transition-all font-bold"
          >
            CLEAR
          </button>
        )}
      </div>

      {result && "error" in result && (
        <div className="bg-black border border-destructive p-4 text-destructive font-mono text-sm">
          {">>"} [ERROR] {result.error}
        </div>
      )}

      {result && "header" in result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-black border border-border p-3 text-xs font-mono flex flex-wrap gap-4">
            <span>
              ALG:{" "}
              <span className="text-primary font-bold">
                {String(result.header.alg ?? "?")}
              </span>
            </span>
            <span>
              TYPE:{" "}
              <span className="text-primary font-bold">
                {String(result.header.typ ?? "?")}
              </span>
            </span>
            {exp !== undefined && (
              <span>
                EXPIRES:{" "}
                <span className={expired ? "text-destructive font-bold" : "text-primary"}>
                  {expired ? "EXPIRED" : "VALID"} — {typeof exp === "number" ? formatTime(exp) : String(exp)}
                </span>
              </span>
            )}
            {iat !== undefined && typeof iat === "number" && (
              <span>
                ISSUED: <span className="text-foreground/70">{formatTime(iat)}</span>
              </span>
            )}
            {nbf !== undefined && typeof nbf === "number" && (
              <span>
                NOT BEFORE: <span className="text-foreground/70">{formatTime(nbf)}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <JsonBlock data={result.header} label="HEADER" testId="output-jwt-header" />
            <JsonBlock data={result.payload} label="PAYLOAD" testId="output-jwt-payload" />
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">{">>"} SIGNATURE (base64url)</span>
            <div
              data-testid="output-jwt-signature"
              className="bg-black border border-border p-4 text-muted-foreground text-xs font-mono break-all"
            >
              {result.signature}
            </div>
            <p className="text-xs text-yellow-500/70">
              [!] Signature verification requires the secret/public key — not performed client-side.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
