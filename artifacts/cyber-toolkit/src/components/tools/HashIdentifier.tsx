import { useState } from "react";

interface HashMatch {
  type: string;
  confidence: string;
  desc: string;
}

export function HashIdentifier() {
  const [hashInput, setHashInput] = useState("");
  const [textToHash, setTextToHash] = useState("");
  const [generatedHash, setGeneratedHash] = useState("");

  const identifyHash = (input: string): HashMatch[] => {
    const cleanInput = input.trim();
    if (!cleanInput) return [];

    const matches: HashMatch[] = [];
    const isHex = /^[a-fA-F0-9]+$/.test(cleanInput);
    const len = cleanInput.length;

    if (cleanInput.startsWith("$2a$") || cleanInput.startsWith("$2b$") || cleanInput.startsWith("$2y$")) {
      matches.push({ type: "bcrypt", confidence: "HIGH", desc: "Blowfish-based crypt password hash" });
    }

    if (isHex) {
      if (len === 8) matches.push({ type: "CRC32", confidence: "MEDIUM", desc: "Cyclic redundancy check" });
      if (len === 16) matches.push({ type: "MySQL323", confidence: "LOW", desc: "Old MySQL password hash" });
      if (len === 32) matches.push({ type: "MD5", confidence: "HIGH", desc: "Message-Digest Algorithm 5" });
      if (len === 40) matches.push({ type: "SHA-1", confidence: "HIGH", desc: "Secure Hash Algorithm 1" });
      if (len === 56) matches.push({ type: "SHA-224", confidence: "HIGH", desc: "Secure Hash Algorithm 224-bit" });
      if (len === 64) matches.push({ type: "SHA-256", confidence: "HIGH", desc: "Secure Hash Algorithm 256-bit" });
      if (len === 96) matches.push({ type: "SHA-384", confidence: "HIGH", desc: "Secure Hash Algorithm 384-bit" });
      if (len === 128) matches.push({ type: "SHA-512", confidence: "HIGH", desc: "Secure Hash Algorithm 512-bit" });
    }

    return matches;
  };

  const matches = identifyHash(hashInput);

  const generateHash = async () => {
    if (!textToHash) return;
    const msgUint8 = new TextEncoder().encode(textToHash);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    setGeneratedHash(hashHex);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: HASH IDENTIFIER</h2>
        <p className="text-muted-foreground text-sm">Analyze hash string formats and identify potential hashing algorithms.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Identifier */}
        <div className="space-y-4">
          <h3 className="font-bold text-primary border-b border-border pb-2">IDENTIFY HASH</h3>
          <input
            data-testid="input-hash"
            type="text"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            className="w-full bg-input border border-border text-foreground p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary terminal-glow transition-all font-mono text-sm"
            placeholder="Enter hash (e.g. 5d41402abc4b2a76b9719d911017c592)"
          />
          
          <div className="bg-black border border-border p-4 font-mono text-sm h-[200px] overflow-y-auto">
            <div className="text-muted-foreground mb-2">{"//"} IDENTIFICATION LOG</div>
            {!hashInput ? (
              <div className="text-muted-foreground animate-pulse">Awaiting hash input...</div>
            ) : matches.length === 0 ? (
              <div className="text-destructive">{">>"} [UNKNOWN] Format not recognized</div>
            ) : (
              matches.map((match, i) => (
                <div key={i} className="mb-3 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex gap-2">
                    <span className="text-primary">{">>"}</span>
                    <span className="text-foreground font-bold">[IDENTIFIED] {match.type}</span>
                  </div>
                  <div className="pl-6 text-muted-foreground">Confidence: <span className={match.confidence === "HIGH" ? "text-primary" : "text-yellow-500"}>{match.confidence}</span></div>
                  <div className="pl-6 text-muted-foreground">Desc: {match.desc}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Generator */}
        <div className="space-y-4">
          <h3 className="font-bold text-primary border-b border-border pb-2">GENERATE SHA-256</h3>
          <div className="flex gap-2">
            <input
              data-testid="input-text-hash"
              type="text"
              value={textToHash}
              onChange={(e) => setTextToHash(e.target.value)}
              className="flex-1 bg-input border border-border text-foreground p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary terminal-glow transition-all font-mono text-sm"
              placeholder="Enter text to hash..."
              onKeyDown={(e) => e.key === "Enter" && generateHash()}
            />
            <button
              data-testid="btn-generate-hash"
              onClick={generateHash}
              className="px-4 py-2 bg-primary/10 border border-primary text-primary hover:bg-primary/20 hover:terminal-glow transition-all font-bold"
            >
              COMPUTE
            </button>
          </div>

          <div className="bg-black border border-border p-4 font-mono text-sm h-[200px] flex flex-col justify-center items-center break-all">
            {generatedHash ? (
              <div className="text-primary text-center p-4 animate-in zoom-in-95 duration-300">
                {generatedHash}
              </div>
            ) : (
              <div className="text-muted-foreground animate-pulse text-center">
                Awaiting payload for digest...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
