import { ReactNode } from "react";
import { Terminal, Shield, Mail, Hash, KeyRound, Globe, Link as LinkIcon, Radio, Shuffle, Lock, FileKey, Search, Wifi, Database } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  activeTool: string;
  setActiveTool: (tool: string) => void;
}

const TOOLS = [
  { id: "password", name: "Password Checker", icon: Shield },
  { id: "phishing", name: "Phishing Detector", icon: Mail },
  { id: "hash", name: "Hash Identifier", icon: Hash },
  { id: "cipher", name: "Caesar Cipher", icon: KeyRound },
  { id: "ip", name: "IP Lookup", icon: Globe },
  { id: "url", name: "URL Scanner", icon: LinkIcon },
  { id: "port", name: "Port Scanner", icon: Radio },
  { id: "encoder", name: "Encoder / Decoder", icon: Shuffle },
  { id: "passgen", name: "Password Generator", icon: Lock },
  { id: "jwt", name: "JWT Decoder", icon: FileKey },
  { id: "subdomain", name: "Subdomain Finder", icon: Search },
  { id: "dns", name: "DNS Lookup", icon: Wifi },
  { id: "whois", name: "WHOIS Lookup", icon: Database },
];

export function Layout({ children, activeTool, setActiveTool }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden font-mono selection:bg-primary selection:text-background">
      {/* Sidebar / Topbar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-sidebar shrink-0 flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Terminal className="w-6 h-6 text-primary terminal-text-glow" />
          <div>
            <h1 className="text-primary font-bold tracking-tight terminal-text-glow">CYBER-TOOLKIT</h1>
            <p className="text-xs text-muted-foreground">v1.0.0 <span className="terminal-cursor">_</span></p>
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto md:overflow-y-auto overflow-x-auto scrollbar-hide md:py-4">
          <nav className="flex md:flex-col p-2 md:p-4 gap-2">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  data-testid={`nav-${tool.id}`}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded whitespace-nowrap transition-all duration-200 ${
                    isActive 
                      ? "bg-primary text-primary-foreground terminal-glow font-bold" 
                      : "text-muted-foreground hover:text-primary hover:bg-accent/50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : ""}`} />
                  <span className="hidden sm:inline">{tool.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="hidden md:block p-4 border-t border-border">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>SYS.STATUS:</span>
            <span className="text-primary terminal-text-glow">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay" 
             style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}>
        </div>
        
        <div className="p-4 md:p-8 max-w-5xl mx-auto h-full flex flex-col">
          <div className="mb-6 flex items-center text-sm text-primary/70">
            <span>root@cyber-toolkit:~$ ./run_{activeTool}.sh</span>
            <span className="ml-1 inline-block w-2 h-4 bg-primary terminal-cursor"></span>
          </div>
          
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
