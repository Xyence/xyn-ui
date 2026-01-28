import { useCallback, useEffect, useMemo, useState } from "react";
import {
  authMode,
  createInstance,
  destroyInstance,
  fetchBootstrapLog,
  getInstance,
  listInstances,
} from "./api/client";
import type { BootstrapLogResponse, CreateInstancePayload, ProvisionedInstance } from "./api/types";
import StatusPill from "./components/StatusPill";
import InlineMessage from "./components/InlineMessage";

const POLL_INTERVAL_MS = 5000;

const emptyPayload: CreateInstancePayload = {
  name: "",
  region: "",
  ami_id: "",
  instance_type: "t3.small",
  subnet_id: "",
  vpc_id: "",
  repo_url: "",
  iam_instance_profile_arn: "",
  iam_instance_profile_name: "",
};

export default function App() {
  const [instances, setInstances] = useState<ProvisionedInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProvisionedInstance | null>(null);
  const [payload, setPayload] = useState<CreateInstancePayload>(emptyPayload);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logTail, setLogTail] = useState(200);
  const [bootstrapLog, setBootstrapLog] = useState<BootstrapLogResponse | null>(null);

  const selectedInstance = useMemo(
    () => instances.find((item) => item.id === selectedId) ?? selected,
    [instances, selected, selectedId]
  );

  const loadInstances = useCallback(async () => {
    try {
      setError(null);
      const data = await listInstances();
      setInstances(data.instances);
      if (!selectedId && data.instances[0]) {
        setSelectedId(data.instances[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId]);

  const refreshSelected = useCallback(async () => {
    if (!selectedId) return;
    try {
      const instance = await getInstance(selectedId, true);
      setSelected(instance);
      setInstances((prev) => prev.map((item) => (item.id === instance.id ? instance : item)));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedId]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    if (!selectedId) return;
    refreshSelected();
    const interval = window.setInterval(refreshSelected, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refreshSelected, selectedId]);

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);
      const trimmed: CreateInstancePayload = {};
      (Object.entries(payload) as [keyof CreateInstancePayload, string | undefined][]).forEach(
        ([key, value]) => {
          if (value && String(value).trim().length > 0) {
            trimmed[key] = String(value).trim();
          }
        }
      );
      const created = await createInstance(trimmed);
      setInstances((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setBootstrapLog(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDestroy = async () => {
    if (!selectedId) return;
    if (!confirm("Destroy this instance?")) return;
    try {
      setLoading(true);
      setError(null);
      const updated = await destroyInstance(selectedId);
      setInstances((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelected(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogFetch = async () => {
    if (!selectedId) return;
    try {
      setError(null);
      const log = await fetchBootstrapLog(selectedId, logTail);
      setBootstrapLog(log);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-dot" />
          <div>
            <h1>Xyn UI</h1>
            <p>Provision and monitor Xyn Seed instances</p>
          </div>
        </div>
        <div className="header-meta">
          <span className="meta-pill">AUTH_MODE: {authMode}</span>
          <span className="meta-pill">Polling: {POLL_INTERVAL_MS / 1000}s</span>
        </div>
      </header>

      {authMode === "dev" && (
        <InlineMessage
          title="Dev auth mode"
          body="Make sure you are logged into xyence-web in this browser so cookies are available."
        />
      )}

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}

      <main className="layout">
        <section className="card">
          <div className="card-header">
            <h2>Instances</h2>
            <button className="ghost" onClick={loadInstances} disabled={loading}>
              Refresh list
            </button>
          </div>

          <div className="instance-list">
            {instances.length === 0 && <p className="muted">No instances found.</p>}
            {instances.map((instance) => (
              <button
                key={instance.id}
                className={`instance-row ${selectedId === instance.id ? "active" : ""}`}
                onClick={() => setSelectedId(instance.id)}
              >
                <div>
                  <strong>{instance.name}</strong>
                  <span className="muted small">{instance.id}</span>
                </div>
                <StatusPill status={instance.status} />
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Provision</h2>
          </div>
          <div className="form-grid">
            <label>
              Name
              <input
                value={payload.name ?? ""}
                onChange={(event) => setPayload({ ...payload, name: event.target.value })}
                placeholder="xyn-seed-dev-1"
              />
            </label>
            <label>
              Region
              <input
                value={payload.region ?? ""}
                onChange={(event) => setPayload({ ...payload, region: event.target.value })}
                placeholder="us-west-2"
              />
            </label>
            <label>
              AMI ID
              <input
                value={payload.ami_id ?? ""}
                onChange={(event) => setPayload({ ...payload, ami_id: event.target.value })}
                placeholder="ami-xxxxxxxx"
              />
            </label>
            <label>
              Instance type
              <input
                value={payload.instance_type ?? ""}
                onChange={(event) => setPayload({ ...payload, instance_type: event.target.value })}
                placeholder="t3.small"
              />
            </label>
            <label>
              Subnet ID
              <input
                value={payload.subnet_id ?? ""}
                onChange={(event) => setPayload({ ...payload, subnet_id: event.target.value })}
                placeholder="subnet-xxxx"
              />
            </label>
            <label>
              VPC ID
              <input
                value={payload.vpc_id ?? ""}
                onChange={(event) => setPayload({ ...payload, vpc_id: event.target.value })}
                placeholder="vpc-xxxx"
              />
            </label>
            <label>
              Repo URL
              <input
                value={payload.repo_url ?? ""}
                onChange={(event) => setPayload({ ...payload, repo_url: event.target.value })}
                placeholder="https://github.com/Xyence/xyn-seed.git"
              />
            </label>
            <label>
              IAM instance profile ARN
              <input
                value={payload.iam_instance_profile_arn ?? ""}
                onChange={(event) =>
                  setPayload({ ...payload, iam_instance_profile_arn: event.target.value })
                }
                placeholder="arn:aws:iam::...:instance-profile/..."
              />
            </label>
            <label>
              IAM instance profile name
              <input
                value={payload.iam_instance_profile_name ?? ""}
                onChange={(event) =>
                  setPayload({ ...payload, iam_instance_profile_name: event.target.value })
                }
                placeholder="xyn-seed-ssm"
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary" onClick={handleCreate} disabled={loading}>
              Create instance
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => setPayload(emptyPayload)}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Instance detail</h2>
            <div className="inline-actions">
              <button className="ghost" onClick={refreshSelected} disabled={!selectedId}>
                Refresh
              </button>
              <button className="danger" onClick={handleDestroy} disabled={!selectedId || loading}>
                Destroy
              </button>
            </div>
          </div>
          {selectedInstance ? (
            <div className="detail-grid">
              <div>
                <p className="label">Name</p>
                <p>{selectedInstance.name}</p>
              </div>
              <div>
                <p className="label">Status</p>
                <StatusPill status={selectedInstance.status} />
              </div>
              <div>
                <p className="label">Instance ID</p>
                <p>{selectedInstance.instance_id ?? "—"}</p>
              </div>
              <div>
                <p className="label">Public IP</p>
                <p>{selectedInstance.public_ip ?? "—"}</p>
              </div>
              <div>
                <p className="label">Private IP</p>
                <p>{selectedInstance.private_ip ?? "—"}</p>
              </div>
              <div>
                <p className="label">Region</p>
                <p>{selectedInstance.aws_region}</p>
              </div>
              <div>
                <p className="label">AMI</p>
                <p>{selectedInstance.ami_id ?? "—"}</p>
              </div>
              <div>
                <p className="label">Instance type</p>
                <p>{selectedInstance.instance_type ?? "—"}</p>
              </div>
              <div>
                <p className="label">SSM</p>
                <p>{selectedInstance.ssm_status || "unknown"}</p>
              </div>
              <div>
                <p className="label">Last error</p>
                <p className="muted">{selectedInstance.last_error || "—"}</p>
              </div>
            </div>
          ) : (
            <p className="muted">Select an instance to view details.</p>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Bootstrap log</h2>
            <div className="inline-actions">
              <label className="inline-field">
                Tail
                <input
                  type="number"
                  min={20}
                  max={1000}
                  value={logTail}
                  onChange={(event) => setLogTail(Number(event.target.value))}
                />
              </label>
              <button className="ghost" onClick={handleLogFetch} disabled={!selectedId}>
                Fetch log
              </button>
            </div>
          </div>
          {bootstrapLog ? (
            <div className="log-box">
              <div className="log-meta">
                <span>Status: {bootstrapLog.status}</span>
              </div>
              <pre>{bootstrapLog.stdout || "(no output)"}</pre>
              {bootstrapLog.stderr && bootstrapLog.stderr.trim().length > 0 && (
                <pre className="stderr">{bootstrapLog.stderr}</pre>
              )}
            </div>
          ) : (
            <p className="muted">Fetch the log for the selected instance.</p>
          )}
        </section>
      </main>
    </div>
  );
}
