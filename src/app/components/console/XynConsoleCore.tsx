import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, CircleHelp, Wrench } from "lucide-react";
import { getRecentArtifacts } from "../../../api/xyn";
import type { RecentArtifactItem, XynIntentResolutionResult } from "../../../api/types";
import { useXynConsole } from "../../state/xynConsoleStore";
import RecentArtifactsMiniTable from "./RecentArtifactsMiniTable";
import ConsolePromptCard from "./ConsolePromptCard";
import ConsoleGuidancePanel from "./ConsoleGuidancePanel";
import ConsoleResultPanel from "./ConsoleResultPanel";

type ConsoleMode = "overlay" | "page";

type Props = {
  mode: ConsoleMode;
  onRequestClose?: () => void;
  onOpenPanel?: (panelKey: string, params?: Record<string, unknown>) => void;
};

type ResolvedPanelCommand =
  | { panelKey: "artifact_list"; params: { namespace?: string } }
  | { panelKey: "artifact_detail"; params: { slug: string } }
  | { panelKey: "artifact_raw_json"; params: { slug: string } }
  | { panelKey: "artifact_files"; params: { slug: string } }
  | { panelKey: "ems_unregistered_devices"; params: Record<string, never> }
  | { panelKey: "ems_registrations_time"; params: { hours: number } }
  | { panelKey: "ems_device_statuses"; params: Record<string, never> };

export function resolvePanelCommand(input: string): ResolvedPanelCommand | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();

  let match = normalized.match(/^list\s+([a-z0-9_.-]+)\s+artifacts$/);
  if (match && match[1]) {
    return { panelKey: "artifact_list", params: { namespace: match[1] } };
  }
  if (/^list\s+artifacts$/.test(normalized)) {
    return { panelKey: "artifact_list", params: {} };
  }
  match = normalized.match(/^open\s+artifact\s+([a-z0-9_.-]+)$/);
  if (match && match[1]) {
    return { panelKey: "artifact_detail", params: { slug: match[1] } };
  }
  match = normalized.match(/^edit\s+artifact\s+([a-z0-9_.-]+)\s+raw$/);
  if (match && match[1]) {
    return { panelKey: "artifact_raw_json", params: { slug: match[1] } };
  }
  match = normalized.match(/^edit\s+artifact\s+([a-z0-9_.-]+)\s+files$/);
  if (match && match[1]) {
    return { panelKey: "artifact_files", params: { slug: match[1] } };
  }
  if (/^show\s+unregistered\s+devices$/.test(normalized)) {
    return { panelKey: "ems_unregistered_devices", params: {} };
  }
  match = normalized.match(/^show\s+registrations\s+in\s+the\s+past\s+(\d+)\s+hours?$/);
  if (match && match[1]) {
    const hours = Math.max(1, Math.min(Number(match[1]) || 24, 168));
    return { panelKey: "ems_registrations_time", params: { hours } };
  }
  if (/^show\s+device\s+statuses$/.test(normalized)) {
    return { panelKey: "ems_device_statuses", params: {} };
  }
  return null;
}

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function shortArtifactId(id: string): string {
  if (!id) return "";
  return id.length > 12 ? id.slice(0, 12) : id;
}

function humanizeIntentStatus(status?: string): string {
  const raw = String(status || "").trim();
  if (!raw) return "";
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "DraftReady") return <CheckCircle2 size={14} aria-hidden="true" />;
  if (status === "ValidationError" || status === "UnsupportedIntent") return <AlertTriangle size={14} aria-hidden="true" />;
  if (status === "ProposedPatch") return <Wrench size={14} aria-hidden="true" />;
  return <CircleHelp size={14} aria-hidden="true" />;
}

function MissingFieldsCard() {
  const { session, fetchOptions, focusMissingField, hasEditorBridge } = useXynConsole();
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
              {hasEditorBridge ? "Focus field" : "Add to prompt"}
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

function ResolutionCard({
  resolution,
  onRevise,
  onOpenPanel,
}: {
  resolution: XynIntentResolutionResult;
  onRevise: () => void;
  onOpenPanel?: (panelKey: string, params?: Record<string, unknown>) => void;
}) {
  const { applyDraftPayload, setInputText, session } = useXynConsole();
  const navigate = useNavigate();
  const canCreate = resolution.status === "DraftReady" && resolution.action_type === "CreateDraft" && !!resolution.draft_payload;
  const canOpen = Boolean(resolution.artifact_id);
  const showRevise = resolution.status !== "UnsupportedIntent";
  const deepLinks = (resolution.next_actions || []).filter(
    (item) => item.action === "OpenPath" && typeof item.path === "string" && item.path.startsWith("/")
  );
  const panelLinks = (resolution.next_actions || []).filter(
    (item) => item.action === "OpenPanel" && typeof item.panel_key === "string" && item.panel_key.length > 0
  );

  return (
    <section className="xyn-console-card" aria-label="Resolution">
      <div className="xyn-console-card-head">
        <StatusIcon status={resolution.status} />
        <strong>{humanizeIntentStatus(resolution.status)}</strong>
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
        {showRevise ? (
          <button
            type="button"
            className="ghost sm"
            onClick={() => {
              if (!session.inputText && session.lastMessage) {
                setInputText(session.lastMessage);
              }
              onRevise();
            }}
          >
            Revise
          </button>
        ) : null}
        {deepLinks.map((action) => (
          <button key={`${action.label}:${action.path}`} type="button" className="ghost sm" onClick={() => navigate(String(action.path || "/"))}>
            {action.label}
          </button>
        ))}
        {panelLinks.map((action) => (
          <button
            key={`${action.label}:${action.panel_key}`}
            type="button"
            className="ghost sm"
            onClick={() => onOpenPanel?.(String(action.panel_key || ""), action.params || {})}
          >
            {action.label}
          </button>
        ))}
      </div>
      {session.localMessage ? <p className="muted small">{session.localMessage}</p> : null}
    </section>
  );
}

export default function XynConsoleCore({ mode, onRequestClose, onOpenPanel }: Props) {
  const navigate = useNavigate();
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
    clearSessionResolution,
    lastArtifactHint,
    setLastArtifactHint,
    injectSuggestion,
  } = useXynConsole();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [recentItems, setRecentItems] = useState<RecentArtifactItem[]>([]);
  const [showDeprecatedArticles, setShowDeprecatedArticles] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentFetchedAt, setRecentFetchedAt] = useState(0);
  const initialRecentCount = mode === "page" ? 8 : 6;
  const [recentLimit, setRecentLimit] = useState(initialRecentCount);
  const [recentVisibleCount, setRecentVisibleCount] = useState(initialRecentCount);
  const [recentExpanded, setRecentExpanded] = useState(false);

  const isOverlay = mode === "overlay";
  const isSurfaceVisible = isOverlay ? open : true;
  const hasContextArtifact = Boolean(context.artifact_id && context.artifact_type);
  const isGlobalContext = !hasContextArtifact;

  useEffect(() => {
    if (!isSurfaceVisible) return;
    inputRef.current?.focus();
  }, [isSurfaceVisible]);

  useEffect(() => {
    if (!isSurfaceVisible) return;
    if (session.lastResolution?.status !== "UnsupportedIntent") return;
    const target = inputRef.current;
    if (!target) return;
    target.focus();
    const end = target.value.length;
    target.setSelectionRange(end, end);
  }, [isSurfaceVisible, session.lastResolution?.status]);

  useEffect(() => {
    if (context.artifact_type && !context.artifact_id) {
      // eslint-disable-next-line no-console
      console.warn("[xyn-console] artifact_type without artifact_id; falling back to Global context");
    }
  }, [context.artifact_id, context.artifact_type]);

  const statusLine = useMemo(() => {
    if (!processingStep) return "";
    if (processingStep === "resolving") return "Resolving intent...";
    if (processingStep === "classifying") return "Classifying artifact type...";
    return "Validating required fields...";
  }, [processingStep]);

  const shouldShowRecent =
    isSurfaceVisible &&
    isGlobalContext &&
    !session.pendingProposal;

  useEffect(() => {
    if (!shouldShowRecent) return;
    const now = Date.now();
    if (recentItems.length && now - recentFetchedAt < 60_000) return;
    let active = true;
    (async () => {
      try {
        setRecentLoading(true);
        const payload = await getRecentArtifacts(recentLimit);
        if (!active) return;
        setRecentItems(payload.items || []);
        setRecentFetchedAt(Date.now());
      } finally {
        if (active) setRecentLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isGlobalContext, lastArtifactHint, recentFetchedAt, recentItems.length, recentLimit, setLastArtifactHint, shouldShowRecent]);

  const contextualTitle =
    hasContextArtifact && lastArtifactHint?.artifact_id && String(lastArtifactHint.artifact_id) === String(context.artifact_id || "")
      ? String(lastArtifactHint.title || "").trim()
      : "";
  const contextLine = hasContextArtifact
    ? `Context: ${context.artifact_type} • ${contextualTitle || shortArtifactId(String(context.artifact_id || ""))}`
    : "Context: Global";
  const handleRevise = () => {
    const target = inputRef.current;
    if (!target) return;
    target.focus();
    const end = target.value.length;
    target.setSelectionRange(end, end);
  };

  const canSubmit = Boolean(inputText.trim()) && !processing;
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (event.altKey) return;
    if (event.shiftKey) return;
    const submitByHotkey = event.metaKey || event.ctrlKey || (!event.metaKey && !event.ctrlKey);
    if (submitByHotkey) {
      event.preventDefault();
      if (!canSubmit) return;
      void submitResolve();
    }
  };

  const submitPrompt = () => {
    const directPanel = resolvePanelCommand(inputText);
    if (directPanel && onOpenPanel) {
      onOpenPanel(directPanel.panelKey, directPanel.params);
      clearSessionResolution();
      return;
    }
    void submitResolve();
  };

  const resolutionStack = (
    <>
      {pendingCloseBlock ? <div className="xyn-console-warning">You have a pending proposal. Apply or cancel.</div> : null}
      {session.lastResolution ? (
        <>
          <ResolutionCard resolution={session.lastResolution} onRevise={handleRevise} onOpenPanel={onOpenPanel} />
          {isGlobalContext ? (
            <div className="inline-actions">
              <button
                type="button"
                className="ghost sm"
                onClick={() => {
                  clearSessionResolution();
                  setInputText("");
                }}
              >
                Clear
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      <ProposedPatchCard />
      <MissingFieldsCard />
      <OptionsCard />
    </>
  );
  const hasResolutionContent =
    pendingCloseBlock ||
    Boolean(session.lastResolution) ||
    Boolean(session.pendingProposal) ||
    session.pendingMissingFields.length > 0 ||
    Object.keys(session.optionsByField || {}).length > 0;

  const promptCard = (
    <ConsolePromptCard
      contextLine={contextLine}
      statusLine={statusLine || "Working..."}
      processing={processing}
      inputText={inputText}
      onInputChange={setInputText}
      onInputKeyDown={handleInputKeyDown}
      onSubmit={submitPrompt}
      onClear={() => {
        if (session.lastResolution || session.pendingProposal || session.pendingMissingFields.length) {
          clearSessionResolution();
        }
        setInputText("");
      }}
      canSubmit={canSubmit}
      textareaRef={inputRef}
      pendingCloseBlock={pendingCloseBlock}
    />
  );

  const recentSection = shouldShowRecent ? (
    <RecentArtifactsMiniTable
      items={recentItems.filter((item) => {
        if (showDeprecatedArticles) return true;
        return String(item.artifact_state || "").toLowerCase() !== "deprecated";
      })}
      loading={recentLoading}
      compact={!isOverlay && Boolean(inputText.trim()) && !recentExpanded}
      maxItems={recentVisibleCount}
      showDeprecatedArticles={showDeprecatedArticles}
      onRefresh={() => {
        setRecentFetchedAt(0);
        setRecentExpanded(false);
        setRecentVisibleCount(initialRecentCount);
        setRecentLimit(initialRecentCount);
      }}
      onToggleShowDeprecatedArticles={setShowDeprecatedArticles}
      onOpen={(item) => {
        setLastArtifactHint({
          artifact_id: item.artifact_id,
          artifact_type: item.artifact_type,
          artifact_state: item.artifact_state || null,
          title: item.title,
          route: item.route,
          updated_at: item.updated_at,
        });
        navigate(item.route);
        if (isOverlay) {
          if (onRequestClose) onRequestClose();
          else setOpen(false);
        }
      }}
      onShowMore={() => {
        setRecentExpanded(true);
        setRecentVisibleCount((current) => current + 10);
        const desired = recentVisibleCount + 10;
        if (desired > recentLimit) {
          setRecentLimit((current) => Math.min(Math.max(current + 10, desired), 100));
          setRecentFetchedAt(0);
        }
      }}
      onInsertSuggestion={injectSuggestion}
    />
  ) : null;

  if (!isOverlay) {
    return (
      <div className="xyn-console-core page">
        <div className="xyn-console-page-grid">
          <div className="xyn-console-page-main">
            {promptCard}
            {hasResolutionContent ? <ConsoleResultPanel>{resolutionStack}</ConsoleResultPanel> : null}
          </div>
          <ConsoleGuidancePanel onInsertSuggestion={injectSuggestion} dimmed={Boolean(inputText.trim())} />
        </div>
        {recentSection}
      </div>
    );
  }

  return (
    <div className="xyn-console-core overlay">
      <header className="xyn-console-header">
        <h3>Xyn</h3>
        <button
          type="button"
          className="ghost sm"
          onClick={() => {
            if (onRequestClose) onRequestClose();
            else setOpen(false);
          }}
          disabled={Boolean(session.pendingProposal)}
        >
          Close
        </button>
      </header>
      {promptCard}
      <ConsoleResultPanel>{resolutionStack}</ConsoleResultPanel>
      {recentSection}
      <footer className="xyn-console-footer muted small">
        <span>Esc to collapse (unless proposal pending)</span>
        <span>Submit: Enter or ⌘/Ctrl+Enter</span>
        <span>Shift+Enter newline</span>
      </footer>
    </div>
  );
}
