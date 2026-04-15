import { isRemotePersistenceEnabled, loadRemoteState, saveRemoteState } from "./supabase.js";

const STORAGE_KEY = "habitly_state_v2";
const LEGACY_STORAGE_KEY = "habitly_state_v1";

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

function createUid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTask(rawTask = {}) {
  const startHour = Number(
    rawTask.startHour ?? (rawTask.hour != null ? Math.floor(Number(rawTask.hour)) : 8),
  );
  const startMinute = Number(
    rawTask.startMinute ??
      (rawTask.hour != null
        ? Math.round((Number(rawTask.hour) - Math.floor(Number(rawTask.hour))) * 60)
        : 0),
  );
  const endHour =
    rawTask.endHour != null
      ? Number(rawTask.endHour)
      : rawTask.duration != null
        ? Math.floor(Number(rawTask.hour ?? startHour) + Number(rawTask.duration))
        : null;
  const endMinute = rawTask.endMinute != null ? Number(rawTask.endMinute) : endHour != null ? 0 : null;

  return {
    id: String(rawTask.id ?? createUid()),
    title: String(rawTask.title ?? "").trim(),
    description: String(rawTask.description ?? "").trim(),
    date: String(rawTask.date ?? getDateString()),
    startHour,
    startMinute,
    endHour,
    endMinute,
    priority: String(rawTask.priority ?? "medium"),
    type: String(rawTask.type ?? "study").trim() || "study",
    objectiveId: rawTask.objectiveId ? String(rawTask.objectiveId) : "",
  };
}

function normalizeObjective(rawObjective = {}) {
  return {
    id: String(rawObjective.id ?? createUid()),
    name: String(rawObjective.name ?? "Objetivo").trim() || "Objetivo",
    description: String(rawObjective.description ?? "").trim(),
    color: String(rawObjective.color ?? "#67c8ff"),
  };
}

function normalizeCompletedHour(rawHour = {}) {
  return {
    date: String(rawHour.date ?? getDateString()),
    hour: Number(rawHour.hour ?? 8),
  };
}

function normalizeState(parsed = {}) {
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

function hasMeaningfulData(currentState) {
  if (currentState.tasks.length > 0 || currentState.completedHours.length > 0) {
    return true;
  }
  if (currentState.profile.name || currentState.profile.avatarDataUrl) {
    return true;
  }

  const defaults = DEFAULT_STATE.objectives;
  if (currentState.objectives.length !== defaults.length) {
    return true;
  }

  return currentState.objectives.some((objective, index) => {
    const defaultObjective = defaults[index];
    if (!defaultObjective) {
      return true;
    }
    return (
      objective.id !== defaultObjective.id ||
      objective.name !== defaultObjective.name ||
      objective.description !== defaultObjective.description ||
      objective.color !== defaultObjective.color
    );
  });
}

function loadLocalState() {
  if (typeof localStorage === "undefined") {
    return structuredClone(DEFAULT_STATE);
  }

  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    return structuredClone(DEFAULT_STATE);
  }

  const parsed = parseJSON(raw, DEFAULT_STATE);
  const normalized = normalizeState(parsed);
  saveLocalState(normalized);
  return normalized;
}

function saveLocalState(state) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function loadState() {
  const localState = loadLocalState();

  if (!isRemotePersistenceEnabled()) {
    return localState;
  }

  try {
    const remotePayload = await loadRemoteState();
    if (remotePayload) {
      const remoteState = normalizeState(remotePayload);
      saveLocalState(remoteState);
      return remoteState;
    }

    if (hasMeaningfulData(localState)) {
      await saveRemoteState(localState);
    }
  } catch (error) {
    console.warn("Habitly: fallback to local persistence.", error);
  }

  return localState;
}

export async function saveState(state) {
  const normalizedState = normalizeState(state);
  saveLocalState(normalizedState);

  if (!isRemotePersistenceEnabled()) {
    return;
  }

  try {
    await saveRemoteState(normalizedState);
  } catch (error) {
    console.warn("Habitly: failed to sync with Supabase.", error);
  }
}

export function getDefaultState() {
  return structuredClone(DEFAULT_STATE);
}
