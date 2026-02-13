import { useState } from "react";
import InlineMessage from "../../components/InlineMessage";

const STARTER_PROMPT = `Create a simple blueprint for a hello web + api + postgres stack.\nExpose it at a new fqdn under xyence.io using host-ingress TLS (Traefik ACME).\nInclude health checks, publish a release, and deploy to xyence-1.`;

const EXERCISE = `# Xyn Quickstart Exercise (Developer Walkthrough)

1. Go to Blueprints and create a new blueprint for a simple web + api + postgres app.
2. In the blueprint target config, set DNS under \`xyence.io\` and TLS mode \`host-ingress\`.
3. Generate a release and promote Draft -> Published.
4. Open Release Plans, select target environment and instance \`xyence-1\`, then deploy.
5. Use Runs to confirm deploy and health verification succeeded.
6. Make a small change (homepage text or \`/version\` endpoint), generate a new release, publish, and deploy again.

Useful pages:
- /app/blueprints
- /app/releases
- /app/release-plans
- /app/runs
`;

export default function GuidesPage() {
  const [message, setMessage] = useState<string | null>(null);

  const copyStarter = async () => {
    try {
      await navigator.clipboard.writeText(STARTER_PROMPT);
      setMessage("Starter prompt copied.");
    } catch {
      setMessage("Copy failed. Clipboard permission may be blocked.");
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Guides</h2>
          <p className="muted">Reference walkthroughs for repeatable demos.</p>
        </div>
      </div>

      {message && <InlineMessage tone="info" title="Guide" body={message} />}

      <section className="card">
        <div className="card-header">
          <h3>Xyn Quickstart Exercise</h3>
        </div>
        <div className="actions" style={{ marginBottom: 12 }}>
          <button className="ghost" onClick={copyStarter}>Copy starter prompt</button>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, margin: 0 }}>{EXERCISE}</pre>
      </section>
    </>
  );
}
