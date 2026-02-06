import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking");

  const checkHealth = useCallback(async () => {
    setStatus("checking");
    try {
      const response = await fetch("/api/health");
      if (!response.ok) {
        setStatus("down");
        return;
      }
      const payload = (await response.json()) as { status?: string };
      setStatus(payload.status === "ok" ? "ok" : "down");
    } catch {
      setStatus("down");
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <section>
      <h2>Login (OIDC stub)</h2>
      <p>Use your corporate account to sign in.</p>
      <p>API: {status === "ok" ? "OK" : status === "down" ? "DOWN" : "CHECKING"}</p>
      <button type="button" onClick={checkHealth}>
        Retry
      </button>
      <Link to="/devices">Continue to Devices</Link>
    </section>
  );
}
