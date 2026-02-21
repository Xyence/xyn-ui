import { useEffect, useMemo, useState } from "react";
import { getTour } from "../../../api/xyn";
import type { TourDefinition } from "../../../api/types";

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
    if (!raw) return { index: 0, dismissed: false, completed: false };
    return { index: 0, dismissed: false, completed: false, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    return { index: 0, dismissed: false, completed: false };
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

export default function TourOverlay({ userKey, launchSlug, launchToken, currentPath, navigateTo, onClose }: TourOverlayProps) {
  const [tour, setTour] = useState<TourDefinition | null>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [selectorFound, setSelectorFound] = useState(true);

  const step = useMemo(() => {
    if (!tour) return null;
    return tour.steps[index] || null;
  }, [tour, index]);

  useEffect(() => {
    let cancelled = false;
    if (!launchSlug || launchToken === 0) return;
    (async () => {
      try {
        const definition = await getTour(launchSlug);
        if (cancelled) return;
        const progress = loadProgress(userKey, definition.slug);
        const nextIndex = Math.min(progress.index || 0, Math.max(0, definition.steps.length - 1));
        setTour(definition);
        setIndex(nextIndex);
        setOpen(true);
        const targetRoute = definition.steps[nextIndex]?.route;
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
    if (!open || !step) return;
    if (step.route && !routeMatchesCurrentPath(step.route, currentPath)) {
      navigateTo(step.route);
      return;
    }
    let highlighted: Element | null = null;
    if (step.selector) {
      highlighted = document.querySelector(step.selector);
      if (highlighted) {
        highlighted.classList.add("tour-highlighted");
        if (highlighted instanceof HTMLElement) {
          highlighted.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setSelectorFound(true);
      } else {
        setSelectorFound(false);
      }
    } else {
      setSelectorFound(true);
    }
    return () => {
      if (highlighted) highlighted.classList.remove("tour-highlighted");
    };
  }, [open, step, currentPath, navigateTo]);

  const persist = (patch: Partial<PersistedState>) => {
    if (!tour) return;
    const current = loadProgress(userKey, tour.slug);
    saveProgress(userKey, tour.slug, { ...current, ...patch });
  };

  const closeTour = (dismissed: boolean) => {
    if (tour) {
      persist({ dismissed, index, completed: false });
    }
    setOpen(false);
    onClose();
  };

  const nextStep = () => {
    if (!tour) return;
    const next = index + 1;
    if (next >= tour.steps.length) {
      persist({ index: tour.steps.length - 1, completed: true, dismissed: false });
      setOpen(false);
      onClose();
      return;
    }
    setIndex(next);
    persist({ index: next, dismissed: false, completed: false });
  };

  const previousStep = () => {
    const next = Math.max(0, index - 1);
    setIndex(next);
    if (tour) {
      persist({ index: next });
    }
  };

  if (!open || !tour || !step) return null;

  return (
    <div className="tour-overlay" role="dialog" aria-label="Product tour">
      <div className="tour-card">
        <div className="tour-header">
          <h4>{tour.title}</h4>
          <span className="muted small">
            Step {index + 1} / {tour.steps.length}
          </span>
        </div>
        <p>{step.text}</p>
        {!selectorFound && (
          <p className="muted small">Target element not found on this page. You can continue and the tour will stay usable.</p>
        )}
        <div className="tour-actions">
          <button className="ghost small" onClick={() => closeTour(true)}>
            Dismiss
          </button>
          <button className="ghost small" onClick={previousStep} disabled={index === 0}>
            Back
          </button>
          <button className="primary" onClick={nextStep}>
            {index + 1 >= tour.steps.length ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
