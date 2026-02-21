import { useEffect, useMemo, useState } from "react";
import { getTour } from "../../../api/xyn";
import type {
  TourActionV2,
  TourDefinition,
  TourDefinitionV1,
  TourStepV2,
  TourVariableDefinitionV2,
} from "../../../api/types";

type TourOverlayProps = {
  userKey: string;
  launchSlug: string | null;
  launchToken: number;
  currentPath: string;
  navigateTo: (path: string) => void;
  onClose: () => void;
};

type PersistedState = {
  index: number;
  dismissed: boolean;
  completed: boolean;
  schema_version?: number;
  variables?: Record<string, string>;
  resource_ids?: Record<string, string>;
};

function normalizePath(path: string): string {
  const trimmed = (path || "").trim();
  if (!trimmed) return "/";
  return trimmed.endsWith("/") && trimmed !== "/" ? trimmed.slice(0, -1) : trimmed;
}

function routeMatchesCurrentPath(stepRoute: string, currentPath: string): boolean {
  const expected = normalizePath(stepRoute);
  const current = normalizePath(currentPath);
  return current === expected || current.startsWith(`${expected}/`);
}

function storageKey(userKey: string, slug: string): string {
  return `xyn.tour.progress.${slug}.${userKey || "anon"}`;
}

function loadProgress(userKey: string, slug: string): PersistedState {
  try {
    const raw = localStorage.getItem(storageKey(userKey, slug));
    if (!raw) return { index: 0, dismissed: false, completed: false, variables: {}, resource_ids: {} };
    return {
      index: 0,
      dismissed: false,
      completed: false,
      variables: {},
      resource_ids: {},
      ...(JSON.parse(raw) as Partial<PersistedState>),
    };
  } catch {
    return { index: 0, dismissed: false, completed: false, variables: {}, resource_ids: {} };
  }
}

function saveProgress(userKey: string, slug: string, state: PersistedState): void {
  try {
    localStorage.setItem(storageKey(userKey, slug), JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

export function loadTourProgressForTest(userKey: string, slug: string): PersistedState {
  return loadProgress(userKey, slug);
}

export function saveTourProgressForTest(userKey: string, slug: string, state: PersistedState): void {
  saveProgress(userKey, slug, state);
}

type RuntimeAction = TourActionV2;

type RuntimeTourStep = TourStepV2 & { title: string; body: string; actions: RuntimeAction[] };

type RuntimeTour = {
  schema_version: number;
  slug: string;
  title: string;
  description?: string;
  variables: Record<string, TourVariableDefinitionV2>;
  steps: RuntimeTourStep[];
};

function normalizeTour(definition: TourDefinition): RuntimeTour {
  if ("schema_version" in definition && definition.schema_version === 2) {
    return {
      schema_version: 2,
      slug: definition.slug,
      title: definition.title,
      description: definition.description,
      variables: definition.variables || {},
      steps: definition.steps.map((step) => ({
        ...step,
        attach: step.attach || { selector: null, fallback: "center" },
        actions: step.actions || [],
      })),
    };
  }
  const legacy = definition as TourDefinitionV1;
  return {
    schema_version: 1,
    slug: legacy.slug,
    title: legacy.title,
    description: legacy.description,
    variables: {},
    steps: legacy.steps.map((step) => ({
      id: step.id,
      route: step.route,
      attach: { selector: step.selector || null, fallback: "center" },
      title: legacy.title,
      body: step.text,
      actions: [],
      wait_for: null,
    })),
  };
}

function generateBase32(length = 8): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let value = "";
  for (let idx = 0; idx < Math.max(1, length); idx += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function interpolateTemplate(value: string, variables: Record<string, string>): string {
  return value.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_full, key: string) => variables[key] ?? "");
}

function interpolateJsonTemplate(input: unknown, variables: Record<string, string>): unknown {
  if (typeof input === "string") return interpolateTemplate(input, variables);
  if (Array.isArray(input)) return input.map((entry) => interpolateJsonTemplate(entry, variables));
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, interpolateJsonTemplate(value, variables)])
    );
  }
  return input;
}

function resolveVariables(
  definitions: Record<string, TourVariableDefinitionV2>,
  previous: Record<string, string>,
  userKey: string
): Record<string, string> {
  const resolved: Record<string, string> = {
    username: (userKey || "anon").split("@")[0] || "anon",
    short_id: previous.short_id || generateBase32(8),
    ...previous,
  };
  const remaining = new Set(Object.keys(definitions));
  for (let pass = 0; pass < 6 && remaining.size > 0; pass += 1) {
    for (const key of Array.from(remaining)) {
      const definition = definitions[key];
      if (!definition) {
        remaining.delete(key);
        continue;
      }
      if (definition.type === "generated") {
        const format = definition.format || "base32";
        const length = definition.length || 8;
        if (format === "base32") {
          resolved[key] = resolved[key] || generateBase32(length);
        }
        remaining.delete(key);
      } else if (definition.type === "static") {
        resolved[key] = definition.value;
        remaining.delete(key);
      } else if (definition.type === "template") {
        resolved[key] = interpolateTemplate(definition.value, resolved);
        remaining.delete(key);
      }
    }
  }
  return resolved;
}

async function pollForSelector(selector: string, timeoutMs: number): Promise<Element | null> {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    const found = document.querySelector(selector);
    if (found) return found;
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
  return null;
}

export default function TourOverlay({ userKey, launchSlug, launchToken, currentPath, navigateTo, onClose }: TourOverlayProps) {
  const [tour, setTour] = useState<RuntimeTour | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [persisted, setPersisted] = useState<PersistedState>({ index: 0, dismissed: false, completed: false, variables: {}, resource_ids: {} });
  const [attachedToSelector, setAttachedToSelector] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const step = useMemo(() => {
    if (!tour) return null;
    return tour.steps[index] || null;
  }, [tour, index]);

  const resolvedVariables = useMemo(
    () => resolveVariables(tour?.variables || {}, persisted.variables || {}, userKey),
    [persisted.variables, tour?.variables, userKey]
  );

  const interpolatedStep = useMemo(() => {
    if (!step) return null;
    return {
      ...step,
      title: interpolateTemplate(step.title, resolvedVariables),
      body: interpolateTemplate(step.body, resolvedVariables),
      actions: step.actions.map((action) => {
        if (action.type === "ui_hint") {
          return {
            ...action,
            text: interpolateTemplate(action.text, resolvedVariables),
            label: action.label ? interpolateTemplate(action.label, resolvedVariables) : action.label,
          };
        }
        if (action.type === "copy_to_clipboard") {
          return { ...action, label: interpolateTemplate(action.label, resolvedVariables), value_template: interpolateTemplate(action.value_template, resolvedVariables) };
        }
        if (action.type === "set_context") {
          return {
            ...action,
            label: interpolateTemplate(action.label, resolvedVariables),
            key: interpolateTemplate(action.key, resolvedVariables),
            value_template: interpolateTemplate(action.value_template, resolvedVariables),
          };
        }
        return {
          ...action,
          label: interpolateTemplate(action.label, resolvedVariables),
          id_key: interpolateTemplate(action.id_key, resolvedVariables),
          instructions: action.instructions ? interpolateTemplate(action.instructions, resolvedVariables) : action.instructions,
          create_via: action.create_via
            ? {
                ...action.create_via,
                path: interpolateTemplate(action.create_via.path, resolvedVariables),
                body_template: interpolateJsonTemplate(action.create_via.body_template, resolvedVariables) as Record<string, unknown> | undefined,
              }
            : action.create_via,
        };
      }),
    };
  }, [resolvedVariables, step]);

  useEffect(() => {
    let cancelled = false;
    if (!launchSlug || launchToken === 0) return;
    (async () => {
      try {
        const definition = await getTour(launchSlug);
        if (cancelled) return;
        const normalized = normalizeTour(definition);
        const progress = loadProgress(userKey, normalized.slug);
        const nextIndex = Math.min(progress.index || 0, Math.max(0, normalized.steps.length - 1));
        setTour(normalized);
        setIndex(nextIndex);
        setPersisted(progress);
        setOpen(true);
        setActionMessage(null);
        setCopyFeedback(null);
        const targetRoute = normalized.steps[nextIndex]?.route;
        if (targetRoute && !routeMatchesCurrentPath(targetRoute, currentPath)) {
          navigateTo(targetRoute);
        }
      } catch {
        if (!cancelled) {
          setOpen(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [launchSlug, launchToken, userKey, currentPath, navigateTo]);

  useEffect(() => {
    if (!open || !interpolatedStep) return;
    if (interpolatedStep.route && !routeMatchesCurrentPath(interpolatedStep.route, currentPath)) {
      navigateTo(interpolatedStep.route);
      return;
    }
    let cancelled = false;
    let highlighted: Element | null = null;
    (async () => {
      const selector = interpolatedStep.attach?.selector || null;
      if (!selector) {
        setAttachedToSelector(true);
        return;
      }
      const waitMs = Math.max(0, interpolatedStep.attach?.wait_ms || 0);
      highlighted = waitMs > 0 ? await pollForSelector(selector, waitMs) : document.querySelector(selector);
      if (cancelled) return;
      if (highlighted) {
        highlighted.classList.add("tour-highlighted");
        if (highlighted instanceof HTMLElement) {
          highlighted.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setAttachedToSelector(true);
        return;
      }
      setAttachedToSelector(false);
    })();
    return () => {
      cancelled = true;
      if (highlighted) highlighted.classList.remove("tour-highlighted");
    };
  }, [open, interpolatedStep, currentPath, navigateTo]);

  const persist = (patch: Partial<PersistedState>) => {
    if (!tour) return;
    const current = loadProgress(userKey, tour.slug);
    const next = { ...current, ...patch };
    saveProgress(userKey, tour.slug, next);
    setPersisted(next);
  };

  const closeTour = (dismissed: boolean, completed = false) => {
    if (tour) {
      persist({ dismissed, index, completed });
    }
    setOpen(false);
    onClose();
  };

  const nextStep = () => {
    if (!tour) return;
    const next = index + 1;
    if (next >= tour.steps.length) {
      closeTour(false, true);
      return;
    }
    setIndex(next);
    persist({ index: next, dismissed: false, completed: false });
    setActionMessage(null);
    setCopyFeedback(null);
  };

  const previousStep = () => {
    const next = Math.max(0, index - 1);
    setIndex(next);
    if (tour) {
      persist({ index: next });
    }
    setActionMessage(null);
    setCopyFeedback(null);
  };

  const restartTour = () => {
    if (!tour) return;
    setIndex(0);
    persist({ index: 0, dismissed: false, completed: false, resource_ids: {} });
    setActionMessage(null);
    setCopyFeedback(null);
  };

  const resumeTour = () => {
    const resumeIndex = Math.min(Math.max(persisted.index || 0, 0), Math.max((tour?.steps.length || 1) - 1, 0));
    setIndex(resumeIndex);
    setActionMessage(null);
    setCopyFeedback(null);
  };

  const setContextValue = (key: string, value: string) => {
    const resource_ids = { ...(persisted.resource_ids || {}), [key]: value };
    persist({ resource_ids });
  };

  const runAction = async (action: RuntimeAction) => {
    try {
      setActionMessage(null);
      if (action.type === "copy_to_clipboard") {
        await navigator.clipboard.writeText(action.value_template);
        setCopyFeedback(`Copied: ${action.label}`);
        return;
      }
      if (action.type === "set_context") {
        setContextValue(action.key, action.value_template);
        setActionMessage("Saved to tour context.");
        return;
      }
      if (action.type === "ensure_resource") {
        const existing = persisted.resource_ids?.[action.id_key];
        if (existing) {
          setActionMessage("Resource already prepared for this tour run.");
          return;
        }
        if (action.create_via) {
          const response = await fetch(action.create_via.path, {
            method: action.create_via.method,
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.create_via.body_template || {}),
          });
          if (!response.ok) {
            throw new Error(`Create request failed (${response.status})`);
          }
          const payload = (await response.json()) as Record<string, unknown>;
          const createdId =
            (typeof payload[action.id_key] === "string" ? (payload[action.id_key] as string) : null) ||
            (typeof payload.id === "string" ? (payload.id as string) : null) ||
            (typeof payload.session_id === "string" ? (payload.session_id as string) : null);
          if (createdId) {
            setContextValue(action.id_key, createdId);
            setActionMessage(`${action.resource} ready.`);
          } else {
            setActionMessage(`${action.resource} request completed. Continue in UI if needed.`);
          }
          return;
        }
        setActionMessage(action.instructions || "Complete this action in the UI, then continue.");
        return;
      }
      if (action.type === "ui_hint") {
        setActionMessage(action.text);
      }
    } catch (error) {
      setActionMessage((error as Error).message || "Action failed.");
    }
  };

  if (!open || !tour || !interpolatedStep) return null;

  const resumeAvailable = (persisted.index || 0) > 0 && (persisted.index || 0) !== index;

  return (
    <div className="tour-overlay" role="dialog" aria-label="Product tour">
      <div className="tour-card">
        <div className="tour-header">
          <h4>{tour.title}</h4>
          <span className="muted small">
            Step {index + 1} / {tour.steps.length}
          </span>
        </div>
        <h5>{interpolatedStep.title}</h5>
        <p>{interpolatedStep.body}</p>
        {Boolean(interpolatedStep.attach?.selector) && !attachedToSelector && (
          <p className="muted small">Showing centered guidance while this page renders its target controls.</p>
        )}
        {interpolatedStep.actions.length > 0 && (
          <div className="stack">
            {interpolatedStep.actions.map((action, actionIndex) => (
              <div key={`${interpolatedStep.id}-action-${actionIndex}`} className="inline-actions">
                {action.type === "ui_hint" && <span className="muted small">{action.text}</span>}
                {action.type === "copy_to_clipboard" && (
                  <button className="ghost small" onClick={() => void runAction(action)}>
                    {action.label}
                  </button>
                )}
                {action.type === "set_context" && (
                  <button className="ghost small" onClick={() => void runAction(action)}>
                    {action.label}
                  </button>
                )}
                {action.type === "ensure_resource" && (
                  <>
                    <button className="ghost small" onClick={() => void runAction(action)}>
                      {persisted.resource_ids?.[action.id_key] ? `${action.label} (done)` : action.label}
                    </button>
                    {action.instructions && <span className="muted small">{action.instructions}</span>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {copyFeedback && <p className="muted small">{copyFeedback}</p>}
        {actionMessage && <p className="muted small">{actionMessage}</p>}
        <div className="tour-actions">
          <button className="ghost small" onClick={() => closeTour(true, false)}>
            Exit
          </button>
          <button className="ghost small" onClick={restartTour}>
            Restart
          </button>
          <button className="ghost small" onClick={previousStep} disabled={index === 0}>
            Back
          </button>
          {resumeAvailable && (
            <button className="ghost small" onClick={resumeTour}>
              Resume
            </button>
          )}
          <button className="primary" onClick={nextStep}>
            {index + 1 >= tour.steps.length ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
