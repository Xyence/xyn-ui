import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking");
  const [token, setToken] = useState("");
  const [meResult, setMeResult] = useState<string>("");
  const [meIdentity, setMeIdentity] = useState<string>("");
  const meLabel = useMemo(() => (meResult ? "Response:" : "Response will appear here."), [meResult]);

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

  const callMe = useCallback(async () => {
    setMeResult("");
    setMeIdentity("");
    try {
      const response = await fetch("/api/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        setMeResult(`Unauthorized (${response.status})`);
        return;
      }
      const payload = await response.json();
      if (payload?.email) {
        setMeIdentity(`Logged in as ${payload.email}`);
      } else if (payload?.sub) {
        setMeIdentity(`Logged in as ${payload.sub}`);
      }
      setMeResult(JSON.stringify(payload, null, 2));
    } catch (err) {
      setMeResult(`Request failed: ${String(err)}`);
    }
  }, [token]);

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
      <div>
        <label htmlFor="token-input">JWT Token</label>
        <input
          id="token-input"
          type="text"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste token from issue_dev_token.py"
        />
        <button type="button" onClick={callMe}>
          Call /api/me
        </button>
      </div>
      {meIdentity ? <p>{meIdentity}</p> : null}
      <pre>{meLabel}{meResult ? `\n${meResult}` : ""}</pre>
      <Link to="/devices">Continue to Devices</Link>
    </section>
  );
}
