import { useState, useMemo } from "react";

interface RedFlag {
  text: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export function PhishingDetector() {
  const [emailText, setEmailText] = useState("");

  const analysis = useMemo(() => {
    if (!emailText) return null;

    const flags: RedFlag[] = [];
    let score = 0;
    const lowerText = emailText.toLowerCase();

    // Urgency Keywords
    const urgencyKeywords = ["act now", "urgent", "expires", "account suspended", "immediate action", "final notice"];
    urgencyKeywords.forEach(kw => {
      if (lowerText.includes(kw)) {
        flags.push({ text: `Urgency keyword detected: "${kw}"`, severity: "HIGH" });
        score += 25;
      }
    });

    // Suspicious Phrases
    const suspiciousPhrases = ["verify your account", "click here", "confirm your identity", "update your billing", "won a prize"];
    suspiciousPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        flags.push({ text: `Suspicious phrase: "${phrase}"`, severity: "MEDIUM" });
        score += 15;
      }
    });

    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = emailText.match(urlRegex);
    if (urls) {
      urls.forEach(url => {
        flags.push({ text: `Contains link: ${url}`, severity: "LOW" });
        score += 5;
        if (url.includes("bit.ly") || url.includes("tinyurl")) {
          flags.push({ text: `Suspicious shortener: ${url}`, severity: "HIGH" });
          score += 20;
        }
      });
    }

    // Excessive exclamation
    if ((emailText.match(/!{2,}/g) || []).length > 0) {
      flags.push({ text: "Excessive exclamation marks", severity: "LOW" });
      score += 10;
    }

    // ALL CAPS
    const words = emailText.split(/\s+/);
    const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
    if (capsWords.length > 5) {
      flags.push({ text: "High volume of ALL CAPS words", severity: "MEDIUM" });
      score += 15;
    }

    // Openers
    if (lowerText.includes("dear customer") || lowerText.includes("dear user")) {
      flags.push({ text: "Generic greeting (Dear Customer/User)", severity: "MEDIUM" });
      score += 15;
    }

    score = Math.min(100, score);

    let verdict = "SAFE";
    let color = "text-primary";
    
    if (score >= 70) {
      verdict = "LIKELY PHISHING";
      color = "text-destructive";
    } else if (score >= 30) {
      verdict = "SUSPICIOUS";
      color = "text-yellow-500";
    }

    return { score, flags, verdict, color };
  }, [emailText]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: PHISHING EMAIL DETECTOR</h2>
        <p className="text-muted-foreground text-sm">Analyze email content for social engineering and malicious patterns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <textarea
            data-testid="input-email"
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            className="w-full h-[400px] bg-input border border-border text-foreground p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary terminal-glow transition-all resize-none font-mono text-sm"
            placeholder="Paste email content here..."
          />
        </div>

        <div className="bg-black border border-border p-4 flex flex-col h-[400px]">
          <div className="border-b border-border pb-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">RISK SCORE:</span>
              <span data-testid="text-risk-score" className="font-bold text-xl">{analysis ? analysis.score : 0}/100</span>
            </div>
            <div className="h-2 w-full bg-input overflow-hidden mb-2">
              <div
                className={`h-full ${analysis?.color?.replace('text-', 'bg-')} transition-all duration-500`}
                style={{ width: `${analysis ? analysis.score : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">VERDICT:</span>
              <span data-testid="text-verdict" className={`font-bold ${analysis ? analysis.color : "text-muted-foreground"}`}>
                [{analysis ? analysis.verdict : "AWAITING INPUT"}]
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2">
            <div className="text-muted-foreground mb-2">{"//"} ANALYSIS LOG</div>
            {!analysis ? (
              <div className="text-muted-foreground animate-pulse">Ready for analysis...</div>
            ) : analysis.flags.length === 0 ? (
              <div className="text-primary">{">>"} No significant red flags detected.</div>
            ) : (
              analysis.flags.map((flag, i) => (
                <div key={i} className="flex gap-2 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 50}ms` }}>
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
      </div>
    </div>
  );
}
