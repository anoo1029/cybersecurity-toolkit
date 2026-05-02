import { useState } from "react";
import { Copy, Check } from "lucide-react";

type Mode = "encode" | "decode";
type Format = "base64" | "hex" | "url" | "binary";

const FORMAT_LABELS: Record<Format, string> = {
  base64: "BASE64",
  hex: "HEX",
  url: "URL",
  binary: "BINARY",
};

function encode(text: string, format: Format): string {
  try {
    switch (format) {
      case "base64":
        return btoa(unescape(encodeURIComponent(text)));
      case "hex":
        return Array.from(new TextEncoder().encode(text))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
      case "url":
        return encodeURIComponent(text);
      case "binary":
        return Array.from(new TextEncoder().encode(text))
          .map((b) => b.toString(2).padStart(8, "0"))
          .join(" ");
    }
  } catch {
    return "[ERROR] Invalid input for encoding";
  }
}

function decode(text: string, format: Format): string {
  try {
    switch (format) {
      case "base64":
        return decodeURIComponent(escape(atob(text.trim())));
      case "hex": {
        const bytes = text.trim().split(/\s+/).map((h) => parseInt(h, 16));
        if (bytes.some(isNaN)) return "[ERROR] Invalid hex input";
        return new TextDecoder().decode(new Uint8Array(bytes));
      }
      case "url":
        return decodeURIComponent(text);
      case "binary": {
        const bytes = text.trim().split(/\s+/).map((b) => parseInt(b, 2));
        if (bytes.some(isNaN)) return "[ERROR] Invalid binary input";
        return new TextDecoder().decode(new Uint8Array(bytes));
      }
    }
  } catch {
    return "[ERROR] Invalid input for decoding";
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      data-testid="btn-copy-output"
      onClick={copy}
      className="flex items-center gap-1 px-3 py-1 border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all text-xs"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

export function EncoderDecoder() {
  const [mode, setMode] = useState<Mode>("encode");
  const [format, setFormat] = useState<Format>("base64");
  const [input, setInput] = useState("");

  const output = input ? (mode === "encode" ? encode(input, format) : decode(input, format)) : "";

  const swap = () => {
    setMode((m) => (m === "encode" ? "decode" : "encode"));
    setInput(output);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: ENCODE / DECODE</h2>
        <p className="text-muted-foreground text-sm">Transform data between Base64, Hex, URL, and Binary encodings.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex border border-border overflow-hidden">
          {(["encode", "decode"] as Mode[]).map((m) => (
            <button
              key={m}
              data-testid={`btn-mode-${m}`}
              onClick={() => setMode(m)}
              className={`px-5 py-2 text-sm font-bold transition-all ${
                mode === m
                  ? "bg-primary text-background"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex border border-border overflow-hidden">
          {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
            <button
              key={f}
              data-testid={`btn-format-${f}`}
              onClick={() => setFormat(f)}
              className={`px-4 py-2 text-sm font-bold transition-all ${
                format === f
                  ? "bg-primary/20 text-primary border-r border-border last:border-r-0"
                  : "text-muted-foreground hover:text-primary border-r border-border last:border-r-0"
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {">> INPUT"} {mode === "encode" ? "(plaintext)" : `(${FORMAT_LABELS[format]})`}
            </span>
            {input && <CopyButton text={input} />}
          </div>
          <textarea
            data-testid="input-encode"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-black border border-border text-foreground p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono text-sm resize-none min-h-[240px]"
            placeholder={`Paste ${mode === "encode" ? "plaintext" : FORMAT_LABELS[format] + " encoded"} input here...`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {">> OUTPUT"} {mode === "encode" ? `(${FORMAT_LABELS[format]})` : "(plaintext)"}
            </span>
            {output && <CopyButton text={output} />}
          </div>
          <div
            data-testid="output-encode"
            className="flex-1 bg-black border border-border text-primary p-4 font-mono text-sm min-h-[240px] overflow-auto whitespace-pre-wrap break-all"
          >
            {output || <span className="text-muted-foreground opacity-40">Output appears here...</span>}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          data-testid="btn-swap"
          onClick={swap}
          disabled={!output}
          className="px-6 py-2 border border-primary text-primary hover:bg-primary/10 transition-all font-bold text-sm disabled:opacity-30"
        >
          SWAP INPUT / OUTPUT
        </button>
      </div>
    </div>
  );
}
