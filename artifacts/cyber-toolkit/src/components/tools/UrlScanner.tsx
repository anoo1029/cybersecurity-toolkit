import { useState, useMemo } from "react";
import { Link as LinkIcon, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface RedFlag {
  text: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export function UrlScanner() {
  const [urlInput, setUrlInput] = useState("");

  const analysis = useMemo(() => {
    const rawUrl = urlInput.trim();
    if (!rawUrl) return null;

    let urlObj: URL;
    let validUrl = true;

    try {
      urlObj = new URL(rawUrl.startsWith("http") ? rawUrl : `http://${rawUrl}`);
    } catch {
      validUrl = false;
      return { valid: false };
    }

    const flags: RedFlag[] = [];
    let score = 0;

    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    const protocol = urlObj.protocol;

    // HTTP vs HTTPS
    if (protocol === "http:") {
      flags.push({ text: "Insecure protocol (HTTP)", severity: "MEDIUM" });
      score += 20;
    }

    // IP Address instead of domain
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(domain)) {
      flags.push({ text: "IP Address used instead of domain name", severity: "HIGH" });
      score += 40;
    }

    // URL Length
    if (rawUrl.length > 75) {
      flags.push({ text: "Unusually long URL", severity: "LOW" });
      score += 10;
    }

    // Excessive subdomains
    const parts = domain.split(".");
    if (parts.length > 3 && parts[parts.length-2] !== "co") {
      flags.push({ text: "Excessive subdomains", severity: "MEDIUM" });
      score += 15;
    }

    // Suspicious TLDs
    const tld = parts[parts.length - 1];
    const badTlds = ["tk", "ml", "ga", "cf", "gq", "xyz", "zip", "review", "country", "kim", "cricket"];
    if (badTlds.includes(tld)) {
      flags.push({ text: `Suspicious TLD (.${tld})`, severity: "HIGH" });
      score += 30;
    }

    // @ symbol
    if (rawUrl.includes("@")) {
      flags.push({ text: "Contains @ symbol (Credentials/Auth bypass)", severity: "HIGH" });
      score += 50;
    }

    // Punycode
    if (domain.includes("xn--")) {
      flags.push({ text: "Punycode domain (Possible homograph attack)", severity: "HIGH" });
      score += 40;
    }

    // Shorteners
    const shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd"];
    if (shorteners.some(s => domain.includes(s))) {
      flags.push({ text: "URL shortener detected (Destination hidden)", severity: "MEDIUM" });
      score += 20;
    }

    // Hex encoding in path
    if (/%[0-9A-Fa-f]{2}/.test(path)) {
      flags.push({ text: "URL encoding in path", severity: "LOW" });
      score += 5;
    }

    // Suspicious keywords in non-matching domain
    const keywords = ["login", "secure", "account", "verify", "banking", "paypal", "amazon", "apple", "microsoft"];
    keywords.forEach(kw => {
      if (rawUrl.includes(kw) && !domain.includes(kw)) {
        flags.push({ text: `Suspicious use of brand keyword: ${kw}`, severity: "HIGH" });
        score += 35;
      }
    });

    score = Math.min(100, score);

    let verdict = "SAFE";
    let color = "text-primary";
    
    if (score >= 60) {
      verdict = "LIKELY MALICIOUS";
      color = "text-destructive";
    } else if (score >= 20) {
      verdict = "SUSPICIOUS";
      color = "text-yellow-500";
    }

    return { 
      valid: true,
      score, 
      flags, 
      verdict, 
      color,
      parsed: {
        protocol,
        domain,
        tld,
        path,
        query: urlObj.search
      }
    };
  }, [urlInput]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: URL SCANNER</h2>
        <p className="text-muted-foreground text-sm">Static analysis of URL structure to detect malicious patterns.</p>
      </div>

      <div className="flex gap-2">
        <input
          data-testid="input-url"
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="flex-1 bg-input border border-border text-foreground p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary terminal-glow transition-all font-mono text-sm"
          placeholder="Enter URL (e.g. https://secure-login.verify-account.tk/login?id=1)"
        />
      </div>

      {!analysis ? (
        <div className="bg-black border border-border p-8 text-center text-muted-foreground font-mono text-sm h-[400px] flex items-center justify-center">
          [ AWAITING TARGET URL ]
        </div>
      ) : !analysis.valid ? (
        <div className="bg-black border border-border p-8 text-center text-destructive font-mono text-sm h-[400px] flex items-center justify-center font-bold">
          [ ERROR: INVALID URL FORMAT ]
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          
          {/* Risk Card */}
          <div className="bg-card border border-border p-6 flex flex-col justify-center items-center text-center space-y-4">
            <div className="text-sm font-bold text-muted-foreground">THREAT LEVEL</div>
            <div className={`text-6xl font-bold ${analysis.color} terminal-text-glow`}>
              {analysis.score}
            </div>
            <div className="w-full h-2 bg-black overflow-hidden">
              <div 
                className={`h-full ${analysis.color.replace('text-', 'bg-')} transition-all duration-1000`}
                style={{ width: `${analysis.score}%` }}
              />
            </div>
            <div data-testid="text-verdict" className={`font-bold flex items-center gap-2 ${analysis.color}`}>
              {analysis.verdict === "SAFE" && <ShieldCheck size={20} />}
              {analysis.verdict === "SUSPICIOUS" && <ShieldAlert size={20} />}
              {analysis.verdict === "LIKELY MALICIOUS" && <ShieldX size={20} />}
              {analysis.verdict}
            </div>
          </div>

          {/* Parsed Output */}
          <div className="bg-black border border-border p-4 font-mono text-sm space-y-2 lg:col-span-2 overflow-x-auto">
            <div className="text-muted-foreground mb-4">{"//"} TARGET ACQUIRED: PARSING</div>
            <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-border/30 pb-2">
              <span className="text-muted-foreground">PROTOCOL:</span>
              <span className="text-foreground">{analysis.parsed.protocol}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-border/30 pb-2">
              <span className="text-muted-foreground">DOMAIN:</span>
              <span className="text-foreground">{analysis.parsed.domain}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-border/30 pb-2">
              <span className="text-muted-foreground">TLD:</span>
              <span className="text-foreground">.{analysis.parsed.tld}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 border-b border-border/30 pb-2">
              <span className="text-muted-foreground">PATH:</span>
              <span className="text-foreground">{analysis.parsed.path || "/"}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 pb-2">
              <span className="text-muted-foreground">QUERY:</span>
              <span className="text-foreground break-all">{analysis.parsed.query || "none"}</span>
            </div>
          </div>

          {/* Flags */}
          <div className="bg-black border border-border p-4 font-mono text-sm lg:col-span-3 h-[250px] overflow-y-auto space-y-2">
            <div className="text-muted-foreground mb-2">{"//"} HEURISTIC ANALYSIS RESULTS</div>
            {analysis.flags.length === 0 ? (
              <div className="text-primary">{">>"} CLEAN. NO KNOWN THREAT PATTERNS DETECTED.</div>
            ) : (
              analysis.flags.map((flag, i) => (
                <div key={i} className="flex gap-2">
                  <span className={
                    flag.severity === "HIGH" ? "text-destructive" :
                    flag.severity === "MEDIUM" ? "text-yellow-500" :
                    "text-primary"
                  }>
                    [{flag.severity}]
                  </span>
                  <span className="text-foreground">{flag.text}</span>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
