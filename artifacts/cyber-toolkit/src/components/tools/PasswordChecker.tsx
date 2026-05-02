import { useState, useMemo } from "react";
import { Eye, EyeOff, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export function PasswordChecker() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const analysis = useMemo(() => {
    let score = 0;
    const feedback: string[] = [];
    let entropy = 0;

    if (!password) {
      return { score: 0, rating: "WEAK", feedback, entropy: 0, color: "text-destructive", barColor: "bg-destructive" };
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const length = password.length;

    let poolSize = 0;
    if (hasLower) poolSize += 26;
    if (hasUpper) poolSize += 26;
    if (hasNumber) poolSize += 10;
    if (hasSpecial) poolSize += 32;

    if (poolSize > 0) {
      entropy = Math.log2(Math.pow(poolSize, length));
    }

    if (length < 8) {
      feedback.push("Password is too short (minimum 8 characters)");
    } else {
      score += 1;
      if (length >= 12) score += 1;
    }

    if (!hasLower) feedback.push("Add lowercase letters");
    else score += 1;

    if (!hasUpper) feedback.push("Add uppercase letters");
    else score += 1;

    if (!hasNumber) feedback.push("Add numbers");
    else score += 1;

    if (!hasSpecial) feedback.push("Add special characters (e.g., !@#$%)");
    else score += 1;

    // Penalty for common patterns (simplified)
    const commonPatterns = ["123", "abc", "qwerty", "password", "admin"];
    const lowerPass = password.toLowerCase();
    if (commonPatterns.some(p => lowerPass.includes(p))) {
      feedback.push("Contains common patterns or sequences");
      score -= 2;
    }

    score = Math.max(0, Math.min(6, score));

    let rating = "WEAK";
    let color = "text-destructive";
    let barColor = "bg-destructive";

    if (score >= 5 && length >= 12) {
      rating = "VERY STRONG";
      color = "text-primary";
      barColor = "bg-primary";
    } else if (score >= 4) {
      rating = "STRONG";
      color = "text-primary";
      barColor = "bg-primary";
    } else if (score >= 3) {
      rating = "FAIR";
      color = "text-yellow-500";
      barColor = "bg-yellow-500";
    }

    if (password && feedback.length === 0) {
      feedback.push("Password looks good");
    }

    return { score, rating, feedback, entropy, color, barColor };
  }, [password]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: PASSWORD STRENGTH ANALYSIS</h2>
        <p className="text-muted-foreground text-sm">Evaluate password complexity, entropy, and vulnerabilities.</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            data-testid="input-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-input border border-border text-foreground p-3 pr-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary terminal-glow transition-all"
            placeholder="Enter password to analyze..."
          />
          <button
            data-testid="btn-toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="bg-card border border-border p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm">RATING:</span>
            <span data-testid="text-rating" className={`font-bold ${analysis.color} flex items-center gap-2`}>
              {analysis.rating === "WEAK" && <ShieldX size={16} />}
              {analysis.rating === "FAIR" && <ShieldAlert size={16} />}
              {(analysis.rating === "STRONG" || analysis.rating === "VERY STRONG") && <ShieldCheck size={16} />}
              [{analysis.rating}]
            </span>
          </div>

          <div className="h-2 w-full bg-input overflow-hidden">
            <div
              data-testid="progress-bar"
              className={`h-full ${analysis.barColor} transition-all duration-500`}
              style={{ width: `${password ? Math.max(10, (analysis.score / 6) * 100) : 0}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>ENTROPY: {analysis.entropy.toFixed(1)} bits</span>
            <span>LENGTH: {password.length} chars</span>
          </div>
        </div>

        <div className="bg-black border border-border p-4 font-mono text-sm h-64 overflow-y-auto">
          <div className="text-muted-foreground mb-2">{"//"} SYSTEM LOG OUTPUT</div>
          {password ? (
            analysis.feedback.map((msg, i) => (
              <div key={i} className="flex gap-2 mb-1 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 100}ms` }}>
                <span className="text-primary">{">>"}</span>
                <span className={msg === "Password looks good" ? "text-primary" : "text-foreground"}>{msg}</span>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground animate-pulse">Waiting for input...</div>
          )}
        </div>
      </div>
    </div>
  );
}
