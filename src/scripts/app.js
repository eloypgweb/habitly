import { getDefaultState, loadState, saveState } from "../utils/storage.js";
import { getCurrentUser, signOutUser } from "../utils/supabase.js";

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miercoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sabado" },
  { key: "sunday", label: "Domingo" },
];

const START_HOUR = 8;
const END_HOUR = 23;
const TAB_NAMES = ["today", "week", "month", "goals", "profile"];
const GOAL_COLORS = ["#67c8ff", "#5ad89d", "#ff8a65", "#f2c94c", "#bb86fc", "#ff6b9f"];
const SAVE_DEBOUNCE_MS = 700;
const RETRY_DELAY_MS = 4000;
const IMPORT_MAX_BYTES = 1024 * 1024 * 2;

const state = {
  ...getDefaultState(),
  activeTab: "today",
  monthCursor: new Date(),
  pendingGoalDeletionId: "",
  pendingGoalEditId: "",
  pendingTaskDeletionId: "",
  filters: {
    type: "all",
  },
};

const refs = {
  appDate: document.getElementById("app-date"),
  syncStatus: document.getElementById("sync-status"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab-trigger]")),
  views: Array.from(document.querySelectorAll("[data-view]")),
  todayTitle: document.getElementById("today-title"),
  todayTaskCount: document.getElementById("today-task-count"),
  todayTaskList: document.getElementById("today-task-list"),
  todayPending: document.getElementById("today-pending"),
  weeklyOverview: document.getElementById("weekly-overview"),
  monthTitle: document.getElementById("month-title"),
  monthGrid: document.getElementById("month-grid"),
  goalsList: document.getElementById("goals-list"),
  goalForm: document.getElementById("goal-create-form"),
  goalName: document.getElementById("goal-name"),
  goalDescription: document.getElementById("goal-description"),
  goalColorInputs: Array.from(document.querySelectorAll('input[name="goal-color"]')),
  goalCreateModal: document.getElementById("goal-create-modal"),
  openGoalForm: document.getElementById("open-goal-form"),
  closeGoalForm: document.getElementById("close-goal-form"),
  cancelGoalForm: document.getElementById("cancel-goal-form"),
  confirmGoalModal: document.getElementById("confirm-goal-modal"),
  closeConfirmGoal: document.getElementById("close-confirm-goal"),
  cancelConfirmGoal: document.getElementById("cancel-confirm-goal"),
  acceptConfirmGoal: document.getElementById("accept-confirm-goal"),
  confirmTaskModal: document.getElementById("confirm-task-modal"),
  closeConfirmTask: document.getElementById("close-confirm-task"),
  cancelConfirmTask: document.getElementById("cancel-confirm-task"),
  acceptConfirmTask: document.getElementById("accept-confirm-task"),
  typeFilter: document.getElementById("task-type-filter"),
  completedHours: document.getElementById("completed-hours"),
  taskModal: document.getElementById("task-modal"),
  fabAddTask: document.getElementById("fab-add-task"),
  closeTaskForm: document.getElementById("close-task-form"),
  cancelTaskForm: document.getElementById("cancel-task-form"),
  taskFormTitle: document.getElementById("task-form-title"),
  taskForm: document.getElementById("task-form"),
  taskId: document.getElementById("task-id"),
  taskTitle: document.getElementById("task-title"),
  taskDescription: document.getElementById("task-description"),
  taskDate: document.getElementById("task-date"),
  taskHour: document.getElementById("task-hour"),
  taskMinute: document.getElementById("task-minute"),
  taskEndHour: document.getElementById("task-end-hour"),
  taskEndMinute: document.getElementById("task-end-minute"),
  taskPriority: document.getElementById("task-priority"),
  taskType: document.getElementById("task-type"),
  taskObjective: document.getElementById("task-objective"),
  profileName: document.getElementById("profile-name"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileAvatarFallback: document.getElementById("profile-avatar-fallback"),
  profilePhotoInput: document.getElementById("profile-photo-input"),
  choosePhotoBtn: document.getElementById("choose-photo-btn"),
  saveProfileBtn: document.getElementById("save-profile-btn"),
  exportStateBtn: document.getElementById("export-state-btn"),
  importStateBtn: document.getElementById("import-state-btn"),
  importStateInput: document.getElementById("import-state-input"),
  logoutBtn: document.getElementById("logout-btn"),
  profileTotalTasks: document.getElementById("profile-total-tasks"),
  profileTotalCompleted: document.getElementById("profile-total-completed"),
};

const saveQueue = {
  saveTimer: null,
  retryTimer: null,
  pending: false,
  inFlight: false,
};

function createUid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatHour(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const hStr = String(h).padStart(2, "0");
  const mStr = String(m).padStart(2, "0");
  return `${hStr}:${mStr}`;
}

function formatTime(hour, minute) {
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${h}:${m}`;
}

function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  const dayIndex = date.getDay();
  const dayMap = { 0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday" };
  return dayMap[dayIndex] || "monday";
}

function getDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeType(value) {
  return value.trim().toLowerCase();
}

function slotKey(day, hour) {
  return `${day}_${hour}`;
}

function getDayFromDate(date) {
  const jsDay = date.getDay();
  const map = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  return map[jsDay];
}

function getCurrentDayKey() {
  return getDayFromDate(new Date());
}

function getDayLabel(dayKey) {
  return DAYS.find((day) => day.key === dayKey)?.label ?? dayKey;
}

function daySortValue(dayKey) {
  return DAYS.findIndex((day) => day.key === dayKey);
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function getTaskHourBlocks(task) {
  const blocks = [];
  const startBlock = Math.floor(task.startHour);
  
  // If no end hour (indefinido), just use start block
  if (task.endHour === null || task.endHour === undefined) {
    return [startBlock];
  }
  
  const endBlock = Math.floor(task.endHour);
  for (let blockHour = startBlock; blockHour < endBlock; blockHour += 1) {
    if (blockHour > END_HOUR) {
      break;
    }
    blocks.push(blockHour);
  }
  
  return blocks.length > 0 ? blocks : [startBlock];
}

function isHourCompleted(date, hour) {
  return state.completedHours.some((entry) => entry.date === date && entry.hour === hour);
}

function isTaskCompleted(task) {
  const blocks = getTaskHourBlocks(task);
  if (!blocks.length) {
    return false;
  }
  return blocks.every((hour) => isHourCompleted(task.date, hour));
}

function setTaskCompletion(task, shouldComplete) {
  const blocks = getTaskHourBlocks(task);

  blocks.forEach((hour) => {
    const index = state.completedHours.findIndex((entry) => entry.date === task.date && entry.hour === hour);
    if (shouldComplete && index < 0) {
      state.completedHours.push({ date: task.date, hour });
    }
    if (!shouldComplete && index >= 0) {
      state.completedHours.splice(index, 1);
    }
  });
}

function getObjectiveById(objectiveId) {
  return state.objectives.find((objective) => objective.id === objectiveId);
}

function sanitizeObjectives() {
  state.objectives = state.objectives.map((objective, index) => {
    const color = GOAL_COLORS.includes(objective.color)
      ? objective.color
      : GOAL_COLORS[index % GOAL_COLORS.length];
    return {
      ...objective,
      color,
    };
  });
}

function getObjectiveColor(task) {
  if (!task.objectiveId) {
    return "";
  }
  return getObjectiveById(task.objectiveId)?.color ?? "";
}

function getObjectiveName(task) {
  if (!task.objectiveId) {
    return "Sin objetivo";
  }
  return getObjectiveById(task.objectiveId)?.name ?? "Sin objetivo";
}

function getMotivationMessage(progressRatio) {
  if (progressRatio >= 1) {
    return "Objetivo completado. Gran trabajo!";
  }
  if (progressRatio >= 0.75) {
    return "Recta final. Ya casi lo tienes.";
  }
  if (progressRatio >= 0.4) {
    return "Buen ritmo. Mantente constante.";
  }
  return "Empieza por la siguiente tarea. Paso a paso.";
}

function buildStateSnapshot() {
  return {
    tasks: state.tasks,
    completedHours: state.completedHours,
    objectives: state.objectives,
    profile: state.profile,
  };
}

function setSyncStatus(status, message) {
  if (!refs.syncStatus) {
    return;
  }

  refs.syncStatus.dataset.syncStatus = status;
  refs.syncStatus.textContent = message;
}

function formatSyncClock(isoDate) {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scheduleRetrySave() {
  if (saveQueue.retryTimer) {
    return;
  }

  saveQueue.retryTimer = setTimeout(() => {
    saveQueue.retryTimer = null;
    saveAppState({ immediate: true });
  }, RETRY_DELAY_MS);
}

async function flushSaveQueue() {
  if (saveQueue.inFlight || !saveQueue.pending) {
    return;
  }

  saveQueue.pending = false;
  saveQueue.inFlight = true;
  setSyncStatus("syncing", "Sincronizando...");

  const saveResult = await saveState(buildStateSnapshot());

  if (saveResult?.remote?.error) {
    setSyncStatus("error", "Error de sync. Reintentando...");
    scheduleRetrySave();
  } else {
    if (saveQueue.retryTimer) {
      clearTimeout(saveQueue.retryTimer);
      saveQueue.retryTimer = null;
    }

    const timeLabel = formatSyncClock(saveResult?.savedAt);
    if (saveResult?.remote?.enabled) {
      setSyncStatus("ok", timeLabel ? `Sincronizado ${timeLabel}` : "Sincronizado");
    } else {
      setSyncStatus("local", timeLabel ? `Guardado local ${timeLabel}` : "Guardado local");
    }
  }

  saveQueue.inFlight = false;
  if (saveQueue.pending) {
    void flushSaveQueue();
  }
}

function saveAppState(options = {}) {
  saveQueue.pending = true;

  if (saveQueue.saveTimer) {
    clearTimeout(saveQueue.saveTimer);
    saveQueue.saveTimer = null;
  }

  const delay = options.immediate ? 0 : SAVE_DEBOUNCE_MS;
  saveQueue.saveTimer = setTimeout(() => {
    saveQueue.saveTimer = null;
    void flushSaveQueue();
  }, delay);
}

function validateImportedState(value) {
  const payload = value && typeof value === "object" && value.payload ? value.payload : value;

  if (!payload || typeof payload !== "object") {
    throw new Error("El archivo no contiene un estado valido.");
  }

  if (!Array.isArray(payload.tasks) || !Array.isArray(payload.objectives) || !Array.isArray(payload.completedHours)) {
    throw new Error("Formato invalido: faltan tareas, objetivos o bloques completados.");
  }

  if (!payload.profile || typeof payload.profile !== "object") {
    throw new Error("Formato invalido: falta el perfil.");
  }

  return {
    tasks: payload.tasks,
    objectives: payload.objectives,
    completedHours: payload.completedHours,
    profile: {
      name: String(payload.profile.name ?? ""),
      avatarDataUrl: String(payload.profile.avatarDataUrl ?? ""),
    },
  };
}

function exportAppState() {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    payload: buildStateSnapshot(),
  };

  const fileBlob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(fileBlob);
  const anchor = document.createElement("a");
  const datePart = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `habitly-backup-${datePart}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setSyncStatus("ok", "Backup exportado.");
}

async function importAppState(file) {
  if (!file) {
    return;
  }

  if (file.size > IMPORT_MAX_BYTES) {
    setSyncStatus("error", "Archivo demasiado grande. Maximo 2MB.");
    return;
  }

  const textContent = await file.text();
  let parsed;

  try {
    parsed = JSON.parse(textContent);
  } catch {
    setSyncStatus("error", "El archivo no es un JSON valido.");
    return;
  }

  let importedState;
  try {
    importedState = validateImportedState(parsed);
  } catch (error) {
    setSyncStatus("error", error.message);
    return;
  }

  const accepted = window.confirm("Se reemplazaran tus datos actuales por el backup. Esta accion no se puede deshacer.");
  if (!accepted) {
    return;
  }

  setSyncStatus("syncing", "Importando backup...");
  const saveResult = await saveState(importedState);
  const persistedState = await loadState();

  state.tasks = persistedState.tasks;
  state.completedHours = persistedState.completedHours;
  state.objectives = persistedState.objectives;
  state.profile = persistedState.profile;
  sanitizeObjectives();
  renderAll();

  if (saveResult?.remote?.error) {
    setSyncStatus("error", "Importado en local. Fallo al sincronizar remoto.");
    scheduleRetrySave();
    return;
  }

  setSyncStatus("ok", "Backup importado y sincronizado.");
}

function fillDayAndHourFields() {
  const hourOptions = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => {
    const hour = START_HOUR + index;
    return `<option value="${hour}">${hour}</option>`;
  }).join("");

  const endHourOptions = `<option value="">Indefinido</option>` + Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => {
    const hour = START_HOUR + index;
    return `<option value="${hour}">${hour}</option>`;
  }).join("");

  refs.taskHour.innerHTML = hourOptions;
  refs.taskEndHour.innerHTML = endHourOptions;
}

function fillObjectiveField() {
  const options = [
    "<option value=''>Sin objetivo</option>",
    ...state.objectives.map(
      (objective) => `<option value="${objective.id}">${objective.name}</option>`,
    ),
  ];

  refs.taskObjective.innerHTML = options.join("");
}

function setModalOpen(open) {
  refs.taskModal.classList.toggle("open", open);
  refs.taskModal.setAttribute("aria-hidden", String(!open));

  if (open) {
    refs.taskTitle.focus();
  }
}

function setConfirmGoalModalOpen(open) {
  refs.confirmGoalModal.classList.toggle("open", open);
  refs.confirmGoalModal.setAttribute("aria-hidden", String(!open));
}

function setConfirmTaskModalOpen(open) {
  refs.confirmTaskModal.classList.toggle("open", open);
  refs.confirmTaskModal.setAttribute("aria-hidden", String(!open));
}

function setGoalCreateModalOpen(open) {
  refs.goalCreateModal.classList.toggle("open", open);
  refs.goalCreateModal.setAttribute("aria-hidden", String(!open));

  if (open) {
    refs.goalName.focus();
  }
}

function setActiveTab(tabName) {
  state.activeTab = TAB_NAMES.includes(tabName) ? tabName : "today";

  refs.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTrigger === state.activeTab;
    button.classList.toggle("active", isActive);
  });

  refs.views.forEach((view) => {
    const isActive = view.dataset.view === state.activeTab;
    view.classList.toggle("active", isActive);
  });
}

function prefillTaskForm(task = null) {
  fillObjectiveField();
  const today = getDateString();

  if (task) {
    refs.taskFormTitle.textContent = "Editar tarea";
    refs.taskId.value = task.id;
    refs.taskTitle.value = task.title;
    refs.taskDescription.value = task.description;
    refs.taskDate.value = task.date || today;
    refs.taskHour.value = String(task.startHour || START_HOUR);
    refs.taskMinute.value = String(task.startMinute || 0);
    refs.taskEndHour.value = task.endHour ? String(task.endHour) : "";
    if (task.endHour) {
      refs.taskEndMinute.value = String(task.endMinute || 0);
      refs.taskEndMinute.style.display = "block";
      document.getElementById("end-time-sep").style.display = "block";
    } else {
      refs.taskEndMinute.style.display = "none";
      document.getElementById("end-time-sep").style.display = "none";
    }
    refs.taskPriority.value = task.priority;
    refs.taskType.value = task.type;
    refs.taskObjective.value = task.objectiveId || "";
  } else {
    refs.taskFormTitle.textContent = "Nueva tarea";
    refs.taskForm.reset();
    refs.taskId.value = "";
    refs.taskDate.value = today;
    refs.taskHour.value = String(START_HOUR);
    refs.taskMinute.value = "0";
    refs.taskEndHour.value = "";
    refs.taskEndMinute.style.display = "none";
    document.getElementById("end-time-sep").style.display = "none";
    refs.taskPriority.value = "medium";
    refs.taskType.value = "";
    refs.taskObjective.value = "";
  }
}

function prefillGoalForm(objective = null) {
  if (objective) {
    refs.taskFormTitle.textContent = "Editar objetivo";  // Reutilizamos este para el modal
    refs.goalName.value = objective.name;
    refs.goalDescription.value = objective.description || "";
    // Find and check the color radio button
    const colorInput = refs.goalColorInputs.find((input) => input.value === objective.color);
    if (colorInput) {
      colorInput.checked = true;
    }
    state.pendingGoalEditId = objective.id;
  } else {
    refs.taskFormTitle.textContent = "Crear objetivo";
    refs.goalForm.reset();
    if (refs.goalColorInputs[0]) {
      refs.goalColorInputs[0].checked = true;
    }
    state.pendingGoalEditId = "";
  }
}

function renderTypeFilter() {
  const uniqueTypes = [...new Set(state.tasks.map((task) => normalizeType(task.type)).filter(Boolean))];
  const options = ["all", ...uniqueTypes].map((type) => {
    const selected = type === state.filters.type ? "selected" : "";
    const label = type === "all" ? "Todos" : type;
    return `<option value="${type}" ${selected}>${label}</option>`;
  });

  refs.typeFilter.innerHTML = options.join("");
}

function renderAppDate() {
  refs.appDate.textContent = formatDateLabel(new Date());
}

function renderTodaySummary() {
  const today = getDateString();
  const todayTasks = state.tasks
    .filter((task) => task.date === today)
    .sort((a, b) => a.startHour - b.startHour);

  const pendingToday = todayTasks.filter((task) => !isTaskCompleted(task)).length;
  const currentDay = getCurrentDayKey();

  refs.todayTitle.textContent = `Hoy - ${getDayLabel(currentDay)}`;
  refs.todayTaskCount.textContent = `${todayTasks.length} tareas`;
  refs.completedHours.textContent = `${state.completedHours.length}h`;
  refs.todayPending.textContent = String(pendingToday);

  if (!todayTasks.length) {
    refs.todayTaskList.innerHTML = "<p class='empty-message'>No tienes tareas para hoy.</p>";
    return;
  }

  refs.todayTaskList.innerHTML = todayTasks
    .map((task) => {
      const done = isTaskCompleted(task);
      const objectiveColor = getObjectiveColor(task);
      const objectiveDot = objectiveColor
        ? `<span class="objective-dot" style="background:${objectiveColor}"></span>`
        : "";
      const timeRange = task.endHour 
        ? `${formatTime(task.startHour, task.startMinute)} - ${formatTime(task.endHour, task.endMinute)}`
        : `${formatTime(task.startHour, task.startMinute)} - Indefinido`;
      return `
        <article class="task-item priority-${task.priority} ${done ? "done" : ""}">
          <div class="task-top">
            <h3>${task.title}</h3>
            <span>${timeRange}</span>
          </div>
          <p class="task-description">${task.description || "Sin descripcion"}</p>
          <div class="task-footer">
            <p class="task-badge">${objectiveDot}${task.type} - ${getObjectiveName(task)}</p>
            <div class="task-actions">
              <button class="mini-btn" type="button" data-action="toggle-task" data-task-id="${task.id}" title="${done ? "Desmarcar" : "Completar"}">
                ${done ? "✓" : "○"}
              </button>
              <button class="mini-btn" type="button" data-action="edit-task" data-task-id="${task.id}" title="Editar">✏️</button>
              <button class="mini-btn" type="button" data-action="delete-task" data-task-id="${task.id}" title="Borrar">🗑️</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderWeekOverview() {
  const today = new Date();
  const todayText = getDateString(today);
  const todayDay = today.getDay(); // 0-6 (Sun-Sat)
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() - (todayDay === 0 ? 6 : todayDay - 1)); // Go back to Monday

  const dayColumns = DAYS.map((day, index) => {
    const dayDate = new Date(mondayDate);
    dayDate.setDate(mondayDate.getDate() + index);
    const dayDateStr = getDateString(dayDate);

    const tasks = state.tasks
      .filter((task) => {
        if (task.date !== dayDateStr) {
          return false;
        }
        if (state.filters.type === "all") {
          return true;
        }
        return normalizeType(task.type) === state.filters.type;
      })
      .sort((a, b) => a.startHour - b.startHour);

    if (!tasks.length) {
      return `
        <section class="day-column">
          <header class="day-header">${day.label}</header>
          <div class="day-body compact">
            <p class="empty-message">No hay tareas asignadas para el ${day.label}.</p>
          </div>
        </section>
      `;
    }

    const tasksMarkup = tasks
      .map((task) => {
        const done = isTaskCompleted(task);
        const objectiveColor = getObjectiveColor(task);
        const objectiveDot = objectiveColor
          ? `<span class="objective-dot" style="background:${objectiveColor}"></span>`
          : "";
        const timeRange = task.endHour 
          ? `${formatTime(task.startHour, task.startMinute)} - ${formatTime(task.endHour, task.endMinute)}`
          : `${formatTime(task.startHour, task.startMinute)} - ∞`;
        return `
          <article class="slot-task priority-${task.priority} ${done ? "done" : ""}">
            <div>
              <p class="slot-task-title">${task.title}</p>
              <p class="slot-task-meta">${timeRange} - ${task.type}</p>
              <p class="slot-task-meta">${objectiveDot}${getObjectiveName(task)}</p>
            </div>
            <div class="task-actions">
              <button class="mini-btn" data-action="toggle-task" data-task-id="${task.id}" type="button" title="${done ? "Desmarcar" : "Completar"}">
                ${done ? "✓" : "○"}
              </button>
              <button class="mini-btn" data-action="edit-task" data-task-id="${task.id}" type="button" title="Editar">✏️</button>
              <button class="mini-btn" data-action="delete-task" data-task-id="${task.id}" type="button" title="Borrar">🗑️</button>
            </div>
          </article>
        `;
      })
      .join("");

    return `
      <section class="day-column">
        <header class="day-header">${day.label}</header>
        <div class="day-body">${tasksMarkup}</div>
      </section>
    `;
  }).join("");

  refs.weeklyOverview.innerHTML = dayColumns;
}

function renderMonthView() {
  const baseDate = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth(), 1);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  refs.monthTitle.textContent = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(baseDate);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  const mondayBasedStart = (firstDay.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < mondayBasedStart; i += 1) {
    cells.push("<div class='month-cell ghost'></div>");
  }

  const today = new Date();
  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
    const cellDate = new Date(year, month, dayNumber);
    const cellDateStr = getDateString(cellDate);
    const tasksForDay = state.tasks.filter((task) => task.date === cellDateStr);
    const completedForDay = state.completedHours.filter((entry) => entry.date === cellDateStr).length;
    const isToday = dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    cells.push(`
      <article class="month-cell ${isToday ? "today" : ""}">
        <p class="month-number">${dayNumber}</p>
        <p class="month-meta">${tasksForDay.length} tareas</p>
        <p class="month-meta">${completedForDay}h hechas</p>
      </article>
    `);
  }

  refs.monthGrid.innerHTML = cells.join("");
}

function getObjectiveCompletedHours(objectiveId) {
  const objectiveTasks = state.tasks.filter((task) => task.objectiveId === objectiveId);
  const validSlots = new Set();

  objectiveTasks.forEach((task) => {
    getTaskHourBlocks(task).forEach((hour) => validSlots.add(`${task.date}_${hour}`));
  });

  return state.completedHours.filter((entry) => validSlots.has(`${entry.date}_${entry.hour}`)).length;
}

function calculateTaskDuration(task) {
  // If no end time, return 1 hour as default unit
  if (task.endHour === null || task.endHour === undefined) {
    return 1;
  }
  const startTime = task.startHour + task.startMinute / 60;
  const endTime = task.endHour + task.endMinute / 60;
  return Math.max(0, endTime - startTime);
}

function getObjectiveTotalHours(objectiveId) {
  const objectiveTasks = state.tasks.filter((task) => task.objectiveId === objectiveId);
  return objectiveTasks.reduce((sum, task) => sum + calculateTaskDuration(task), 0);
}

function renderGoals() {
  if (!state.objectives.length) {
    refs.goalsList.innerHTML = "<p class='empty-message'>Aun no hay objetivos. Crea uno arriba.</p>";
    return;
  }

  const cards = state.objectives.map((objective) => {
    const linkedTasks = state.tasks
      .filter((task) => task.objectiveId === objective.id)
      .sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) {
          return dateDiff;
        }
        return a.startHour - b.startHour;
      });

    const completedHours = getObjectiveCompletedHours(objective.id);
    const totalHours = getObjectiveTotalHours(objective.id);
    const progress = totalHours > 0 ? Math.min((completedHours / totalHours) * 100, 100) : 0;
    const nextPending = linkedTasks.find((task) => !isTaskCompleted(task));
    const message = getMotivationMessage(progress / 100);
    const descriptionHtml = objective.description 
      ? `<p class="goal-description">${objective.description}</p>`
      : "";

    return `
      <article class="goal-card" style="--goal-accent:${objective.color}">
        <header class="goal-head">
          <h3>${objective.name}</h3>
          <div class="task-actions">
            <button class="mini-btn" data-action="edit-goal" data-goal-id="${objective.id}" type="button" title="Editar">✏️</button>
            <button class="mini-btn" data-action="delete-goal" data-goal-id="${objective.id}" type="button" title="Borrar">🗑️</button>
          </div>
        </header>

        ${descriptionHtml}
        <p class="goal-meta">${completedHours.toFixed(1)}h / ${totalHours.toFixed(1)}h (${linkedTasks.length} tareas)</p>
        <div class="progress-track" role="progressbar" aria-valuenow="${progress.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill goal-progress" style="width:${progress}%"></div>
        </div>

        <p class="goal-meta"><strong>Proxima:</strong> ${
          nextPending
            ? `${nextPending.title} (${nextPending.date} ${formatTime(nextPending.startHour, nextPending.startMinute)})`
            : "Todo completado"
        }</p>
        <p class="goal-message">${message}</p>
      </article>
    `;
  });

  refs.goalsList.innerHTML = cards.join("");
}

function renderProfile() {
  const name = state.profile?.name?.trim() || "Sin nombre";
  const avatarDataUrl = state.profile?.avatarDataUrl || "";
  const initial = name[0]?.toUpperCase() || "?";

  refs.profileName.value = state.profile?.name || "";
  refs.profileAvatarFallback.textContent = initial;

  if (avatarDataUrl) {
    refs.profileAvatar.src = avatarDataUrl;
    refs.profileAvatar.hidden = false;
    refs.profileAvatarFallback.hidden = true;
  } else {
    refs.profileAvatar.hidden = true;
    refs.profileAvatarFallback.hidden = false;
  }

  refs.profileTotalTasks.textContent = String(state.tasks.length);
  refs.profileTotalCompleted.textContent = `${state.completedHours.length}h`;
}

function renderAll() {
  renderAppDate();
  renderTypeFilter();
  renderTodaySummary();
  renderWeekOverview();
  renderMonthView();
  renderGoals();
  renderProfile();
  fillObjectiveField();
  setActiveTab(state.activeTab);
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveAppState();
  renderAll();
}

function deleteGoal(goalId) {
  state.objectives = state.objectives.filter((goal) => goal.id !== goalId);
  state.tasks = state.tasks.map((task) => (task.objectiveId === goalId ? { ...task, objectiveId: "" } : task));
  saveAppState();
  renderAll();
}

function promptDeleteGoal(goalId) {
  state.pendingGoalDeletionId = goalId;
  setConfirmGoalModalOpen(true);
}

function confirmDeleteGoal() {
  if (!state.pendingGoalDeletionId) {
    return;
  }

  deleteGoal(state.pendingGoalDeletionId);
  state.pendingGoalDeletionId = "";
  setConfirmGoalModalOpen(false);
}

function promptDeleteTask(taskId) {
  state.pendingTaskDeletionId = taskId;
  setConfirmTaskModalOpen(true);
}

function confirmDeleteTask() {
  if (!state.pendingTaskDeletionId) {
    return;
  }

  deleteTask(state.pendingTaskDeletionId);
  state.pendingTaskDeletionId = "";
  setConfirmTaskModalOpen(false);
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const id = refs.taskId.value || createUid();
  const title = refs.taskTitle.value.trim();
  const description = refs.taskDescription.value.trim();
  const date = refs.taskDate.value;
  const startHour = Number(refs.taskHour.value);
  const startMinute = Number(refs.taskMinute.value);
  const endHourVal = refs.taskEndHour.value;
  const endHour = endHourVal ? Number(endHourVal) : null;
  const endMinute = endHourVal ? Number(refs.taskEndMinute.value) : null;
  const priority = refs.taskPriority.value;
  const type = refs.taskType.value.trim() || "study";
  const objectiveId = refs.taskObjective.value || "";

  if (!title || !date) {
    if (!title) refs.taskTitle.focus();
    if (!date) refs.taskDate.focus();
    return;
  }

  const taskPayload = { 
    id, title, description, date, 
    startHour, startMinute, endHour, endMinute,
    priority, type, objectiveId 
  };
  const index = state.tasks.findIndex((task) => task.id === id);

  if (index >= 0) {
    state.tasks[index] = taskPayload;
  } else {
    state.tasks.push(taskPayload);
  }

  saveAppState();
  setModalOpen(false);
  renderAll();
}

function handleGoalSubmit(event) {
  event.preventDefault();

  const name = refs.goalName.value.trim();
  const description = refs.goalDescription.value.trim();
  const selectedColorInput = refs.goalColorInputs.find((input) => input.checked);
  const color = selectedColorInput?.value ?? GOAL_COLORS[0];
  
  if (!name) {
    refs.goalName.focus();
    return;
  }

  if (state.pendingGoalEditId) {
    // Update existing objective
    const objective = state.objectives.find((obj) => obj.id === state.pendingGoalEditId);
    if (objective) {
      objective.name = name;
      objective.description = description;
      objective.color = color;
    }
  } else {
    // Create new objective
    state.objectives.push({
      id: createUid(),
      name,
      description,
      color,
    });
  }

  refs.goalForm.reset();
  if (refs.goalColorInputs[0]) {
    refs.goalColorInputs[0].checked = true;
  }
  state.pendingGoalEditId = "";
  setGoalCreateModalOpen(false);
  saveAppState();
  renderAll();
}

function toggleTask(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return;
  }

  const currentlyCompleted = isTaskCompleted(task);
  setTaskCompletion(task, !currentlyCompleted);
  saveAppState();
  renderAll();
}

function shiftMonth(direction) {
  const next = new Date(state.monthCursor);
  next.setMonth(next.getMonth() + direction);
  state.monthCursor = next;
  renderMonthView();
}

function readAvatarFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    state.profile.avatarDataUrl = typeof reader.result === "string" ? reader.result : "";
    saveAppState();
    renderProfile();
  };
  reader.readAsDataURL(file);
}

function handleClick(event) {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) {
    return;
  }

  const action = trigger.dataset.action;

  if (action === "prev-month") {
    shiftMonth(-1);
    return;
  }

  if (action === "next-month") {
    shiftMonth(1);
    return;
  }

  if (action === "toggle-task") {
    toggleTask(trigger.dataset.taskId);
    return;
  }

  if (action === "new-task") {
    prefillTaskForm(null, trigger.dataset.day, Number(trigger.dataset.hour));
    setModalOpen(true);
    return;
  }

  if (action === "edit-task") {
    const task = state.tasks.find((item) => item.id === trigger.dataset.taskId);
    if (!task) {
      return;
    }

    prefillTaskForm(task);
    setModalOpen(true);
    return;
  }

  if (action === "delete-task") {
    promptDeleteTask(trigger.dataset.taskId);
    return;
  }

  if (action === "edit-goal") {
    const objective = state.objectives.find((obj) => obj.id === trigger.dataset.goalId);
    if (!objective) {
      return;
    }
    prefillGoalForm(objective);
    setGoalCreateModalOpen(true);
    return;
  }

  if (action === "delete-goal") {
    promptDeleteGoal(trigger.dataset.goalId);
  }
}

function bindEvents() {
  document.addEventListener("click", handleClick);

  refs.openGoalForm.addEventListener("click", () => {
    prefillGoalForm(null);
    setGoalCreateModalOpen(true);
  });

  refs.fabAddTask.addEventListener("click", () => {
    prefillTaskForm();
    setModalOpen(true);
  });

  refs.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tabTrigger);
    });
  });

  refs.closeTaskForm.addEventListener("click", () => setModalOpen(false));
  refs.cancelTaskForm.addEventListener("click", () => setModalOpen(false));

  refs.taskEndHour.addEventListener("change", () => {
    const isIndefinido = refs.taskEndHour.value === "";
    refs.taskEndMinute.style.display = isIndefinido ? "none" : "block";
    document.getElementById("end-time-sep").style.display = isIndefinido ? "none" : "block";
  });

  refs.taskModal.addEventListener("click", (event) => {
    if (event.target === refs.taskModal) {
      setModalOpen(false);
    }
  });

  refs.closeGoalForm.addEventListener("click", () => setGoalCreateModalOpen(false));
  refs.cancelGoalForm.addEventListener("click", () => setGoalCreateModalOpen(false));

  refs.goalCreateModal.addEventListener("click", (event) => {
    if (event.target === refs.goalCreateModal) {
      setGoalCreateModalOpen(false);
    }
  });

  refs.closeConfirmGoal.addEventListener("click", () => {
    state.pendingGoalDeletionId = "";
    setConfirmGoalModalOpen(false);
  });

  refs.cancelConfirmGoal.addEventListener("click", () => {
    state.pendingGoalDeletionId = "";
    setConfirmGoalModalOpen(false);
  });

  refs.acceptConfirmGoal.addEventListener("click", () => {
    confirmDeleteGoal();
  });

  refs.closeConfirmTask.addEventListener("click", () => {
    state.pendingTaskDeletionId = "";
    setConfirmTaskModalOpen(false);
  });

  refs.confirmGoalModal.addEventListener("click", (event) => {
    if (event.target === refs.confirmGoalModal) {
      state.pendingGoalDeletionId = "";
      setConfirmGoalModalOpen(false);
    }
  });

  refs.cancelConfirmTask.addEventListener("click", () => {
    state.pendingTaskDeletionId = "";
    setConfirmTaskModalOpen(false);
  });

  refs.acceptConfirmTask.addEventListener("click", () => {
    confirmDeleteTask();
  });

  refs.confirmTaskModal.addEventListener("click", (event) => {
    if (event.target === refs.confirmTaskModal) {
      state.pendingTaskDeletionId = "";
      setConfirmTaskModalOpen(false);
    }
  });

  refs.typeFilter.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    renderWeekOverview();
  });

  refs.choosePhotoBtn.addEventListener("click", () => {
    refs.profilePhotoInput.click();
  });

  refs.profilePhotoInput.addEventListener("change", (event) => {
    const selectedFile = event.target.files?.[0];
    readAvatarFile(selectedFile);
  });

  refs.exportStateBtn.addEventListener("click", () => {
    exportAppState();
  });

  refs.importStateBtn.addEventListener("click", () => {
    refs.importStateInput.click();
  });

  refs.importStateInput.addEventListener("change", async (event) => {
    const selectedFile = event.target.files?.[0];
    await importAppState(selectedFile);
    refs.importStateInput.value = "";
  });

  refs.saveProfileBtn.addEventListener("click", () => {
    state.profile.name = refs.profileName.value.trim();
    saveAppState();
    renderProfile();
  });

  refs.logoutBtn.addEventListener("click", async () => {
    try {
      await signOutUser();
      window.location.href = "/login";
    } catch (error) {
      console.error("Habitly: no se pudo cerrar sesion.", error);
    }
  });

  refs.taskForm.addEventListener("submit", handleTaskSubmit);
  refs.goalForm.addEventListener("submit", handleGoalSubmit);
}

function migrateTasks() {
  const today = getDateString();
  state.tasks = state.tasks.map((task) => {
    // Already migrated (has date field)
    if (task.date) {
      return task;
    }
    // Old format: convert day + hour to date
    // Simple approach: assume old tasks are for today
    return {
      ...task,
      date: today,
      startHour: Math.floor(task.hour || START_HOUR),
      startMinute: Math.round(((task.hour || START_HOUR) - Math.floor(task.hour || START_HOUR)) * 60),
      endHour: task.duration ? Math.floor(task.hour + task.duration) : null,
      endMinute: 0,
    };
  });
}

async function startApp() {
  setSyncStatus("idle", "Comprobando sesion...");

  let currentUser = null;

  try {
    currentUser = await getCurrentUser();
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
  } catch {
    window.location.href = "/login";
    return;
  }

  const persistedState = await loadState();
  state.tasks = persistedState.tasks;
  state.completedHours = persistedState.completedHours;
  state.objectives = persistedState.objectives;
  state.profile = persistedState.profile;

  const usernameFromAuth = String(currentUser.user_metadata?.username ?? "").trim();
  if (!state.profile.name && usernameFromAuth) {
    state.profile.name = usernameFromAuth;
  }

  migrateTasks();
  sanitizeObjectives();
  fillDayAndHourFields();
  fillObjectiveField();
  renderAll();
  bindEvents();
  saveAppState({ immediate: true });
}

void startApp();
