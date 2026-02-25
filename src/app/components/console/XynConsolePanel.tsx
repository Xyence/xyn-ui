import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, CircleHelp, Wrench } from "lucide-react";
import type { XynIntentResolutionResult } from "../../../api/types";
import { useXynConsole } from "../../state/xynConsoleStore";

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "DraftReady") return <CheckCircle2 size={14} aria-hidden="true" />;
  if (status === "ValidationError" || status === "UnsupportedIntent") return <AlertTriangle size={14} aria-hidden="true" />;
  if (status === "ProposedPatch") return <Wrench size={14} aria-hidden="true" />;
  return <CircleHelp size={14} aria-hidden="true" />;
}

function MissingFieldsCard() {
  const { session, fetchOptions, focusMissingField } = useXynConsole();
  if (!session.pendingMissingFields.length) return null;
  return (
    <section className="xyn-console-card" aria-label="Missing fields">
      <h4>Missing fields</h4>
      <ul className="xyn-console-list">
        {session.pendingMissingFields.map((field) => (
          <li key={field.field}>
            <span>
              <strong>{field.field}</strong> · <span className="muted">{field.reason}</span>
            </span>
            {field.options_available && ["category", "format", "duration"].includes(field.field) ? (
              <button type="button" className="ghost sm" onClick={() => void fetchOptions(field.field as "category" | "format" | "duration")}>
                Show options
              </button>
            ) : null}
            <button type="button" className="ghost sm" onClick={() => focusMissingField(field.field)}>
              Focus field
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OptionsCard() {
  const { session, injectSuggestion, applyOptionValue, hasEditorBridge } = useXynConsole();
  const entries = Object.entries(session.optionsByField);
  if (!entries.length) return null;
  return (
    <section className="xyn-console-card" aria-label="Options">
      <h4>Options</h4>
      {entries.map(([field, payload]) => (
        <div key={field} className="xyn-console-options-block">
          <p className="small muted">{field}</p>
          <div className="xyn-console-options-list">
            {(payload?.options || []).map((option) => {
              const label =
                typeof option === "string"
                  ? option
                  : typeof option === "object" && option && "slug" in option
                  ? String((option as { slug?: string }).slug || "")
                  : stringifyValue(option);
              return (
                <button
                  key={`${field}:${label}`}
                  type="button"
                  className="ghost sm"
                  onClick={() =>
                    hasEditorBridge
                      ? applyOptionValue(field as "category" | "format" | "duration", option)
                      : injectSuggestion(`${field}: ${label}`)
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProposedPatchCard() {
  const { session, applyPendingProposalAndSave, applyPendingProposalToForm, cancelPendingProposal, hasEditorBridge } = useXynConsole();
  if (!session.pendingProposal) return null;
  return (
    <section className="xyn-console-card" aria-label="Proposed patch">
      <h4>Proposed patch</h4>
      <div className="xyn-console-diff">
        {session.pendingProposal.changes.map((change) => (
          <div key={`${change.field}:${stringifyValue(change.to)}`} className="xyn-console-diff-row">
            <span className="xyn-console-diff-field">{change.field}</span>
            <span className="xyn-console-diff-from">{stringifyValue(change.from) || "∅"}</span>
            <span className="xyn-console-diff-to">{stringifyValue(change.to)}</span>
          </div>
        ))}
      </div>
      <div className="inline-actions">
        {hasEditorBridge ? (
          <button type="button" className="ghost sm" onClick={() => applyPendingProposalToForm()}>
            Apply to form
          </button>
        ) : null}
        <button type="button" className="primary sm" onClick={() => void applyPendingProposalAndSave()}>
          {hasEditorBridge ? "Apply & Save" : "Apply"}
        </button>
        <button type="button" className="ghost sm" onClick={() => cancelPendingProposal()}>
          Cancel
        </button>
      </div>
      {session.localMessage ? <p className="muted small">{session.localMessage}</p> : null}
      {session.ignoredFields.length ? (
        <p className="muted small">Ignored fields: {session.ignoredFields.join(", ")}</p>
      ) : null}
    </section>
  );
}

function ResolutionCard({ resolution }: { resolution: XynIntentResolutionResult }) {
  const { applyDraftPayload, setInputText, session } = useXynConsole();
  const navigate = useNavigate();
  const canCreate = resolution.status === "DraftReady" && resolution.action_type === "CreateDraft" && !!resolution.draft_payload;
  const canOpen = Boolean(resolution.artifact_id);

  return (
    <section className="xyn-console-card" aria-label="Resolution">
      <div className="xyn-console-card-head">
        <StatusIcon status={resolution.status} />
        <strong>{resolution.status}</strong>
      </div>
      <p>{resolution.summary}</p>
      {resolution.validation_errors?.length ? (
        <ul className="xyn-console-errors">
          {resolution.validation_errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
      <div className="inline-actions">
        {canCreate ? (
          <button type="button" className="primary sm" onClick={() => void applyDraftPayload()}>
            Create draft
          </button>
        ) : null}
        {canOpen ? (
          <button type="button" className="ghost sm" onClick={() => navigate(`/app/artifacts/${resolution.artifact_id}`)}>
            Open in editor
          </button>
        ) : null}
        <button
          type="button"
          className="ghost sm"
          onClick={() => setInputText(session.inputText ? session.inputText : "revise:")}
        >
          Revise
        </button>
      </div>
      {session.localMessage ? <p className="muted small">{session.localMessage}</p> : null}
    </section>
  );
}

export default function XynConsolePanel() {
  const {
    open,
    setOpen,
    context,
    inputText,
    setInputText,
    processing,
    processingStep,
    session,
    submitResolve,
    pendingCloseBlock,
  } = useXynConsole();
  const panelRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!open) return;
      if (pendingCloseBlock) return;
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, pendingCloseBlock, setOpen]);

  const statusLine = useMemo(() => {
    if (!processingStep) return "";
    if (processingStep === "resolving") return "Resolving intent...";
    if (processingStep === "classifying") return "Classifying artifact type...";
    return "Validating required fields...";
  }, [processingStep]);

  if (!open) return null;

  return (
    <section className="xyn-console-panel" ref={panelRef} role="dialog" aria-label="Xyn Console">
      <header className="xyn-console-header">
        <div>
          <h3>Xyn</h3>
          <p className="muted small">
            Context: {context.artifact_type || "none"} / {context.artifact_id || "none"}
          </p>
        </div>
        <button type="button" className="ghost sm" onClick={() => setOpen(false)} disabled={Boolean(session.pendingProposal)}>
          Close
        </button>
      </header>
      <div className="xyn-console-input-wrap">
        <textarea
          ref={inputRef}
          rows={3}
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="Describe a draft state transition."
        />
        <button type="button" className="primary sm" onClick={() => void submitResolve()} disabled={processing || !inputText.trim()}>
          Submit
        </button>
      </div>
      {processing ? <div className="xyn-console-processing muted small">{statusLine}</div> : null}
      {pendingCloseBlock ? <div className="xyn-console-warning">You have a pending proposal. Apply or cancel.</div> : null}
      {session.lastResolution ? <ResolutionCard resolution={session.lastResolution} /> : null}
      <ProposedPatchCard />
      <MissingFieldsCard />
      <OptionsCard />
      <footer className="xyn-console-footer muted small">
        <span>Esc to collapse (unless proposal pending)</span>
        <span>⌘K / Ctrl+K</span>
      </footer>
    </section>
  );
}
