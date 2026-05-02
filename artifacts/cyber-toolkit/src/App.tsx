import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { PasswordChecker } from "@/components/tools/PasswordChecker";
import { PhishingDetector } from "@/components/tools/PhishingDetector";
import { HashIdentifier } from "@/components/tools/HashIdentifier";
import { CaesarCipher } from "@/components/tools/CaesarCipher";
import { IpLookup } from "@/components/tools/IpLookup";
import { UrlScanner } from "@/components/tools/UrlScanner";
import { PortScanner } from "@/components/tools/PortScanner";
import { EncoderDecoder } from "@/components/tools/EncoderDecoder";
import { PasswordGenerator } from "@/components/tools/PasswordGenerator";
import { JwtDecoder } from "@/components/tools/JwtDecoder";
import { SubdomainFinder } from "@/components/tools/SubdomainFinder";
import { DnsLookup } from "@/components/tools/DnsLookup";

function App() {
  const [activeTool, setActiveTool] = useState("password");

  const renderTool = () => {
    switch (activeTool) {
      case "password":
        return <PasswordChecker />;
      case "phishing":
        return <PhishingDetector />;
      case "hash":
        return <HashIdentifier />;
      case "cipher":
        return <CaesarCipher />;
      case "ip":
        return <IpLookup />;
      case "url":
        return <UrlScanner />;
      case "port":
        return <PortScanner />;
      case "encoder":
        return <EncoderDecoder />;
      case "passgen":
        return <PasswordGenerator />;
      case "jwt":
        return <JwtDecoder />;
      case "subdomain":
        return <SubdomainFinder />;
      case "dns":
        return <DnsLookup />;
      default:
        return <PasswordChecker />;
    }
  };

  return (
    <Layout activeTool={activeTool} setActiveTool={setActiveTool}>
      {renderTool()}
    </Layout>
  );
}

export default App;
