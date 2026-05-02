import { useState } from "react";
import { Search, MapPin } from "lucide-react";

interface GeoData {
  status: string;
  message?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query: string;
}

export function IpLookup() {
  const [ipInput, setIpInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GeoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  const checkPrivateIp = (ip: string) => {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    const p1 = parseInt(parts[0]);
    const p2 = parseInt(parts[1]);
    
    if (p1 === 10) return true;
    if (p1 === 192 && p2 === 168) return true;
    if (p1 === 172 && p2 >= 16 && p2 <= 31) return true;
    if (p1 === 127) return true;
    return false;
  };

  const lookupIp = async (ipToLookup: string) => {
    if (!ipToLookup) return;
    
    setLoading(true);
    setError(null);
    setData(null);
    setIsPrivate(false);

    try {
      if (checkPrivateIp(ipToLookup)) {
        setIsPrivate(true);
        setLoading(false);
        return;
      }

      const res = await fetch(`https://ip-api.com/json/${ipToLookup}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
      const result = await res.json();

      if (result.status === "fail") {
        setError(result.message || "Failed to resolve IP");
      } else {
        setData(result);
      }
    } catch (err) {
      setError("Network error occurred during lookup");
    } finally {
      setLoading(false);
    }
  };

  const useMyIp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const { ip } = await res.json();
      setIpInput(ip);
      lookupIp(ip);
    } catch (err) {
      setError("Failed to fetch client IP");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">TARGET: IP GEO-LOOKUP</h2>
        <p className="text-muted-foreground text-sm">Resolve IP addresses to geographic coordinates and ISP details.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <input
            data-testid="input-ip"
            type="text"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            className="flex-1 bg-input border border-border text-foreground p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary terminal-glow transition-all font-mono text-sm"
            placeholder="Enter IPv4 address (e.g. 8.8.8.8)"
            onKeyDown={(e) => e.key === "Enter" && lookupIp(ipInput)}
          />
          <button
            data-testid="btn-lookup"
            onClick={() => lookupIp(ipInput)}
            disabled={loading}
            className="px-6 py-3 bg-primary/10 border border-primary text-primary hover:bg-primary/20 hover:terminal-glow transition-all font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Search size={18} />
            <span className="hidden sm:inline">LOOKUP</span>
          </button>
        </div>
        
        <button
          data-testid="btn-my-ip"
          onClick={useMyIp}
          disabled={loading}
          className="px-6 py-3 bg-transparent border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-all font-bold flex items-center gap-2 justify-center whitespace-nowrap"
        >
          <MapPin size={18} />
          USE MY IP
        </button>
      </div>

      <div className="bg-black border border-border p-6 font-mono text-sm min-h-[300px] relative">
        <div className="text-muted-foreground mb-4">{"//"} CONNECTION LOG</div>
        
        {loading && (
          <div className="text-primary animate-pulse flex items-center gap-2">
            <span className="terminal-cursor">_</span> TRACING ROUTE...
          </div>
        )}

        {error && (
          <div className="text-destructive font-bold">
            {">>"} [ERROR] {error}
          </div>
        )}

        {isPrivate && (
          <div className="text-yellow-500 font-bold space-y-2">
            <div>{">>"} [NOTICE] TARGET IDENTIFIED AS PRIVATE/LOCAL IP</div>
            <div>{">>"} IP: {ipInput}</div>
            <div>{">>"} RFC 1918 RANGE DETECTED. NO PUBLIC GEO-DATA AVAILABLE.</div>
          </div>
        )}

        {data && !loading && !error && (
          <div className="space-y-2 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex gap-2">
              <span className="text-primary">{">>"}</span>
              <span className="text-muted-foreground w-24">IP:</span>
              <span className="text-foreground font-bold">{data.query}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">{">>"}</span>
              <span className="text-muted-foreground w-24">COUNTRY:</span>
              <span className="text-foreground">{data.country} ({data.countryCode})</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">{">>"}</span>
              <span className="text-muted-foreground w-24">REGION:</span>
              <span className="text-foreground">{data.regionName} ({data.region})</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">{">>"}</span>
              <span className="text-muted-foreground w-24">CITY:</span>
              <span className="text-foreground">{data.city} {data.zip}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">{">>"}</span>
              <span className="text-muted-foreground w-24">COORD:</span>
              <span className="text-foreground">{data.lat}, {data.lon}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">{">>"}</span>
              <span className="text-muted-foreground w-24">TIMEZONE:</span>
              <span className="text-foreground">{data.timezone}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary">{">>"}</span>
              <span className="text-muted-foreground w-24">ISP:</span>
              <span className="text-foreground">{data.isp}</span>
            </div>
            {data.org && data.org !== data.isp && (
              <div className="flex gap-2">
                <span className="text-primary">{">>"}</span>
                <span className="text-muted-foreground w-24">ORG:</span>
                <span className="text-foreground">{data.org}</span>
              </div>
            )}
            {data.as && (
              <div className="flex gap-2">
                <span className="text-primary">{">>"}</span>
                <span className="text-muted-foreground w-24">ASN:</span>
                <span className="text-foreground">{data.as}</span>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !data && !isPrivate && (
          <div className="text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-50">
            [ IDLE ]
          </div>
        )}
      </div>
    </div>
  );
}
