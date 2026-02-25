export type ArticleDraftSnapshot = {
  title: string | null;
  category: string | null;
  format: string | null;
  intent: string | null;
  duration: number | null;
  tags: string[];
  summary: string | null;
  body: string | null;
};

export const ARTICLE_PATCHABLE_FIELDS = ["title", "category", "format", "intent", "duration", "tags", "summary", "body"] as const;

type PatchableField = (typeof ARTICLE_PATCHABLE_FIELDS)[number];

type ApplyPatchResult = {
  next: ArticleDraftSnapshot;
  appliedFields: PatchableField[];
  ignoredFields: string[];
};

function normalizeText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeDuration(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
}

export function buildArticleDraftSnapshot(input: Partial<ArticleDraftSnapshot>): ArticleDraftSnapshot {
  return {
    title: normalizeText(input.title),
    category: normalizeText(input.category),
    format: normalizeText(input.format),
    intent: normalizeText(input.intent),
    duration: normalizeDuration(input.duration),
    tags: normalizeTags(input.tags),
    summary: normalizeText(input.summary),
    body: normalizeText(input.body),
  };
}

export function applyPatchToFormSnapshot(current: ArticleDraftSnapshot, patch: Record<string, unknown>): ApplyPatchResult {
  const next: ArticleDraftSnapshot = { ...current };
  const appliedFields: PatchableField[] = [];
  const ignoredFields: string[] = [];

  for (const [key, rawValue] of Object.entries(patch || {})) {
    if (!ARTICLE_PATCHABLE_FIELDS.includes(key as PatchableField)) {
      ignoredFields.push(key);
      continue;
    }
    const field = key as PatchableField;

    if (field === "tags") {
      const tags = normalizeTags(rawValue);
      if (JSON.stringify(tags) !== JSON.stringify(next.tags)) {
        next.tags = tags;
        appliedFields.push(field);
      }
      continue;
    }
    if (field === "duration") {
      const duration = normalizeDuration(rawValue);
      if (duration !== next.duration) {
        next.duration = duration;
        appliedFields.push(field);
      }
      continue;
    }
    const normalized = normalizeText(rawValue);
    if (next[field] !== normalized) {
      next[field] = normalized;
      appliedFields.push(field);
    }
  }

  return {
    next,
    appliedFields,
    ignoredFields,
  };
}
