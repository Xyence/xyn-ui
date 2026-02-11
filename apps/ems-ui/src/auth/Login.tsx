import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearStoredToken, getStoredToken } from "./session";

export default function Login() {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking");
  const [authStatus, setAuthStatus] = useState<"unknown" | "signed_out" | "signed_in">("unknown");
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
    const token = getStoredToken();
    if (!token) {
      setAuthStatus("signed_out");
      setMeResult("Not signed in.");
      return;
    }
    try {
      const response = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setAuthStatus("signed_out");
        setMeResult(`Unauthorized (${response.status})`);
        return;
      }
      const payload = await response.json();
      if (payload?.user?.email) {
        setMeIdentity(`Logged in as ${payload.user.email}`);
      } else if (payload?.user?.subject) {
        setMeIdentity(`Logged in as ${payload.user.subject}`);
      }
      setMeResult(JSON.stringify(payload, null, 2));
      setAuthStatus("signed_in");
    } catch (err) {
      setMeResult(`Request failed: ${String(err)}`);
    }
  }, []);

  const signOut = useCallback(async () => {
    clearStoredToken();
    setAuthStatus("signed_out");
    setMeIdentity("");
    setMeResult("");
  }, []);

  const startLogin = useCallback(() => {
    const returnTo = `${window.location.origin}/auth/callback`;
    window.location.href = `/auth/login?appId=ems.platform&returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  useEffect(() => {
    checkHealth();
    callMe();
  }, [checkHealth, callMe]);

  return (
    <section>
      <h2>Sign in</h2>
      <p>Use your corporate account to sign in.</p>
      <p>API: {status === "ok" ? "OK" : status === "down" ? "DOWN" : "CHECKING"}</p>
      <button type="button" onClick={checkHealth}>
        Retry
      </button>
      <div>
        {authStatus !== "signed_in" ? (
          <button type="button" onClick={startLogin}>
            Sign in
          </button>
        ) : (
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        )}
        <button type="button" onClick={callMe}>
          Refresh session
        </button>
      </div>
      {meIdentity ? <p>{meIdentity}</p> : null}
      <pre>{meLabel}{meResult ? `\n${meResult}` : ""}</pre>
      <Link to="/devices">Continue to Devices</Link>
    </section>
  );
}
