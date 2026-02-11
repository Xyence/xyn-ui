import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clearStoredToken, getStoredToken } from "./session";

type OidcConfig = {
  app_id?: string;
  auth_base_url?: string;
};

export default function Login() {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking");
  const [authStatus, setAuthStatus] = useState<"unknown" | "signed_out" | "signed_in">("unknown");
  const [meResult, setMeResult] = useState<string>("");
  const [meIdentity, setMeIdentity] = useState<string>("");
  const [oidcConfig, setOidcConfig] = useState<OidcConfig | null>(null);
  const hasAutoRedirected = useRef(false);
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

  const loadOidcConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/oidc/config");
      if (!response.ok) {
        setMeResult(`OIDC config unavailable (${response.status})`);
        return;
      }
      const payload = (await response.json()) as OidcConfig;
      setOidcConfig(payload);
    } catch (err) {
      setMeResult(`OIDC config fetch failed: ${String(err)}`);
    }
  }, []);

  const startLogin = useCallback(() => {
    const authBase = (oidcConfig?.auth_base_url || "").replace(/\/$/, "");
    if (!authBase) {
      setMeResult("OIDC auth base URL missing.");
      return;
    }
    const appId = oidcConfig?.app_id || "ems.platform";
    const returnTo = `${window.location.origin}/auth/callback`;
    window.location.href = `${authBase}/auth/login?appId=${encodeURIComponent(appId)}&returnTo=${encodeURIComponent(returnTo)}`;
  }, [oidcConfig]);

  useEffect(() => {
    checkHealth();
    loadOidcConfig();
    callMe();
  }, [checkHealth, loadOidcConfig, callMe]);

  useEffect(() => {
    if (authStatus !== "signed_out" || !oidcConfig || hasAutoRedirected.current) {
      return;
    }
    hasAutoRedirected.current = true;
    startLogin();
  }, [authStatus, oidcConfig, startLogin]);

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
