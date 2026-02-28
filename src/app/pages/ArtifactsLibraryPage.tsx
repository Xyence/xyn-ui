import { useCallback, useEffect, useMemo, useState } from "react";
import InlineMessage from "../../components/InlineMessage";
import {
  deleteArtifactBinding,
  exportArtifactPackage,
  getArtifact,
  importArtifactPackage,
  installArtifactPackage,
  listArtifactBindings,
  listArtifactInstallReceipts,
  listArtifactPackages,
  listArtifacts,
  upsertArtifactBinding,
  validateArtifactPackage,
} from "../../api/xyn";
import type { ArtifactBinding, ArtifactInstallReceipt, ArtifactPackageRecord, UnifiedArtifact } from "../../api/types";

const LIBRARY_TYPES = new Set(["app_shell", "auth_login", "data_model", "ui_view", "integration", "workflow"]);

function formatDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ArtifactsLibraryPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [artifacts, setArtifacts] = useState<UnifiedArtifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>("");
  const [selectedArtifact, setSelectedArtifact] = useState<UnifiedArtifact | null>(null);
  const [receipts, setReceipts] = useState<ArtifactInstallReceipt[]>([]);

  const [bindings, setBindings] = useState<ArtifactBinding[]>([]);
  const [newBindingName, setNewBindingName] = useState("");
  const [newBindingType, setNewBindingType] = useState<ArtifactBinding["type"]>("string");
  const [newBindingValue, setNewBindingValue] = useState("");

  const [packages, setPackages] = useState<ArtifactPackageRecord[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [validationJson, setValidationJson] = useState<string>("");
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);

  const [exportName, setExportName] = useState("ems-hello");
  const [exportVersion, setExportVersion] = useState("0.1.0");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [artifactResp, bindingsResp, packagesResp] = await Promise.all([
        listArtifacts({ limit: 500 }),
        listArtifactBindings(),
        listArtifactPackages(),
      ]);
      const libraryRows = (artifactResp.artifacts || []).filter((row) => LIBRARY_TYPES.has(String(row.artifact_type || "")));
      setArtifacts(libraryRows);
      setBindings(bindingsResp.bindings || []);
      setPackages(packagesResp.packages || []);
      if (!selectedArtifactId && libraryRows[0]?.artifact_id) {
        setSelectedArtifactId(String(libraryRows[0].artifact_id));
      }
      if (!selectedPackageId && packagesResp.packages?.[0]?.id) {
        setSelectedPackageId(String(packagesResp.packages[0].id));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedArtifactId, selectedPackageId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedArtifactId) {
      setSelectedArtifact(null);
      setReceipts([]);
      return;
    }
    (async () => {
      try {
        const [artifact, receiptsResp] = await Promise.all([
          getArtifact(selectedArtifactId),
          listArtifactInstallReceipts({ artifact_id: selectedArtifactId }),
        ]);
        setSelectedArtifact(artifact);
        setReceipts(receiptsResp.receipts || []);
        if (!exportName.trim()) {
          setExportName(`${artifact.artifact_type}-${artifact.title || artifact.artifact_id}`.toLowerCase().replace(/\s+/g, "-"));
        }
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [selectedArtifactId, exportName]);

  const dependencyCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of artifacts) {
      map[item.artifact_id] = Array.isArray(item.dependencies) ? item.dependencies.length : 0;
    }
    return map;
  }, [artifacts]);

  const createBinding = async () => {
    if (!newBindingName.trim()) return;
    try {
      setError(null);
      const value = newBindingType === "json" ? JSON.parse(newBindingValue || "{}") : newBindingValue;
      await upsertArtifactBinding({ name: newBindingName.trim().toUpperCase(), type: newBindingType, value });
      setNewBindingName("");
      setNewBindingValue("");
      setMessage("Binding saved.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeBinding = async (id: string) => {
    try {
      setError(null);
      await deleteArtifactBinding(id);
      setMessage("Binding deleted.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const uploadPackage = async (file: File) => {
    try {
      setError(null);
      setMessage(null);
      const result = await importArtifactPackage(file);
      setSelectedPackageId(result.package.id);
      setMessage(`Imported package ${result.package.name}@${result.package.version}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const validatePackage = async () => {
    if (!selectedPackageId) return;
    try {
      setError(null);
      setMessage(null);
      const payload = validationJson.trim() ? { binding_overrides: JSON.parse(validationJson) } : {};
      const result = await validateArtifactPackage(selectedPackageId, payload);
      setValidationResult(result as unknown as Record<string, unknown>);
      setMessage(result.valid ? "Validation passed." : "Validation returned issues.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const installSelectedPackage = async () => {
    if (!selectedPackageId) return;
    try {
      setError(null);
      const payload = validationJson.trim() ? { binding_overrides: JSON.parse(validationJson) } : {};
      const result = await installArtifactPackage(selectedPackageId, payload);
      setMessage(`Install ${result.receipt.status}: ${result.receipt.package_name}@${result.receipt.package_version}`);
      await load();
      if (selectedArtifactId) {
        const receiptsResp = await listArtifactInstallReceipts({ artifact_id: selectedArtifactId });
        setReceipts(receiptsResp.receipts || []);
      }
      setValidationResult(result.receipt as unknown as Record<string, unknown>);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const exportSelectedArtifact = async () => {
    if (!selectedArtifact) return;
    try {
      setError(null);
      setMessage(null);
      const blob = await exportArtifactPackage({
        artifact_id: selectedArtifact.artifact_id,
        package_name: exportName,
        package_version: exportVersion,
      });
      downloadBlob(blob, `${exportName}-${exportVersion}.zip`);
      setMessage("Package exported.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Artifacts Library</h2>
          <p className="muted">Portable app artifacts, package import/install, and binding registry.</p>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <InlineMessage tone="error" title="Request failed" body={error} />}
      {message && <InlineMessage tone="info" title="Update" body={message} />}

      <section className="card">
        <div className="card-header">
          <h3>Binding Registry</h3>
        </div>
        <div className="form-grid">
          <label>
            Name
            <input className="input" value={newBindingName} onChange={(event) => setNewBindingName(event.target.value)} placeholder="BASE_URL" />
          </label>
          <label>
            Type
            <select value={newBindingType} onChange={(event) => setNewBindingType(event.target.value as ArtifactBinding["type"])}>
              <option value="string">string</option>
              <option value="url">url</option>
              <option value="model_ref">model_ref</option>
              <option value="json">json</option>
              <option value="secret_ref">secret_ref</option>
            </select>
          </label>
          <label>
            Value
            <input className="input" value={newBindingValue} onChange={(event) => setNewBindingValue(event.target.value)} placeholder="https://example" />
          </label>
          <button className="primary" onClick={createBinding}>
            Save Binding
          </button>
        </div>
        <div className="instance-list">
          {bindings.map((binding) => (
            <div className="instance-row" key={binding.id}>
              <div>
                <strong>{binding.name}</strong>
                <span className="muted small">{binding.type} · updated {formatDate(binding.updated_at)}</span>
              </div>
              <button className="ghost" onClick={() => void removeBinding(binding.id)}>
                Delete
              </button>
            </div>
          ))}
          {bindings.length === 0 && <p className="muted">No bindings configured yet.</p>}
        </div>
      </section>

      <div className="layout">
        <section className="card">
          <div className="card-header">
            <h3>Installed Artifacts</h3>
          </div>
          <div className="instance-list" role="table" aria-label="Installed artifacts">
            {artifacts.map((artifact) => (
              <button
                key={artifact.artifact_id}
                className="instance-row"
                role="row"
                type="button"
                onClick={() => setSelectedArtifactId(artifact.artifact_id)}
              >
                <div>
                  <strong>{artifact.title}</strong>
                  <span className="muted small">
                    {artifact.artifact_type} · {artifact.package_version || "0.0.0"} · status {artifact.status || "-"}
                  </span>
                </div>
                <div className="muted small">deps {dependencyCount[artifact.artifact_id] || 0}</div>
              </button>
            ))}
            {artifacts.length === 0 && <p className="muted">No application artifacts installed.</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Artifact Detail</h3>
          </div>
          {!selectedArtifact ? (
            <p className="muted">Select an artifact to view details.</p>
          ) : (
            <>
              <p className="muted small">
                <strong>{selectedArtifact.artifact_type}</strong> · {selectedArtifact.artifact_id}
              </p>
              <p className="muted small">
                version {selectedArtifact.package_version || "0.0.0"} · state {selectedArtifact.artifact_state} · status {selectedArtifact.status || "-"}
              </p>

              <label>
                Export package name
                <input className="input" value={exportName} onChange={(event) => setExportName(event.target.value)} />
              </label>
              <label>
                Export package version
                <input className="input" value={exportVersion} onChange={(event) => setExportVersion(event.target.value)} />
              </label>
              <button className="ghost" onClick={() => void exportSelectedArtifact()}>
                Export Artifact Package
              </button>

              <h4>Dependencies</h4>
              <pre className="code-block">{JSON.stringify(selectedArtifact.dependencies || [], null, 2)}</pre>
              <h4>Bindings</h4>
              <pre className="code-block">{JSON.stringify(selectedArtifact.bindings || [], null, 2)}</pre>

              <h4>Install Receipts</h4>
              <div className="instance-list">
                {receipts.map((receipt) => (
                  <div key={receipt.id} className="instance-row">
                    <div>
                      <strong>{receipt.package_name}@{receipt.package_version}</strong>
                      <span className="muted small">{receipt.install_mode} · {receipt.status} · {formatDate(receipt.installed_at)}</span>
                    </div>
                  </div>
                ))}
                {receipts.length === 0 && <p className="muted">No receipts for this artifact yet.</p>}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h3>Packages</h3>
        </div>
        <div className="form-grid">
          <label>
            Import package (.zip)
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPackage(file);
              }}
            />
          </label>
          <label>
            Select package
            <select value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)}>
              <option value="">Select...</option>
              {packages.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}@{item.version}
                </option>
              ))}
            </select>
          </label>
          <label>
            Binding overrides (JSON)
            <textarea
              className="input"
              rows={5}
              value={validationJson}
              onChange={(event) => setValidationJson(event.target.value)}
              placeholder='{"BASE_URL":"https://ems.local"}'
            />
          </label>
          <div className="inline-actions">
            <button className="ghost" onClick={() => void validatePackage()} disabled={!selectedPackageId}>
              Validate (Dry Run)
            </button>
            <button className="primary" onClick={() => void installSelectedPackage()} disabled={!selectedPackageId}>
              Install
            </button>
          </div>
        </div>

        {validationResult && (
          <>
            <h4>Validation / Receipt JSON</h4>
            <pre className="code-block">{JSON.stringify(validationResult, null, 2)}</pre>
          </>
        )}
      </section>
    </>
  );
}
