import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clearStoredToken, getStoredToken } from "./session";

type OidcProvider = {
  id: string;
  display_name?: string;
};

type OidcConfig = {
  app_id: string;
  auth_base_url?: string;
  default_provider_id?: string;
  allowed_providers?: OidcProvider[];
};

export default function Login() {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking");
  const [authStatus, setAuthStatus] = useState<"unknown" | "signed_out" | "signed_in">("unknown");
  const [meResult, setMeResult] = useState<string>("");
  const [meIdentity, setMeIdentity] = useState<string>("");
  const [config, setConfig] = useState<OidcConfig | null>(null);
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

  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/oidc/config");
      if (!response.ok) {
        setMeResult(`OIDC config unavailable (${response.status})`);
        return;
      }
      const payload = (await response.json()) as OidcConfig;
      setConfig(payload);
    } catch (err) {
      setMeResult(`OIDC config fetch failed: ${String(err)}`);
    }
  }, []);

  const startLogin = useCallback(
    (providerId: string) => {
      if (!config) return;
      const appId = encodeURIComponent(config.app_id || "ems.platform");
      const nextUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
      const authBase = (config.auth_base_url || "").replace(/\/$/, "");
      if (!authBase) {
        setMeResult("OIDC auth base URL missing.");
        return;
      }
      window.location.href = `${authBase}/xyn/api/auth/oidc/${encodeURIComponent(
        providerId
      )}/authorize?appId=${appId}&next=${nextUrl}`;
    },
    [config]
  );

  useEffect(() => {
    checkHealth();
    loadConfig();
    callMe();
  }, [checkHealth, loadConfig, callMe]);

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
          <>
            {config?.allowed_providers?.length === 1 && (
              <button type="button" onClick={() => startLogin(config.allowed_providers![0].id)}>
                Sign in
              </button>
            )}
            {(config?.allowed_providers?.length ?? 0) > 1 &&
              config!.allowed_providers!.map((provider) => (
                <button key={provider.id} type="button" onClick={() => startLogin(provider.id)}>
                  Continue with {provider.display_name ?? provider.id}
                </button>
              ))}
          </>
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
