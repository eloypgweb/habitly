import { getDefaultState, loadState, saveState } from "../utils/storage.js";

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

const state = {
  ...getDefaultState(),
  ...loadState(),
  activeTab: "today",
  monthCursor: new Date(),
  pendingGoalDeletionId: "",
  pendingTaskDeletionId: "",
  filters: {
    type: "all",
  },
};

const refs = {
  appDate: document.getElementById("app-date"),
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
  goalHours: document.getElementById("goal-hours"),
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
  taskDay: document.getElementById("task-day"),
  taskHour: document.getElementById("task-hour"),
  taskMinute: document.getElementById("task-minute"),
  taskDuration: document.getElementById("task-duration"),
  taskPriority: document.getElementById("task-priority"),
  taskType: document.getElementById("task-type"),
  taskObjective: document.getElementById("task-objective"),
  profileName: document.getElementById("profile-name"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileAvatarFallback: document.getElementById("profile-avatar-fallback"),
  profilePhotoInput: document.getElementById("profile-photo-input"),
  choosePhotoBtn: document.getElementById("choose-photo-btn"),
  saveProfileBtn: document.getElementById("save-profile-btn"),
  profileTotalTasks: document.getElementById("profile-total-tasks"),
  profileTotalCompleted: document.getElementById("profile-total-completed"),
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
  const startBlock = Math.floor(task.hour);
  for (let step = 0; step < task.duration; step += 1) {
    const blockHour = startBlock + step;
    if (blockHour > END_HOUR) {
      break;
    }
    blocks.push(blockHour);
  }
  return blocks;
}

function isHourCompleted(dayKey, hour) {
  return state.completedHours.some((entry) => entry.day === dayKey && entry.hour === hour);
}

function isTaskCompleted(task) {
  const blocks = getTaskHourBlocks(task);
  if (!blocks.length) {
    return false;
  }
  return blocks.every((hour) => isHourCompleted(task.day, hour));
}

function setTaskCompletion(task, shouldComplete) {
  const blocks = getTaskHourBlocks(task);

  blocks.forEach((hour) => {
    const index = state.completedHours.findIndex((entry) => entry.day === task.day && entry.hour === hour);
    if (shouldComplete && index < 0) {
      state.completedHours.push({ day: task.day, hour });
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

function saveAppState() {
  saveState({
    tasks: state.tasks,
    completedHours: state.completedHours,
    objectives: state.objectives,
    profile: state.profile,
  });
}

function fillDayAndHourFields() {
  const dayOptions = DAYS.map((day) => `<option value="${day.key}">${day.label}</option>`).join("");

  const hourOptions = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => {
    const hour = START_HOUR + index;
    return `<option value="${hour}">${String(hour).padStart(2, "0")}:00</option>`;
  }).join("");

  refs.taskDay.innerHTML = dayOptions;
  refs.taskHour.innerHTML = hourOptions;
}

function fillObjectiveField() {
  const options = [
    "<option value=''>Sin objetivo</option>",
    ...state.objectives.map(
      (objective) => `<option value="${objective.id}">${objective.name} (${objective.targetHours}h)</option>`,
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

function prefillTaskForm(task = null, day = "monday", hour = START_HOUR) {
  fillObjectiveField();

  if (task) {
    const baseHour = Math.floor(task.hour);
    const minute = Math.round((task.hour - baseHour) * 60);
    
    refs.taskFormTitle.textContent = "Editar tarea";
    refs.taskId.value = task.id;
    refs.taskTitle.value = task.title;
    refs.taskDescription.value = task.description;
    refs.taskDay.value = task.day;
    refs.taskHour.value = String(baseHour);
    refs.taskMinute.value = String(minute);
    refs.taskDuration.value = String(task.duration);
    refs.taskPriority.value = task.priority;
    refs.taskType.value = task.type;
    refs.taskObjective.value = task.objectiveId || "";
  } else {
    refs.taskFormTitle.textContent = "Nueva tarea";
    refs.taskForm.reset();
    refs.taskId.value = "";
    refs.taskDay.value = day;
    refs.taskHour.value = String(hour);
    refs.taskMinute.value = "0";
    refs.taskDuration.value = "1";
    refs.taskPriority.value = "medium";
    refs.taskType.value = "";
    refs.taskObjective.value = "";
  }
}

function getFilteredTasksForDay(dayKey) {
  return state.tasks
    .filter((task) => {
      if (task.day !== dayKey) {
        return false;
      }
      if (state.filters.type === "all") {
        return true;
      }
      return normalizeType(task.type) === state.filters.type;
    })
    .sort((a, b) => a.hour - b.hour);
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
  const currentDay = getCurrentDayKey();
  const todayTasks = state.tasks
    .filter((task) => task.day === currentDay)
    .sort((a, b) => a.hour - b.hour);

  const pendingToday = todayTasks.filter((task) => !isTaskCompleted(task)).length;

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
      return `
        <article class="task-item priority-${task.priority} ${done ? "done" : ""}">
          <div class="task-top">
            <h3>${task.title}</h3>
            <span>${formatHour(task.hour)} - ${task.duration}h</span>
          </div>
          <p class="task-description">${task.description || "Sin descripcion"}</p>
          <div class="task-footer">
            <p class="task-badge">${objectiveDot}${task.type} - ${getObjectiveName(task)}</p>
            <div class="task-actions">
              <button class="mini-btn" type="button" data-action="toggle-task" data-task-id="${task.id}">
                ${done ? "Desmarcar" : "Completar"}
              </button>
              <button class="mini-btn" type="button" data-action="edit-task" data-task-id="${task.id}">Editar</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderWeekOverview() {
  const dayColumns = DAYS.map((day) => {
    const tasks = getFilteredTasksForDay(day.key);

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
        return `
          <article class="slot-task priority-${task.priority} ${done ? "done" : ""}">
            <div>
              <p class="slot-task-title">${task.title}</p>
              <p class="slot-task-meta">${formatHour(task.hour)} - ${task.duration}h - ${task.type}</p>
              <p class="slot-task-meta">${objectiveDot}${getObjectiveName(task)}</p>
            </div>
            <div class="task-actions">
              <button class="mini-btn" data-action="toggle-task" data-task-id="${task.id}" type="button">
                ${done ? "Ok" : "Pend"}
              </button>
              <button class="mini-btn" data-action="edit-task" data-task-id="${task.id}" type="button">Editar</button>
              <button class="mini-btn" data-action="delete-task" data-task-id="${task.id}" type="button">Borrar</button>
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
    const dayKey = getDayFromDate(cellDate);
    const tasksForDay = state.tasks.filter((task) => task.day === dayKey);
    const completedForDay = state.completedHours.filter((entry) => entry.day === dayKey).length;
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
    getTaskHourBlocks(task).forEach((hour) => validSlots.add(slotKey(task.day, hour)));
  });

  return state.completedHours.filter((entry) => validSlots.has(slotKey(entry.day, entry.hour))).length;
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
        const dayDiff = daySortValue(a.day) - daySortValue(b.day);
        if (dayDiff !== 0) {
          return dayDiff;
        }
        return a.hour - b.hour;
      });

    const completedHours = getObjectiveCompletedHours(objective.id);
    const progress = Math.min((completedHours / objective.targetHours) * 100, 100);
    const nextPending = linkedTasks.find((task) => !isTaskCompleted(task));
    const message = getMotivationMessage(progress / 100);

    return `
      <article class="goal-card" style="--goal-accent:${objective.color}">
        <header class="goal-head">
          <h3>${objective.name}</h3>
          <button class="mini-btn" data-action="delete-goal" data-goal-id="${objective.id}" type="button">Borrar</button>
        </header>

        <p class="goal-meta">${completedHours.toFixed(1)}h / ${objective.targetHours.toFixed(1)}h</p>
        <div class="progress-track" role="progressbar" aria-valuenow="${progress.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill goal-progress" style="width:${progress}%"></div>
        </div>

        <p class="goal-meta"><strong>Proxima:</strong> ${
          nextPending
            ? `${nextPending.title} (${getDayLabel(nextPending.day)} ${formatHour(nextPending.hour)})`
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
  const day = refs.taskDay.value;
  const baseHour = Number(refs.taskHour.value);
  const minute = Number(refs.taskMinute.value);
  const hour = baseHour + minute / 60;
  const duration = Math.max(1, Number(refs.taskDuration.value));
  const priority = refs.taskPriority.value;
  const type = refs.taskType.value.trim() || "study";
  const objectiveId = refs.taskObjective.value || "";

  if (!title) {
    refs.taskTitle.focus();
    return;
  }

  const taskPayload = { id, title, description, day, hour, duration, priority, type, objectiveId };
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
  const targetHours = Number(refs.goalHours.value);
  const selectedColorInput = refs.goalColorInputs.find((input) => input.checked);
  const color = selectedColorInput?.value ?? GOAL_COLORS[0];
  if (!name || Number.isNaN(targetHours) || targetHours <= 0) {
    return;
  }

  state.objectives.push({
    id: createUid(),
    name,
    targetHours,
    color,
  });

  refs.goalForm.reset();
  refs.goalHours.value = "157.5";
  if (refs.goalColorInputs[0]) {
    refs.goalColorInputs[0].checked = true;
  }
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

    prefillTaskForm(task, task.day, task.hour);
    setModalOpen(true);
    return;
  }

  if (action === "delete-task") {
    promptDeleteTask(trigger.dataset.taskId);
    return;
  }

  if (action === "delete-goal") {
    promptDeleteGoal(trigger.dataset.goalId);
  }
}

function bindEvents() {
  document.addEventListener("click", handleClick);

  refs.openGoalForm.addEventListener("click", () => {
    refs.goalForm.reset();
    refs.goalHours.value = "157.5";
    if (refs.goalColorInputs[0]) {
      refs.goalColorInputs[0].checked = true;
    }
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

  refs.saveProfileBtn.addEventListener("click", () => {
    state.profile.name = refs.profileName.value.trim();
    saveAppState();
    renderProfile();
  });

  refs.taskForm.addEventListener("submit", handleTaskSubmit);
  refs.goalForm.addEventListener("submit", handleGoalSubmit);
}

function startApp() {
  sanitizeObjectives();
  fillDayAndHourFields();
  fillObjectiveField();
  renderAll();
  bindEvents();
  saveAppState();
}

startApp();
