import { useState, useCallback } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";

const CHARS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

interface Options {
  length: number;
  upper: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

function generatePassword(opts: Options): string {
  let pool = CHARS.lower;
  if (opts.upper) pool += CHARS.upper;
  if (opts.numbers) pool += CHARS.numbers;
  if (opts.symbols) pool += CHARS.symbols;
  if (opts.excludeAmbiguous) pool = pool.replace(/[0Ol1I|]/g, "");
  if (!pool) return "";

  const arr = new Uint32Array(opts.length);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((n) => pool[n % pool.length])
    .join("");
}

function calcEntropy(pool: number, length: number): number {
  if (pool === 0) return 0;
  return Math.floor(length * Math.log2(pool));
}

function getStrengthLabel(entropy: number): { label: string; color: string } {
  if (entropy < 40) return { label: "WEAK", color: "text-destructive" };
  if (entropy < 60) return { label: "FAIR", color: "text-yellow-400" };
  if (entropy < 80) return { label: "STRONG", color: "text-primary" };
  return { label: "VERY STRONG", color: "text-primary" };
}

function Toggle({
  label,
  checked,
  onChange,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  testId: string;
}) {
  return (
    <button
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 px-4 py-2 border transition-all text-sm font-bold ${
        checked
          ? "border-primary text-primary bg-primary/10"
          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
      }`}
    >
      <span
        className={`w-3 h-3 border ${checked ? "bg-primary border-primary" : "border-muted-foreground"}`}
      />
      {label}
    </button>
  );
}

export function PasswordGenerator() {
  const [opts, setOpts] = useState<Options>({
    length: 20,
    upper: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
  });
  const [password, setPassword] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    const pw = generatePassword(opts);
    setPassword(pw);
    setHistory((h) => [pw, ...h].slice(0, 5));
    setCopied(false);
  }, [opts]);

  const copy = (pw: string) => {
    navigator.clipboard.writeText(pw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  let pool = CHARS.lower.length;
  if (opts.upper) pool += CHARS.upper.length;
  if (opts.numbers) pool += CHARS.numbers.length;
  if (opts.symbols) pool += CHARS.symbols.length;
  const entropy = calcEntropy(pool, opts.length);
  const strength = getStrengthLabel(entropy);

  const colorChar = (ch: string) => {
    if (/[A-Z]/.test(ch)) return "text-yellow-400";
    if (/[0-9]/.test(ch)) return "text-blue-400";
    if (/[^a-zA-Z0-9]/.test(ch)) return "text-red-400";
    return "text-primary";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: PASSWORD GENERATOR</h2>
        <p className="text-muted-foreground text-sm">
          Generate cryptographically random passwords using the Web Crypto API.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm w-16 shrink-0">LENGTH</span>
          <input
            data-testid="input-length"
            type="range"
            min={8}
            max={128}
            value={opts.length}
            onChange={(e) => setOpts((o) => ({ ...o, length: Number(e.target.value) }))}
            className="flex-1 accent-primary"
          />
          <span
            data-testid="text-length"
            className="text-primary font-bold w-8 text-right tabular-nums"
          >
            {opts.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Toggle
            label="UPPERCASE"
            checked={opts.upper}
            onChange={(v) => setOpts((o) => ({ ...o, upper: v }))}
            testId="toggle-upper"
          />
          <Toggle
            label="NUMBERS"
            checked={opts.numbers}
            onChange={(v) => setOpts((o) => ({ ...o, numbers: v }))}
            testId="toggle-numbers"
          />
          <Toggle
            label="SYMBOLS"
            checked={opts.symbols}
            onChange={(v) => setOpts((o) => ({ ...o, symbols: v }))}
            testId="toggle-symbols"
          />
          <Toggle
            label="NO AMBIGUOUS"
            checked={opts.excludeAmbiguous}
            onChange={(v) => setOpts((o) => ({ ...o, excludeAmbiguous: v }))}
            testId="toggle-ambiguous"
          />
        </div>
      </div>

      <button
        data-testid="btn-generate"
        onClick={generate}
        className="w-full py-3 border border-primary text-primary hover:bg-primary/10 transition-all font-bold flex items-center justify-center gap-2"
      >
        <RefreshCw size={16} />
        GENERATE PASSWORD
      </button>

      {password && (
        <div className="space-y-3">
          <div className="bg-black border border-primary p-4 flex flex-col gap-3">
            <div
              data-testid="output-password"
              className="font-mono text-lg break-all leading-relaxed"
            >
              {password.split("").map((ch, i) => (
                <span key={i} className={colorChar(ch)}>
                  {ch}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground space-x-4">
                <span>ENTROPY: <span className={strength.color}>{entropy} bits</span></span>
                <span>STRENGTH: <span className={`font-bold ${strength.color}`}>{strength.label}</span></span>
              </div>
              <button
                data-testid="btn-copy-password"
                onClick={() => copy(password)}
                className="flex items-center gap-1 px-3 py-1 border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all text-xs"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
          </div>

          {history.length > 1 && (
            <div className="bg-black border border-border p-4">
              <div className="text-xs text-muted-foreground mb-3">{"// RECENT HISTORY"}</div>
              <div className="space-y-2">
                {history.slice(1).map((pw, i) => (
                  <div
                    key={i}
                    data-testid={`history-item-${i}`}
                    className="flex items-center justify-between gap-3 group"
                  >
                    <span className="font-mono text-xs text-foreground/50 truncate">{pw}</span>
                    <button
                      onClick={() => copy(pw)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-primary transition-all px-2"
                    >
                      COPY
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
