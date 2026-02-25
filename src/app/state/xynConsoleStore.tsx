import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyXynIntent, getXynIntentOptions, resolveXynIntent } from "../../api/xyn";
import type { XynIntentOptionsResponse, XynIntentResolutionResult, XynIntentStatus } from "../../api/types";

const STORAGE_KEY = "xyn.console.v1.sessions";

export type XynConsoleContextRef = {
  artifact_id?: string | null;
  artifact_type?: string | null;
};

type PendingProposal = {
  patch_object: Record<string, unknown>;
  changes: Array<{ field: string; from?: unknown; to?: unknown }>;
};

type ConsoleSessionState = {
  inputText: string;
  lastMessage: string;
  lastResolution: XynIntentResolutionResult | null;
  pendingProposal: PendingProposal | null;
  pendingMissingFields: Array<{ field: string; reason: string; options_available: boolean }>;
  optionsByField: Partial<Record<"category" | "format" | "duration", XynIntentOptionsResponse>>;
};

type PersistedSessions = Record<string, ConsoleSessionState>;

type ProcessingStep = "resolving" | "classifying" | "validating";

const DEFAULT_SESSION: ConsoleSessionState = {
  inputText: "",
  lastMessage: "",
  lastResolution: null,
  pendingProposal: null,
  pendingMissingFields: [],
  optionsByField: {},
};

function cloneDefaultSession(): ConsoleSessionState {
  return {
    inputText: "",
    lastMessage: "",
    lastResolution: null,
    pendingProposal: null,
    pendingMissingFields: [],
    optionsByField: {},
  };
}

function toContextKey(context: XynConsoleContextRef): string {
  const artifactId = String(context.artifact_id || "").trim();
  return artifactId || "global";
}

function readSessionsFromStorage(): PersistedSessions {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedSessions;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeSessionsToStorage(value: PersistedSessions) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function resolutionNeedsBadge(status?: XynIntentStatus): boolean {
  return status === "MissingFields" || status === "ProposedPatch" || status === "ValidationError" || status === "UnsupportedIntent";
}

type XynConsoleContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  context: XynConsoleContextRef;
  setContext: (context: XynConsoleContextRef) => void;
  clearContext: () => void;
  contextKey: string;
  inputText: string;
  setInputText: (value: string) => void;
  processing: boolean;
  processingStep: ProcessingStep | null;
  session: ConsoleSessionState;
  badgeActive: boolean;
  pendingCloseBlock: boolean;
  submitResolve: () => Promise<void>;
  applyPendingProposal: () => Promise<void>;
  applyDraftPayload: () => Promise<void>;
  cancelPendingProposal: () => void;
  fetchOptions: (field: "category" | "format" | "duration") => Promise<void>;
  injectSuggestion: (snippet: string) => void;
};

const XynConsoleContext = createContext<XynConsoleContextValue | null>(null);

export function XynConsoleProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [context, setContextState] = useState<XynConsoleContextRef>({ artifact_id: null, artifact_type: null });
  const [sessions, setSessions] = useState<PersistedSessions>(() => readSessionsFromStorage());
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [pendingCloseBlock, setPendingCloseBlock] = useState(false);

  const contextKey = useMemo(() => toContextKey(context), [context]);
  const session = useMemo(() => sessions[contextKey] || DEFAULT_SESSION, [sessions, contextKey]);

  useEffect(() => {
    writeSessionsToStorage(sessions);
  }, [sessions]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingTarget = target?.isContentEditable || ["input", "textarea", "select"].includes((target?.tagName || "").toLowerCase());
      if (!typingTarget && (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape" && open) {
        if (session.pendingProposal) {
          event.preventDefault();
          setPendingCloseBlock(true);
          return;
        }
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, session.pendingProposal]);

  const updateSession = useCallback((updater: (current: ConsoleSessionState) => ConsoleSessionState) => {
    setSessions((current) => {
      const active = current[contextKey] || cloneDefaultSession();
      return {
        ...current,
        [contextKey]: updater(active),
      };
    });
  }, [contextKey]);

  const setInputText = useCallback((value: string) => {
    updateSession((current) => ({ ...current, inputText: value }));
  }, [updateSession]);

  const storeResolution = useCallback((result: XynIntentResolutionResult, message: string) => {
    updateSession((current) => ({
      ...current,
      lastMessage: message,
      lastResolution: result,
      pendingProposal:
        result.status === "ProposedPatch" && result.proposed_patch
          ? {
              patch_object: result.proposed_patch.patch_object || {},
              changes: (result.proposed_patch.changes || []).map((entry) => ({
                field: String(entry.field || ""),
                from: entry.from,
                to: entry.to,
              })),
            }
          : null,
      pendingMissingFields: result.status === "MissingFields" ? result.missing_fields || [] : [],
    }));
  }, [updateSession]);

  const submitResolve = useCallback(async () => {
    const message = String(session.inputText || "").trim();
    if (!message || processing) return;
    setProcessing(true);
    setProcessingStep("resolving");
    setPendingCloseBlock(false);
    try {
      setProcessingStep("classifying");
      const result = await resolveXynIntent({
        message,
        context: {
          artifact_id: context.artifact_id || null,
          artifact_type: context.artifact_type || null,
        },
      });
      setProcessingStep("validating");
      storeResolution(result, message);
      setOpen(true);
    } catch (error) {
      const failure: XynIntentResolutionResult = {
        status: "ValidationError",
        action_type: "ValidateDraft",
        artifact_type: "ArticleDraft",
        artifact_id: context.artifact_id || null,
        summary: "Resolve failed.",
        validation_errors: [error instanceof Error ? error.message : "Unknown resolve failure"],
      };
      storeResolution(failure, message);
      setOpen(true);
    } finally {
      setProcessingStep(null);
      setProcessing(false);
    }
  }, [session.inputText, processing, context.artifact_id, context.artifact_type, storeResolution]);

  const applyPendingProposal = useCallback(async () => {
    if (!session.pendingProposal || processing) return;
    const targetArtifactId = context.artifact_id || session.lastResolution?.artifact_id || null;
    if (!targetArtifactId) return;
    setProcessing(true);
    setProcessingStep("validating");
    try {
      const result = await applyXynIntent({
        action_type: "ApplyPatch",
        artifact_type: "ArticleDraft",
        artifact_id: targetArtifactId,
        payload: session.pendingProposal.patch_object,
      });
      storeResolution(result, session.lastMessage || "");
      setPendingCloseBlock(false);
    } catch (error) {
      const failure: XynIntentResolutionResult = {
        status: "ValidationError",
        action_type: "ApplyPatch",
        artifact_type: "ArticleDraft",
        artifact_id: targetArtifactId,
        summary: "Apply failed.",
        validation_errors: [error instanceof Error ? error.message : "Unknown apply failure"],
      };
      storeResolution(failure, session.lastMessage || "");
    } finally {
      setProcessingStep(null);
      setProcessing(false);
    }
  }, [session.pendingProposal, session.lastMessage, session.lastResolution?.artifact_id, processing, context.artifact_id, storeResolution]);

  const applyDraftPayload = useCallback(async () => {
    if (processing) return;
    const payload = session.lastResolution?.draft_payload;
    if (!payload || typeof payload !== "object") return;
    setProcessing(true);
    setProcessingStep("validating");
    try {
      const result = await applyXynIntent({
        action_type: "CreateDraft",
        artifact_type: "ArticleDraft",
        payload,
      });
      storeResolution(result, session.lastMessage || "");
      setPendingCloseBlock(false);
    } catch (error) {
      const failure: XynIntentResolutionResult = {
        status: "ValidationError",
        action_type: "CreateDraft",
        artifact_type: "ArticleDraft",
        artifact_id: null,
        summary: "Create draft failed.",
        validation_errors: [error instanceof Error ? error.message : "Unknown create failure"],
      };
      storeResolution(failure, session.lastMessage || "");
    } finally {
      setProcessingStep(null);
      setProcessing(false);
    }
  }, [processing, session.lastResolution?.draft_payload, session.lastMessage, storeResolution]);

  const cancelPendingProposal = useCallback(() => {
    updateSession((current) => ({
      ...current,
      pendingProposal: null,
      lastResolution: current.lastResolution
        ? { ...current.lastResolution, status: "ValidationError", summary: "Proposal canceled." }
        : current.lastResolution,
    }));
    setPendingCloseBlock(false);
  }, [updateSession]);

  const fetchOptions = useCallback(async (field: "category" | "format" | "duration") => {
    if (processing) return;
    try {
      const response = await getXynIntentOptions({ artifact_type: "ArticleDraft", field });
      updateSession((current) => ({
        ...current,
        optionsByField: {
          ...current.optionsByField,
          [field]: response,
        },
      }));
    } catch {
      // Keep panel deterministic; no-op on options fetch errors.
    }
  }, [processing, updateSession]);

  const injectSuggestion = useCallback((snippet: string) => {
    const text = String(snippet || "").trim();
    if (!text) return;
    updateSession((current) => {
      const prefix = current.inputText?.trim() ? `${current.inputText.trim()}; ` : "";
      return {
        ...current,
        inputText: `${prefix}${text}`,
      };
    });
  }, [updateSession]);

  const setContext = useCallback((next: XynConsoleContextRef) => {
    setContextState({
      artifact_id: next.artifact_id || null,
      artifact_type: next.artifact_type || null,
    });
  }, []);

  const clearContext = useCallback(() => {
    setContextState({ artifact_id: null, artifact_type: null });
  }, []);

  const badgeActive = useMemo(() => {
    if (session.pendingProposal) return true;
    return resolutionNeedsBadge(session.lastResolution?.status);
  }, [session.pendingProposal, session.lastResolution?.status]);

  const value = useMemo<XynConsoleContextValue>(
    () => ({
      open,
      setOpen,
      context,
      setContext,
      clearContext,
      contextKey,
      inputText: session.inputText,
      setInputText,
      processing,
      processingStep,
      session,
      badgeActive,
      pendingCloseBlock,
      submitResolve,
      applyPendingProposal,
      applyDraftPayload,
      cancelPendingProposal,
      fetchOptions,
      injectSuggestion,
    }),
    [
      open,
      context,
      setContext,
      clearContext,
      contextKey,
      session,
      setInputText,
      processing,
      processingStep,
      badgeActive,
      pendingCloseBlock,
      submitResolve,
      applyPendingProposal,
      applyDraftPayload,
      cancelPendingProposal,
      fetchOptions,
      injectSuggestion,
    ]
  );

  return <XynConsoleContext.Provider value={value}>{children}</XynConsoleContext.Provider>;
}

export function useXynConsole(): XynConsoleContextValue {
  const value = useContext(XynConsoleContext);
  if (!value) throw new Error("useXynConsole must be used within XynConsoleProvider");
  return value;
}
