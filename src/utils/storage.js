const STORAGE_KEY = "habitly_state_v1";

const DEFAULT_STATE = {
  tasks: [],
  completedHours: [],
  objectives: [
    {
      id: "obj-pau",
      name: "Estudio PAU",
      description: "Preparación integral para el examen PAU",
      color: "#67c8ff",
    },
  ],
  profile: {
    name: "",
    avatarDataUrl: "",
  },
};

function parseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeTask(rawTask = {}) {
  return {
    id: String(rawTask.id ?? crypto.randomUUID()),
    title: String(rawTask.title ?? "").trim(),
    description: String(rawTask.description ?? "").trim(),
    day: String(rawTask.day ?? "monday"),
    hour: Number(rawTask.hour ?? 8),
    duration: Math.max(1, Number(rawTask.duration ?? 1)),
    priority: String(rawTask.priority ?? "medium"),
    type: String(rawTask.type ?? "study").trim() || "study",
    objectiveId: rawTask.objectiveId ? String(rawTask.objectiveId) : "",
  };
}

function normalizeObjective(rawObjective = {}) {
  return {
    id: String(rawObjective.id ?? crypto.randomUUID()),
    name: String(rawObjective.name ?? "Objetivo").trim() || "Objetivo",
    description: String(rawObjective.description ?? "").trim(),
    color: String(rawObjective.color ?? "#67c8ff"),
  };
}

function normalizeCompletedHour(rawHour = {}) {
  return {
    day: String(rawHour.day ?? "monday"),
    hour: Number(rawHour.hour ?? 8),
  };
}

export function loadState() {
  if (typeof localStorage === "undefined") {
    return structuredClone(DEFAULT_STATE);
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(DEFAULT_STATE);
  }

  const parsed = parseJSON(raw, DEFAULT_STATE);

  return {
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : [],
    completedHours: Array.isArray(parsed.completedHours)
      ? parsed.completedHours.map(normalizeCompletedHour)
      : [],
    objectives:
      Array.isArray(parsed.objectives) && parsed.objectives.length > 0
        ? parsed.objectives.map(normalizeObjective)
        : structuredClone(DEFAULT_STATE.objectives),
    profile: {
      name: String(parsed.profile?.name ?? DEFAULT_STATE.profile.name),
      avatarDataUrl: String(parsed.profile?.avatarDataUrl ?? DEFAULT_STATE.profile.avatarDataUrl),
    },
  };
}

export function saveState(state) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDefaultState() {
  return structuredClone(DEFAULT_STATE);
}
