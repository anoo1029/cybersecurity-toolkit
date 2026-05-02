import { useState, useMemo } from "react";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";

export function CaesarCipher() {
  const [mode, setMode] = useState<"ENCODE" | "DECODE">("ENCODE");
  const [text, setText] = useState("");
  const [shift, setShift] = useState(3);
  const [showBruteForce, setShowBruteForce] = useState(false);

  const processText = (input: string, shiftAmount: number, isDecode: boolean) => {
    let s = shiftAmount;
    if (isDecode) s = (26 - s) % 26;

    return input.replace(/[a-zA-Z]/g, (char) => {
      const base = char <= 'Z' ? 65 : 97;
      return String.fromCharCode(((char.charCodeAt(0) - base + s) % 26) + base);
    });
  };

  const result = useMemo(() => processText(text, shift, mode === "DECODE"), [text, shift, mode]);

  const bruteForceResults = useMemo(() => {
    if (!text || !showBruteForce || mode !== "DECODE") return [];
    return Array.from({ length: 25 }, (_, i) => ({
      shift: i + 1,
      text: processText(text, i + 1, true)
    }));
  }, [text, showBruteForce, mode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: CAESAR CIPHER</h2>
        <p className="text-muted-foreground text-sm">Classic substitution cipher tool for encoding, decoding, and brute-forcing.</p>
      </div>

      <div className="flex gap-4 items-center">
        <button
          data-testid="btn-mode-encode"
          onClick={() => setMode("ENCODE")}
          className={`px-4 py-2 font-bold transition-all border ${
            mode === "ENCODE" 
              ? "bg-primary text-primary-foreground border-primary terminal-glow" 
              : "bg-transparent text-muted-foreground border-border hover:text-primary hover:border-primary/50"
          }`}
        >
          ENCODE
        </button>
        <button
          data-testid="btn-mode-decode"
          onClick={() => setMode("DECODE")}
          className={`px-4 py-2 font-bold transition-all border ${
            mode === "DECODE" 
              ? "bg-primary text-primary-foreground border-primary terminal-glow" 
              : "bg-transparent text-muted-foreground border-border hover:text-primary hover:border-primary/50"
          }`}
        >
          DECODE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <textarea
            data-testid="input-cipher"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-[200px] bg-input border border-border text-foreground p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary terminal-glow transition-all resize-none font-mono text-sm"
            placeholder={`Enter text to ${mode.toLowerCase()}...`}
          />

          <div className="bg-card border border-border p-4 space-y-4">
            <div className="flex justify-between items-center text-sm font-bold text-primary">
              <span>SHIFT PARAMETER</span>
              <span data-testid="text-shift">{shift}</span>
            </div>
            <input
              data-testid="slider-shift"
              type="range"
              min="1"
              max="25"
              value={shift}
              onChange={(e) => setShift(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="text-xs text-muted-foreground font-mono flex justify-between">
              <span>A &#8594; {String.fromCharCode(65 + (mode === "ENCODE" ? shift : (26 - shift) % 26))}</span>
              <span>Z &#8594; {String.fromCharCode(65 + ((25 + (mode === "ENCODE" ? shift : (26 - shift) % 26)) % 26))}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute top-0 right-0 p-2 flex gap-2">
              <button 
                data-testid="btn-copy"
                onClick={copyToClipboard}
                className="text-muted-foreground hover:text-primary transition-colors p-1"
                title="Copy to clipboard"
              >
                <Copy size={16} />
              </button>
            </div>
            <div className="w-full h-[200px] bg-black border border-border text-primary p-4 overflow-y-auto font-mono text-sm break-all">
              <div className="text-muted-foreground mb-2">{"//"} OUTPUT</div>
              {result || <span className="text-muted-foreground animate-pulse">Awaiting input...</span>}
            </div>
          </div>

          {mode === "DECODE" && (
            <div>
              <button
                data-testid="btn-brute-force"
                onClick={() => setShowBruteForce(!showBruteForce)}
                className="w-full px-4 py-2 border border-border text-foreground hover:bg-accent flex items-center justify-between transition-all"
              >
                <span className="font-bold">BRUTE FORCE ALL 25 SHIFTS</span>
                {showBruteForce ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showBruteForce && (
                <div className="mt-2 bg-black border border-border p-4 h-[300px] overflow-y-auto font-mono text-sm space-y-2">
                  {bruteForceResults.map(res => (
                    <div key={res.shift} className="flex gap-4 border-b border-border/30 pb-1">
                      <span className="text-primary w-8 shrink-0">+{res.shift}</span>
                      <span className="text-foreground break-all">{res.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
