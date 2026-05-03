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
const TAB_NAMES = ["today", "week", "month", "day-detail", "goals", "profile"];
const GOAL_COLORS = ["#67c8ff", "#5ad89d", "#ff8a65", "#f2c94c", "#bb86fc", "#ff6b9f"];
const SAVE_DEBOUNCE_MS = 700;
const RETRY_DELAY_MS = 4000;
const IMPORT_MAX_BYTES = 1024 * 1024 * 2;
const XP_PER_COMPLETED_TASK = 12;
const XP_PENALTY_PER_OVERDUE_TASK = 4;
const RANKS = [
  { key: "novato", label: "Novato", minXp: 0 },
  { key: "constante", label: "Constante", minXp: 100 },
  { key: "enfocado", label: "Enfocado", minXp: 250 },
  { key: "imparable", label: "Imparable", minXp: 500 },
  { key: "elite", label: "Elite", minXp: 900 },
];
const THEMES = ["ocean", "sunset", "forest", "aurora", "hell", "heaven"];
const THEME_LABELS = {
  ocean: "Ocean",
  sunset: "Sunset",
  forest: "Forest",
  aurora: "Aurora",
  hell: "Hell",
  heaven: "Heaven",
};
const AVATAR_PRESETS = [
  { key: "dawn", label: "Valla celestial", grad1: "#ffd89b", grad2: "#7ec8ff", fg: "#17324f" },
  { key: "mint", label: "Gorro de Finn", grad1: "#9de7c2", grad2: "#72c8ff", fg: "#103247" },
  { key: "ember", label: "Casco nocturno", grad1: "#ffb27d", grad2: "#ff7f6e", fg: "#412018" },
  { key: "violet", label: "Serafín", grad1: "#c9a8ff", grad2: "#7fb1ff", fg: "#1f1e4d" },
  { key: "sun", label: "Halo solar", grad1: "#ffe082", grad2: "#f7c76b", fg: "#3b2a12" },
  { key: "sea", label: "Ola marina", grad1: "#88e5ff", grad2: "#5bc6b9", fg: "#08343a" },
  { key: "rose", label: "Corona rosa", grad1: "#ffb3c7", grad2: "#ff8aa5", fg: "#4d1e2b" },
  { key: "onyx", label: "Caballero umbrío", grad1: "#6d7288", grad2: "#2f3447", fg: "#f2f7ff" },
];
const BATTLE_PASS_REWARDS = [
  {
    key: "mote_chispa",
    minXp: 60,
    title: "Mote: Chispa",
    detail: "Un apodo corto para marcar el arranque del pase.",
    effect: { mote: "Chispa" },
  },
  {
    key: "theme_aurora",
    minXp: 150,
    title: "Tema Aurora",
    detail: "Un cielo nocturno con cian, violeta y destellos fríos.",
    effect: { theme: "aurora" },
  },
  {
    key: "mote_ritmo",
    minXp: 300,
    title: "Mote: Ritmo",
    detail: "Un mote para cuando ya dominas el compás.",
    effect: { mote: "Ritmo" },
  },
  {
    key: "theme_hell",
    minXp: 450,
    title: "Tema Hell",
    detail: "Negros, rojos y naranjas para una estética más agresiva.",
    effect: { theme: "hell" },
  },
  {
    key: "theme_heaven",
    minXp: 650,
    title: "Tema Heaven",
    detail: "Blancos, pastel, azules y dorados para un acabado limpio.",
    effect: { theme: "heaven" },
  },
  {
    key: "mote_nimbo",
    minXp: 750,
    title: "Mote: Nimbo",
    detail: "Un mote ligero, flotante y con aire de altura.",
    effect: { mote: "Nimbo" },
  },
  {
    key: "avatar_skin_neon",
    minXp: 800,
    title: "Avatar Neón",
    detail: "Un marco vibrante para perfiles más activos.",
    effect: { avatarSkin: "neon" },
  },
  {
    key: "mote_legend",
    minXp: 1000,
    title: "Mote: Leyenda",
    detail: "El cierre del pase para perfiles veteranos.",
    effect: { mote: "Leyenda" },
  },
  {
    key: "avatar_skin_halo",
    minXp: 1100,
    title: "Marco Halo",
    detail: "Un perfil más etéreo, con presencia luminosa.",
    effect: { avatarSkin: "halo" },
  },
  {
    key: "mote_alba",
    minXp: 1200,
    title: "Mote: Alba",
    detail: "Suena a mañana limpia y a progreso temprano.",
    effect: { mote: "Alba" },
  },
  {
    key: "avatar_skin_seraph",
    minXp: 1300,
    title: "Marco Serafín",
    detail: "Un marco con acento celestial y más empaque visual.",
    effect: { avatarSkin: "seraph" },
  },
  {
    key: "mote_auriga",
    minXp: 1400,
    title: "Mote: Auriga",
    detail: "Para quien ya va tirando del carro sin mirar atrás.",
    effect: { mote: "Auriga" },
  },
  {
    key: "avatar_skin_radiance",
    minXp: 1500,
    title: "Marco Radiance",
    detail: "Más brillo, más presencia y un acabado más limpio.",
    effect: { avatarSkin: "radiance" },
  },
  {
    key: "mote_zenit",
    minXp: 1600,
    title: "Mote: Zenit",
    detail: "El punto más alto del pase, con nombre de cima.",
    effect: { mote: "Zenit" },
  },
  {
    key: "avatar_skin_coro",
    minXp: 1700,
    title: "Marco Coro",
    detail: "Un cierre coral, más solemne y más grande que el resto.",
    effect: { avatarSkin: "coro" },
  },
];
const MEDALS = [
  {
    key: "first_task",
    title: "Primera victoria",
    detail: "Completa tu primera tarea.",
    unlocked: ({ completedTasks }) => completedTasks >= 1,
  },
  {
    key: "solid_week",
    title: "Semana solida",
    detail: "Alcanza 80% en la semana actual.",
    unlocked: ({ weeklyCompletionRatio, weeklyDueTasks }) => weeklyDueTasks > 0 && weeklyCompletionRatio >= 0.8,
  },
  {
    key: "streak_7",
    title: "7 dias en ritmo",
    detail: "Consigue una racha de 7 dias.",
    unlocked: ({ currentStreak }) => currentStreak >= 7,
  },
  {
    key: "zero_debt",
    title: "Cero deudas",
    detail: "No dejes tareas vencidas.",
    unlocked: ({ overdueTasks }) => overdueTasks === 0,
  },
  {
    key: "marathon",
    title: "Maraton",
    detail: "Completa 100 tareas.",
    unlocked: ({ completedTasks }) => completedTasks >= 100,
  },
];

const state = {
  ...getDefaultState(),
  activeTab: "today",
  weekCursor: new Date(),
  monthCursor: new Date(),
  dayDetailDate: "",
  pendingGoalDeletionId: "",
  pendingGoalEditId: "",
  pendingTaskDeletionId: "",
  filters: {
    type: "all",
    query: "",
  },
};

let currentUserId = "";
let currentUserEmail = "";
let currentUserUsername = "";

const refs = {
  appDate: document.getElementById("app-date"),
  syncStatus: document.getElementById("sync-status"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab-trigger]")),
  views: Array.from(document.querySelectorAll("[data-view]")),
  taskSearchShell: document.querySelector(".task-search-shell"),
  taskSearchInput: document.getElementById("task-search-input"),
  weekTitle: document.getElementById("week-title"),
  weekRange: document.getElementById("week-range"),
  todayTitle: document.getElementById("today-title"),
  todayTaskCount: document.getElementById("today-task-count"),
  todayTaskList: document.getElementById("today-task-list"),
  todayPending: document.getElementById("today-pending"),
  weeklyOverview: document.getElementById("weekly-overview"),
  monthTitle: document.getElementById("month-title"),
  monthGrid: document.getElementById("month-grid"),
  dayDetailPanel: document.querySelector("[data-view='day-detail']"),
  dayDetailTitle: document.getElementById("day-detail-title"),
  dayDetailMeta: document.getElementById("day-detail-meta"),
  dayDetailTaskList: document.getElementById("day-detail-task-list"),
  backToMonthBtn: document.getElementById("back-to-month"),
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
  profileDisplayName: document.getElementById("profile-display-name"),
  profileUsernameText: document.getElementById("profile-username-text"),
  profileEmailText: document.getElementById("profile-email-text"),
  profileMoteText: document.getElementById("profile-mote-text"),
  profileCard: document.querySelector(".profile-card"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileAvatarFallback: document.getElementById("profile-avatar-fallback"),
  profilePhotoInput: document.getElementById("profile-photo-input"),
  choosePhotoBtn: document.getElementById("choose-photo-btn"),
  openAvatarModalBtn: document.getElementById("open-avatar-modal-btn"),
  profileAvatarModal: document.getElementById("profile-avatar-modal"),
  openNameModalBtn: document.getElementById("open-name-modal-btn"),
  profileNameModal: document.getElementById("profile-name-modal"),
  closeNameModal: document.getElementById("close-name-modal"),
  cancelNameModal: document.getElementById("cancel-name-modal"),
  profileNameForm: document.getElementById("profile-name-form"),
  profileNameInput: document.getElementById("profile-name-input"),
  logoutBtn: document.getElementById("logout-btn"),
  profileTotalTasks: document.getElementById("profile-total-tasks"),
  profileTotalCompleted: document.getElementById("profile-total-completed"),
  profileRankCard: document.getElementById("profile-rank-card"),
  profileRankBadge: document.getElementById("profile-rank-badge"),
  profileRankName: document.getElementById("profile-rank-name"),
  profileRankXp: document.getElementById("profile-rank-xp"),
  profileRankProgress: document.getElementById("profile-rank-progress"),
  profileNextRank: document.getElementById("profile-next-rank"),
  profileCurrentStreak: document.getElementById("profile-current-streak"),
  profileBestStreak: document.getElementById("profile-best-streak"),
  profileWeeklyRate: document.getElementById("profile-weekly-rate"),
  profileOverdueCount: document.getElementById("profile-overdue-count"),
  profileBattlePassCount: document.getElementById("profile-battle-pass-count"),
  profileBattlePassXp: document.getElementById("profile-battle-pass-xp"),
  profileBattlePassProgress: document.getElementById("profile-battle-pass-progress"),
  profileBattlePassNext: document.getElementById("profile-battle-pass-next"),
  profileBattlePassModal: document.getElementById("profile-battle-pass-modal"),
  profileBattlePassModalCount: document.getElementById("profile-battle-pass-modal-count"),
  profileBattlePassModalXp: document.getElementById("profile-battle-pass-modal-xp"),
  profileBattlePassModalProgress: document.getElementById("profile-battle-pass-modal-progress"),
  profileBattlePassModalList: document.getElementById("profile-battle-pass-modal-list"),
  profileFramePreviewModal: document.getElementById("profile-frame-preview-modal"),
  profileFramePreviewCard: document.getElementById("profile-frame-preview-card"),
  profileFramePreviewImg: document.getElementById("profile-frame-preview-img"),
  profileFramePreviewFallback: document.getElementById("profile-frame-preview-fallback"),
  profileMotesCount: document.getElementById("profile-motes-count"),
  profileMotesModal: document.getElementById("profile-motes-modal"),
  profileMotesModalList: document.getElementById("profile-motes-modal-list"),
  profileThemesModal: document.getElementById("profile-themes-modal"),
  profileMedalsCount: document.getElementById("profile-medals-count"),
  profileMedalsList: document.getElementById("profile-medals-list"),
  profileEquippedMoteName: document.getElementById("profile-equipped-mote-name"),
  profileEquippedMoteDetail: document.getElementById("profile-equipped-mote-detail"),
  profileEquippedThemeName: document.getElementById("profile-equipped-theme-name"),
  profileEquippedThemeDetail: document.getElementById("profile-equipped-theme-detail"),
  profileAnalyticsWeek: document.getElementById("profile-analytics-week"),
  profileAnalyticsMonth: document.getElementById("profile-analytics-month"),
  profileAnalyticsBestHour: document.getElementById("profile-analytics-best-hour"),
  profileAnalyticsTopType: document.getElementById("profile-analytics-top-type"),
  profileHeatmapGrid: document.getElementById("profile-heatmap-grid"),
  profileFocusSuggestions: document.getElementById("profile-focus-suggestions"),
  themeButtons: Array.from(document.querySelectorAll("[data-action='set-theme']")),
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

function parseDateString(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getWeekStart(date = new Date()) {
  const next = new Date(date);
  const dayIndex = next.getDay();
  const diff = dayIndex === 0 ? -6 : 1 - dayIndex;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatWeekRangeLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(weekEnd);
  return `${startLabel} - ${endLabel}`;
}

function getWeekCursorStart() {
  return getWeekStart(state.weekCursor);
}

function normalizeType(value) {
  return value.trim().toLowerCase();
}

function normalizeSearchQuery(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isSearchEnabledForActiveTab() {
  return state.activeTab === "today" || state.activeTab === "week";
}

function matchesTaskQuery(task) {
  if (!isSearchEnabledForActiveTab()) {
    return true;
  }

  const query = normalizeSearchQuery(state.filters.query);
  if (!query) {
    return true;
  }
  return String(task.title ?? "").toLowerCase().includes(query);
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

function getDayDiff(dateA, dateB) {
  const dateAValue = parseDateString(dateA).setHours(0, 0, 0, 0);
  const dateBValue = parseDateString(dateB).setHours(0, 0, 0, 0);
  return Math.round((dateAValue - dateBValue) / (1000 * 60 * 60 * 24));
}

function isTaskOverdue(task, todayDateStr) {
  return task.date < todayDateStr && !isTaskCompleted(task);
}

function getTasksByDate(taskList) {
  return taskList.reduce((acc, task) => {
    if (!acc[task.date]) {
      acc[task.date] = [];
    }
    acc[task.date].push(task);
    return acc;
  }, {});
}

function getCompletionRatio(taskList) {
  if (!taskList.length) {
    return 0;
  }
  const completed = taskList.filter((task) => isTaskCompleted(task)).length;
  return completed / taskList.length;
}

function normalizeTheme(value) {
  return THEMES.includes(value) ? value : "ocean";
}

function applyTheme(themeName) {
  const resolvedTheme = normalizeTheme(themeName);
  document.body.dataset.theme = resolvedTheme;

  refs.themeButtons.forEach((button) => {
    const isActive = button.dataset.theme === resolvedTheme;
    button.classList.toggle("active", isActive);
  });
}

function getThemeLabel(themeName) {
  return THEME_LABELS[themeName] ?? themeName.charAt(0).toUpperCase() + themeName.slice(1);
}

function calculateStreaks(todayDateStr) {
  const tasksByDate = getTasksByDate(state.tasks.filter((task) => task.date <= todayDateStr));
  const activeDates = Object.keys(tasksByDate).sort();

  if (!activeDates.length) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let rollingStreak = 0;

  activeDates.forEach((date, index) => {
    const ratio = getCompletionRatio(tasksByDate[date]);
    const passesDay = ratio >= 0.8;

    if (passesDay) {
      if (index === 0 || getDayDiff(date, activeDates[index - 1]) === 1) {
        rollingStreak += 1;
      } else {
        rollingStreak = 1;
      }
      bestStreak = Math.max(bestStreak, rollingStreak);
    } else {
      rollingStreak = 0;
    }
  });

  for (let index = activeDates.length - 1; index >= 0; index -= 1) {
    const date = activeDates[index];
    const ratio = getCompletionRatio(tasksByDate[date]);
    if (ratio < 0.8) {
      break;
    }

    if (index < activeDates.length - 1) {
      const previousDate = activeDates[index + 1];
      if (getDayDiff(previousDate, date) !== 1) {
        break;
      }
    }

    currentStreak += 1;
  }

  return { currentStreak, bestStreak };
}

function calculateWeeklyCompletion() {
  const weekStart = getWeekStart(new Date());
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = getDateString(weekStart);
  const weekEndStr = getDateString(weekEnd);

  const weeklyTasks = state.tasks.filter((task) => task.date >= weekStartStr && task.date <= weekEndStr);
  const weeklyDueTasks = weeklyTasks.length;
  const weeklyDoneTasks = weeklyTasks.filter((task) => isTaskCompleted(task)).length;

  return {
    weeklyDueTasks,
    weeklyDoneTasks,
    weeklyCompletionRatio: weeklyDueTasks > 0 ? weeklyDoneTasks / weeklyDueTasks : 0,
  };
}

function resolveRank(xp) {
  let currentRank = RANKS[0];
  let nextRank = null;

  for (let index = 0; index < RANKS.length; index += 1) {
    const rank = RANKS[index];
    if (xp >= rank.minXp) {
      currentRank = rank;
      nextRank = RANKS[index + 1] ?? null;
    }
  }

  const currentFloor = currentRank.minXp;
  const nextFloor = nextRank?.minXp ?? currentFloor;
  const progressRatio = nextRank
    ? Math.min((xp - currentFloor) / Math.max(nextFloor - currentFloor, 1), 1)
    : 1;

  return {
    currentRank,
    nextRank,
    progressPercent: Math.round(progressRatio * 100),
  };
}

function getGamificationMetrics() {
  const todayDateStr = getDateString();
  const completedTasks = state.tasks.filter((task) => isTaskCompleted(task)).length;
  const overdueTasks = state.tasks.filter((task) => isTaskOverdue(task, todayDateStr)).length;
  const xp = Math.max(0, completedTasks * XP_PER_COMPLETED_TASK - overdueTasks * XP_PENALTY_PER_OVERDUE_TASK);
  const { currentStreak, bestStreak } = calculateStreaks(todayDateStr);
  const weeklyStats = calculateWeeklyCompletion();
  const rankState = resolveRank(xp);

  const metrics = {
    completedTasks,
    overdueTasks,
    xp,
    currentStreak,
    bestStreak,
    ...weeklyStats,
    ...rankState,
  };

  const medals = MEDALS.map((medal) => ({
    key: medal.key,
    title: medal.title,
    detail: medal.detail,
    unlocked: medal.unlocked(metrics),
  }));

  return {
    ...metrics,
    medals,
    unlockedMedals: medals.filter((medal) => medal.unlocked).length,
  };
}

function getClaimedBattlePassRewards() {
  return new Set(Array.isArray(state.profile?.battlePassClaimedRewards) ? state.profile.battlePassClaimedRewards : []);
}

function normalizeClaimedBattlePassRewards(claimedRewards) {
  const validRewardKeys = new Set(BATTLE_PASS_REWARDS.map((reward) => reward.key));
  const filteredClaims = [...claimedRewards].filter((key) => validRewardKeys.has(key));
  const highestClaimedXp = filteredClaims.reduce((maxXp, rewardKey) => {
    const reward = BATTLE_PASS_REWARDS.find((item) => item.key === rewardKey);
    return reward ? Math.max(maxXp, reward.minXp) : maxXp;
  }, 0);

  const normalized = new Set(filteredClaims);
  if (highestClaimedXp > 0) {
    BATTLE_PASS_REWARDS.forEach((reward) => {
      if (reward.minXp <= highestClaimedXp) {
        normalized.add(reward.key);
      }
    });
  }

  return normalized;
}

function getBattlePassRewardByKey(rewardKey, rewards = getBattlePassRewards(getGamificationMetrics())) {
  return rewards.find((reward) => reward.key === rewardKey) ?? null;
}

function getBattlePassRewards(metrics) {
  const claimedRewards = normalizeClaimedBattlePassRewards(getClaimedBattlePassRewards());

  return BATTLE_PASS_REWARDS.map((reward) => ({
    ...reward,
    claimed: claimedRewards.has(reward.key),
    unlocked: metrics.xp >= reward.minXp,
  })).sort((leftReward, rightReward) => leftReward.minXp - rightReward.minXp);
}

function isThemeUnlocked(themeName, metrics, rewards = getBattlePassRewards(metrics)) {
  if (themeName === "ocean" || themeName === "sunset" || themeName === "forest") {
    return true;
  }

  return rewards.some((reward) => reward.effect?.theme === themeName && reward.claimed);
}

function getBattlePassProgress(metrics, rewards = getBattlePassRewards(metrics)) {
  if (!rewards.length) {
    return {
      progressPercent: 0,
      claimedCount: 0,
      unlockedCount: 0,
      nextReward: null,
    };
  }

  const maxXp = rewards.reduce((highestXp, reward) => Math.max(highestXp, reward.minXp), 0);
  const progressPercent = maxXp > 0 ? Math.min(Math.round((metrics.xp / maxXp) * 100), 100) : 100;
  const nextReward = rewards.find((reward) => reward.unlocked && !reward.claimed) ?? rewards.find((reward) => !reward.unlocked) ?? null;

  return {
    progressPercent,
    claimedCount: rewards.filter((reward) => reward.claimed).length,
    unlockedCount: rewards.filter((reward) => reward.unlocked).length,
    nextReward,
  };
}

function setModalState(modalRef, open) {
  if (!modalRef) {
    return;
  }

  modalRef.classList.toggle("open", open);
  modalRef.setAttribute("aria-hidden", String(!open));
  updateModalScrollLock();
}

function updateModalScrollLock() {
  const modalRefs = [
    refs.taskModal,
    refs.goalCreateModal,
    refs.confirmGoalModal,
    refs.confirmTaskModal,
    refs.profileNameModal,
    refs.profileBattlePassModal,
    refs.profileMotesModal,
    refs.profileThemesModal,
    refs.profileAvatarModal,
  ].filter(Boolean);

  const hasOpenModal = modalRefs.some((modal) => modal.classList.contains("open"));
  document.body.classList.toggle("modal-open", hasOpenModal);
}

function areSetsEqual(leftSet, rightSet) {
  if (leftSet.size !== rightSet.size) {
    return false;
  }

  for (const value of leftSet) {
    if (!rightSet.has(value)) {
      return false;
    }
  }

  return true;
}

function setBattlePassModalOpen(open) {
  setModalState(refs.profileBattlePassModal, open);
}

function setMotesModalOpen(open) {
  setModalState(refs.profileMotesModal, open);
}

function setThemesModalOpen(open) {
  setModalState(refs.profileThemesModal, open);
}

function setAvatarModalOpen(open) {
  setModalState(refs.profileAvatarModal, open);
}

function setFramePreviewModalOpen(open) {
  setModalState(refs.profileFramePreviewModal, open);
}

function openFramePreviewModal(skinKey) {
  if (!refs.profileFramePreviewCard) return;
  const key = skinKey || state.profile?.avatarSkin || "classic";
  refs.profileFramePreviewCard.dataset.avatarSkin = key;

  // show user photo if exists
  const photo = state.profile?.avatarDataUrl || "";
  if (photo) {
    if (refs.profileFramePreviewImg) {
      refs.profileFramePreviewImg.src = photo;
      refs.profileFramePreviewImg.hidden = false;
    }
    if (refs.profileFramePreviewFallback) refs.profileFramePreviewFallback.hidden = true;
  } else {
    if (refs.profileFramePreviewImg) refs.profileFramePreviewImg.hidden = true;
    if (refs.profileFramePreviewFallback) {
      refs.profileFramePreviewFallback.hidden = false;
      refs.profileFramePreviewFallback.dataset.avatarSkin = key;
      refs.profileFramePreviewFallback.textContent = getInitialForAvatar(state.profile?.name || "");
    }
  }

  setFramePreviewModalOpen(true);
}

// Preview handling for decorative frames (temporary, non-persistent)
let _currentPreviewFrame = null;
function previewFrame(skinKey) {
  if (!skinKey) return;
  _currentPreviewFrame = skinKey;
  if (refs.profileCard) refs.profileCard.dataset.avatarSkin = skinKey;
  if (refs.profileAvatarFallback) refs.profileAvatarFallback.dataset.avatarSkin = skinKey;
}

function clearFramePreview() {
  _currentPreviewFrame = null;
  const avatarSkin = state.profile?.avatarSkin || "classic";
  if (refs.profileCard) refs.profileCard.dataset.avatarSkin = avatarSkin;
  if (refs.profileAvatarFallback) refs.profileAvatarFallback.dataset.avatarSkin = avatarSkin;
}

function getInitialForAvatar(nameValue) {
  const cleanName = String(nameValue ?? "").trim();
  return cleanName ? cleanName[0].toUpperCase() : "?";
}

function buildAvatarPresetDataUrl(presetKey, nameValue) {
  const preset = AVATAR_PRESETS.find((item) => item.key === presetKey);
  if (!preset) {
    return "";
  }

  const initial = getInitialForAvatar(nameValue);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='${preset.grad1}'/>
        <stop offset='100%' stop-color='${preset.grad2}'/>
      </linearGradient>
    </defs>
    <rect width='240' height='240' fill='url(#g)'/>
    <circle cx='120' cy='120' r='92' fill='rgba(255,255,255,0.18)'/>
    <text x='120' y='148' text-anchor='middle' font-family='Sora,Segoe UI,sans-serif' font-size='112' font-weight='800' fill='${preset.fg}'>${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Select a decorative frame ("marco"). This should NOT replace the user's photo.
function selectFramePreset(presetKey) {
  if (presetKey === "classic" || !presetKey) {
    state.profile.avatarSkin = "classic";
    saveAppState({ immediate: true });
    setAvatarModalOpen(false);
    renderProfile();
    return;
  }

  const preset = AVATAR_PRESETS.find((item) => item.key === presetKey);
  if (!preset) {
    return;
  }

  state.profile.avatarSkin = presetKey;
  saveAppState({ immediate: true });
  setAvatarModalOpen(false);
  renderProfile();
}

function claimBattlePassReward(rewardKey) {
  const metrics = getGamificationMetrics();
  const reward = BATTLE_PASS_REWARDS.find((item) => item.key === rewardKey);
  if (!reward || metrics.xp < reward.minXp) {
    return;
  }

  const claimedRewards = new Set(Array.isArray(state.profile?.battlePassClaimedRewards) ? state.profile.battlePassClaimedRewards : []);
  claimedRewards.add(reward.key);
  state.profile.battlePassClaimedRewards = Array.from(claimedRewards);

  if (reward.effect?.theme) {
    state.profile.theme = reward.effect.theme;
  }
  if (reward.effect?.avatarSkin) {
    state.profile.avatarSkin = reward.effect.avatarSkin;
  }

  saveAppState({ immediate: true });
  renderProfile();
}

function equipBattlePassMote(rewardKey) {
  const metrics = getGamificationMetrics();
  const rewards = getBattlePassRewards(metrics);
  const reward = rewards.find((item) => item.key === rewardKey && item.claimed && item.effect?.mote);

  if (!reward) {
    return;
  }

  state.profile.equippedMoteKey = reward.key;
  state.profile.mote = reward.effect.mote;
  saveAppState({ immediate: true });
  renderProfile();
}

function renderBattlePassModal(metrics, battlePassRewards, battlePassProgress) {
  if (!refs.profileBattlePassModalList) {
    return;
  }

  if (refs.profileBattlePassModalCount) {
    refs.profileBattlePassModalCount.textContent = `${battlePassProgress.claimedCount}/${battlePassRewards.length}`;
  }

  if (refs.profileBattlePassModalXp) {
    refs.profileBattlePassModalXp.textContent = `${metrics.xp} XP`;
  }

  if (refs.profileBattlePassModalProgress) {
    refs.profileBattlePassModalProgress.style.width = `${battlePassProgress.progressPercent}%`;
  }

  const maxXp = battlePassRewards[battlePassRewards.length - 1]?.minXp ?? 0;
  refs.profileBattlePassModalList.innerHTML = battlePassRewards
    .map((reward) => {
      const rewardPosition = maxXp > 0 ? Math.round((reward.minXp / maxXp) * 100) : 0;
      const stateLabel = reward.claimed
        ? "Reclamado"
        : reward.unlocked
          ? "Listo para reclamar"
          : `Bloqueado en ${reward.minXp} XP`;
      const actionButton = reward.claimed
        ? `<button class="btn btn-small" type="button" disabled>Reclamado</button>`
        : reward.unlocked
          ? `<button class="btn btn-small btn-primary" type="button" data-action="claim-battle-pass" data-reward-key="${reward.key}">Reclamar</button>`
          : `<button class="btn btn-small" type="button" disabled>Bloqueado</button>`;

      const previewButton = reward.effect?.avatarSkin
        ? `<button class="btn btn-small" type="button" data-action="preview-frame" data-frame-key="${reward.effect.avatarSkin}">Vista</button>`
        : "";

      return `
        <article class="battle-pass-node ${reward.claimed ? "claimed" : reward.unlocked ? "unlocked" : "locked"}" style="--reward-position:${rewardPosition}%">
          <p class="battle-pass-node-xp">${reward.minXp} XP</p>
          <div class="battle-pass-node-card">
            <h4 class="battle-pass-node-title">${reward.title}</h4>
            <p class="battle-pass-node-detail">${reward.detail}</p>
            <div class="battle-pass-node-footer">
              <span class="battle-pass-node-state">${stateLabel}</span>
              <div class="battle-pass-node-actions">${previewButton}${actionButton}</div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  if (refs.profileBattlePassModal) {
    refs.profileBattlePassModal.dataset.claimedCount = String(battlePassProgress.claimedCount);
    refs.profileBattlePassModal.dataset.xp = String(metrics.xp);
  }
}

function renderMoteModal(claimedMotes, equippedMoteReward) {
  if (!refs.profileMotesModalList) {
    return;
  }

  refs.profileMotesModalList.innerHTML = claimedMotes.length
    ? claimedMotes
        .map((reward) => {
          const isEquipped = reward.key === equippedMoteReward?.key;
          return `
            <article class="mote-card ${isEquipped ? "equipped" : "available"}">
              <p class="mote-title">${reward.title}</p>
              <p class="mote-detail">${reward.detail}</p>
              <div class="mote-footer">
                <span class="mote-state">${isEquipped ? "Equipado" : "Disponible"}</span>
                <button class="btn btn-small ${isEquipped ? "" : "btn-primary"}" type="button" data-action="equip-battle-pass-mote" data-reward-key="${reward.key}" ${isEquipped ? "disabled" : ""}>${isEquipped ? "Equipado" : "Equipar"}</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class='empty-message'>Reclama un mote en el pase de batalla para poder equiparlo.</p>`;
}

function renderThemeModal(metrics, battlePassRewards, resolvedTheme) {
  const unlockedThemes = THEMES.filter((themeName) => isThemeUnlocked(themeName, metrics, battlePassRewards));

  refs.themeButtons.forEach((button) => {
    const themeName = button.dataset.theme || "ocean";
    const unlocked = unlockedThemes.includes(themeName);
    button.disabled = !unlocked;
    button.classList.toggle("locked", !unlocked);
    button.setAttribute("aria-disabled", String(!unlocked));
    button.title = unlocked ? `Cambiar a ${getThemeLabel(themeName)}` : `Bloqueado: se desbloquea con el pase de batalla`;
  });

  if (refs.profileThemesModal) {
    refs.profileThemesModal.dataset.activeTheme = resolvedTheme;
  }
}

function getRecentPeriodTasks(days, todayDateStr) {
  const startDate = addDays(parseDateString(todayDateStr), -(days - 1));
  const startDateStr = getDateString(startDate);
  return state.tasks.filter((task) => task.date >= startDateStr && task.date <= todayDateStr);
}

function getProfileAnalytics() {
  const todayDateStr = getDateString();
  const tasks7d = getRecentPeriodTasks(7, todayDateStr);
  const tasks30d = getRecentPeriodTasks(30, todayDateStr);
  const completion7d = Math.round(getCompletionRatio(tasks7d) * 100);
  const completion30d = Math.round(getCompletionRatio(tasks30d) * 100);

  const completedTasks = state.tasks.filter((task) => isTaskCompleted(task));
  const hourCount = new Map();
  const typeCount = new Map();

  completedTasks.forEach((task) => {
    const hourLabel = `${String(task.startHour).padStart(2, "0")}:00`;
    hourCount.set(hourLabel, (hourCount.get(hourLabel) ?? 0) + 1);

    const normalizedType = normalizeType(task.type || "study") || "study";
    typeCount.set(normalizedType, (typeCount.get(normalizedType) ?? 0) + 1);
  });

  const bestHour = [...hourCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sin datos";
  const topTypeRaw = [...typeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sin datos";
  const topType = topTypeRaw === "Sin datos" ? topTypeRaw : topTypeRaw.charAt(0).toUpperCase() + topTypeRaw.slice(1);

  return {
    completion7d,
    completion30d,
    bestHour,
    topType,
  };
}

function getHeatmapCells(totalDays = 84) {
  const today = new Date();
  const dayTaskMap = new Map();

  state.tasks.forEach((task) => {
    if (!isTaskCompleted(task)) {
      return;
    }
    dayTaskMap.set(task.date, (dayTaskMap.get(task.date) ?? 0) + 1);
  });

  const cells = [];
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const dateStr = getDateString(date);
    const count = dayTaskMap.get(dateStr) ?? 0;
    const intensity = count >= 4 ? 4 : count;
    cells.push({
      date: dateStr,
      count,
      intensity,
    });
  }

  return cells;
}

function getAntiProcrastinationSuggestions() {
  const todayDateStr = getDateString();
  const overdueTasks = state.tasks
    .filter((task) => isTaskOverdue(task, todayDateStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  const longPending = state.tasks
    .filter((task) => !isTaskCompleted(task))
    .filter((task) => calculateTaskDuration(task) >= 2)
    .slice(0, 2);

  const pendingByTitle = state.tasks
    .filter((task) => !isTaskCompleted(task))
    .reduce((acc, task) => {
      const key = normalizeType(task.title || "");
      if (!key) {
        return acc;
      }
      acc.set(key, (acc.get(key) ?? 0) + 1);
      return acc;
    }, new Map());

  const repeatedPending = [...pendingByTitle.entries()]
    .filter(([, count]) => count >= 2)
    .map(([title, count]) => ({ title, count }))
    .slice(0, 1);

  const suggestions = [];

  if (overdueTasks.length > 0) {
    suggestions.push(`Tienes ${overdueTasks.length} tareas vencidas. Prioriza hoy la mas antigua: ${overdueTasks[0].title}.`);
  }

  longPending.forEach((task) => {
    suggestions.push(`La tarea "${task.title}" es larga. Dividela en 2 o 3 bloques para desbloquear progreso rapido.`);
  });

  repeatedPending.forEach((entry) => {
    suggestions.push(`Has repetido "${entry.title}" ${entry.count} veces sin cerrar. Crea una version minima accionable.`);
  });

  if (!suggestions.length) {
    suggestions.push("Vas muy bien. Mantener 80% de cumplimiento semanal te hara subir de rango mas rapido.");
  }

  return suggestions.slice(0, 4);
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

  const saveResult = await saveState(buildStateSnapshot(), currentUserId);

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
      theme: String(payload.profile.theme ?? "ocean"),
      battlePassClaimedRewards: Array.isArray(payload.profile.battlePassClaimedRewards)
        ? payload.profile.battlePassClaimedRewards.map(String)
        : [],
      equippedMoteKey: String(payload.profile.equippedMoteKey ?? ""),
      mote: String(payload.profile.mote ?? ""),
      avatarSkin: String(payload.profile.avatarSkin ?? "classic"),
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
  const saveResult = await saveState(importedState, currentUserId);
  const persistedState = await loadState(currentUserId);

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
  updateModalScrollLock();

  if (open) {
    refs.taskTitle.focus();
  }
}

function setConfirmGoalModalOpen(open) {
  refs.confirmGoalModal.classList.toggle("open", open);
  refs.confirmGoalModal.setAttribute("aria-hidden", String(!open));
  updateModalScrollLock();
}

function setConfirmTaskModalOpen(open) {
  refs.confirmTaskModal.classList.toggle("open", open);
  refs.confirmTaskModal.setAttribute("aria-hidden", String(!open));
  updateModalScrollLock();
}

function setGoalCreateModalOpen(open) {
  refs.goalCreateModal.classList.toggle("open", open);
  refs.goalCreateModal.setAttribute("aria-hidden", String(!open));
  updateModalScrollLock();

  if (open) {
    refs.goalName.focus();
  }
}

function setProfileNameModalOpen(open) {
  if (!refs.profileNameModal) {
    return;
  }

  refs.profileNameModal.classList.toggle("open", open);
  refs.profileNameModal.setAttribute("aria-hidden", String(!open));
  updateModalScrollLock();

  if (open && refs.profileNameInput) {
    refs.profileNameInput.value = state.profile?.name || "";
    refs.profileNameInput.focus();
    refs.profileNameInput.select();
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

  if (refs.taskSearchShell) {
    refs.taskSearchShell.hidden = !isSearchEnabledForActiveTab();
  }
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

function renderWeekHeader() {
  if (!refs.weekTitle || !refs.weekRange) {
    return;
  }

  const weekStart = getWeekCursorStart();
  refs.weekTitle.textContent = "Vista semanal";
  refs.weekRange.textContent = `Semana del ${formatWeekRangeLabel(weekStart)}`;
}

function renderTodaySummary() {
  const today = getDateString();
  const todayTasks = state.tasks
    .filter((task) => task.date === today && matchesTaskQuery(task))
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
  const mondayDate = getWeekCursorStart();

  const dayColumns = DAYS.map((day, index) => {
    const dayDate = addDays(mondayDate, index);
    const dayDateStr = getDateString(dayDate);

    const tasks = state.tasks
      .filter((task) => {
        if (task.date !== dayDateStr) {
          return false;
        }
        if (!matchesTaskQuery(task)) {
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

function renderDayDetail() {
  if (!refs.dayDetailTitle || !refs.dayDetailMeta || !refs.dayDetailTaskList) {
    return;
  }

  if (!state.dayDetailDate) {
    refs.dayDetailTitle.textContent = "Detalle del día";
    refs.dayDetailMeta.textContent = "0 tareas";
    refs.dayDetailTaskList.innerHTML = "";
    return;
  }

  const selectedDate = parseDateString(state.dayDetailDate);
  const selectedDayTasks = state.tasks
    .filter((task) => task.date === state.dayDetailDate && matchesTaskQuery(task))
    .sort((a, b) => a.startHour - b.startHour);

  refs.dayDetailTitle.textContent = formatDateLong(selectedDate);
  refs.dayDetailMeta.textContent = `${selectedDayTasks.length} tareas`;

  if (!selectedDayTasks.length) {
    refs.dayDetailTaskList.innerHTML = "<p class='empty-message'>No hay tareas para este día.</p>";
    return;
  }

  refs.dayDetailTaskList.innerHTML = selectedDayTasks
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
    const tasksForDay = state.tasks.filter((task) => task.date === cellDateStr && matchesTaskQuery(task));
    const completedForDay = state.completedHours.filter((entry) => entry.date === cellDateStr).length;
    const isToday = dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    cells.push(`
      <button class="month-cell month-cell-btn ${isToday ? "today" : ""}" type="button" data-action="open-day-detail" data-date="${cellDateStr}">
        <p class="month-number">${dayNumber}</p>
        <p class="month-meta month-meta-tasks">${tasksForDay.length} tareas</p>
        <p class="month-meta month-meta-hours">${completedForDay}h hechas</p>
      </button>
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
  const rawClaimedRewards = getClaimedBattlePassRewards();
  const normalizedClaimedRewards = normalizeClaimedBattlePassRewards(rawClaimedRewards);
  if (!areSetsEqual(rawClaimedRewards, normalizedClaimedRewards)) {
    state.profile.battlePassClaimedRewards = Array.from(normalizedClaimedRewards);
    saveAppState();
  }

  const name = state.profile?.name?.trim() || "Sin nombre";
  const avatarDataUrl = state.profile?.avatarDataUrl || "";
  const initial = name[0]?.toUpperCase() || "?";
  const usernameLabel = currentUserUsername === "No disponible" ? currentUserUsername : `@${currentUserUsername}`;
  const metrics = getGamificationMetrics();
  const battlePassRewards = getBattlePassRewards(metrics);
  const battlePassProgress = getBattlePassProgress(metrics, battlePassRewards);
  const remainingToNext = metrics.nextRank ? Math.max(metrics.nextRank.minXp - metrics.xp, 0) : 0;
  const claimedMotes = battlePassRewards.filter((reward) => reward.claimed && reward.effect?.mote);
  const equippedMoteReward =
    battlePassRewards.find((reward) => reward.key === state.profile?.equippedMoteKey && reward.claimed && reward.effect?.mote) ??
    claimedMotes.find((reward) => reward.effect?.mote === state.profile?.mote) ??
    null;
  if (!state.profile?.equippedMoteKey && equippedMoteReward) {
    state.profile.equippedMoteKey = equippedMoteReward.key;
  }
  const activeMote = equippedMoteReward?.effect?.mote || state.profile?.mote?.trim() || "Sin mote";
  const avatarSkin = state.profile?.avatarSkin || "classic";
  const requestedTheme = state.profile?.theme || "ocean";
  const resolvedTheme = isThemeUnlocked(requestedTheme, metrics, battlePassRewards) ? requestedTheme : "ocean";

  if (resolvedTheme !== requestedTheme) {
    state.profile.theme = resolvedTheme;
  }

  refs.profileDisplayName.textContent = name;
  refs.profileUsernameText.textContent = usernameLabel;
  refs.profileEmailText.textContent = currentUserEmail;
  if (refs.profileMoteText) {
    refs.profileMoteText.textContent = activeMote;
  }
  if (refs.profileEquippedMoteName) {
    refs.profileEquippedMoteName.textContent = activeMote;
  }
  if (refs.profileEquippedMoteDetail) {
    refs.profileEquippedMoteDetail.textContent = claimedMotes.length
      ? `${claimedMotes.length} motes desbloqueados. Pulsa cambiar para abrir tu colección.`
      : "Todavía no tienes motes desbloqueados.";
  }
  if (refs.profileEquippedThemeName) {
    refs.profileEquippedThemeName.textContent = getThemeLabel(resolvedTheme);
  }
  if (refs.profileEquippedThemeDetail) {
    refs.profileEquippedThemeDetail.textContent = resolvedTheme === "ocean"
      ? "Tema base siempre disponible."
      : `${getThemeLabel(resolvedTheme)} está equipado y listo para usar.`;
  }
  refs.profileAvatarFallback.textContent = initial;
  if (refs.profileCard) {
    refs.profileCard.dataset.avatarSkin = avatarSkin;
  }
  refs.profileAvatarFallback.dataset.avatarSkin = avatarSkin;

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
  if (refs.profileRankCard) {
    refs.profileRankCard.dataset.rank = metrics.currentRank.key;
  }
  refs.profileRankBadge.dataset.rank = metrics.currentRank.key;
  refs.profileRankBadge.textContent = metrics.currentRank.label.toUpperCase();
  refs.profileRankName.textContent = metrics.currentRank.label;
  refs.profileRankXp.textContent = `${metrics.xp} XP`;
  refs.profileRankProgress.style.width = `${metrics.progressPercent}%`;
  refs.profileNextRank.textContent = metrics.nextRank
    ? `${remainingToNext} XP para ${metrics.nextRank.label}`
    : "Rango maximo alcanzado";
  refs.profileCurrentStreak.textContent = String(metrics.currentStreak);
  refs.profileBestStreak.textContent = String(metrics.bestStreak);
  refs.profileWeeklyRate.textContent = `${Math.round(metrics.weeklyCompletionRatio * 100)}%`;
  refs.profileOverdueCount.textContent = String(metrics.overdueTasks);

  if (refs.profileBattlePassCount) {
    refs.profileBattlePassCount.textContent = `${battlePassProgress.claimedCount}/${battlePassRewards.length} reclamadas`;
  }
  if (refs.profileBattlePassXp) {
    refs.profileBattlePassXp.textContent = `${metrics.xp} XP`;
  }
  if (refs.profileBattlePassProgress) {
    refs.profileBattlePassProgress.style.width = `${battlePassProgress.progressPercent}%`;
  }
  if (refs.profileBattlePassNext) {
    refs.profileBattlePassNext.textContent = battlePassProgress.nextReward
      ? battlePassProgress.nextReward.unlocked
        ? `Listo para reclamar: ${battlePassProgress.nextReward.title}`
        : `${battlePassProgress.nextReward.minXp - metrics.xp} XP para ${battlePassProgress.nextReward.title}`
      : "Pase de batalla completado";
  }
  renderBattlePassModal(metrics, battlePassRewards, battlePassProgress);

  if (refs.profileMotesCount) {
    refs.profileMotesCount.textContent = `${claimedMotes.length} disponibles`;
  }
  renderMoteModal(claimedMotes, equippedMoteReward);
  renderThemeModal(metrics, battlePassRewards, resolvedTheme);

  refs.profileMedalsCount.textContent = `${metrics.unlockedMedals}/${metrics.medals.length} desbloqueadas`;
  refs.profileMedalsList.innerHTML = metrics.medals
    .map((medal) => {
      const unlockedClass = medal.unlocked ? "unlocked" : "locked";
      const medalStatus = medal.unlocked ? "Desbloqueada" : "Bloqueada";
      return `
        <article class="medal-card ${unlockedClass}">
          <p class="medal-title">${medal.title}</p>
          <p class="medal-detail">${medal.detail}</p>
          <p class="medal-status">${medalStatus}</p>
        </article>
      `;
    })
    .join("");

  const analytics = getProfileAnalytics();
  refs.profileAnalyticsWeek.textContent = `${analytics.completion7d}%`;
  refs.profileAnalyticsMonth.textContent = `${analytics.completion30d}%`;
  refs.profileAnalyticsBestHour.textContent = analytics.bestHour;
  refs.profileAnalyticsTopType.textContent = analytics.topType;

  if (refs.profileHeatmapGrid) {
    const heatmapCells = getHeatmapCells();
    refs.profileHeatmapGrid.innerHTML = heatmapCells
      .map((cell) => {
        return `<button class="heat-cell-btn heat-intensity-${cell.intensity}" type="button" data-action="open-day-detail" data-date="${cell.date}" title="${cell.date}: ${cell.count} tareas completadas"></button>`;
      })
      .join("");
  }

  if (refs.profileFocusSuggestions) {
    const suggestions = getAntiProcrastinationSuggestions();
    refs.profileFocusSuggestions.innerHTML = suggestions
      .map((suggestion) => `<article class="focus-card"><p>${suggestion}</p></article>`)
      .join("");
  }

  applyTheme(resolvedTheme);
}

function handleProfileNameSubmit(event) {
  event.preventDefault();
  const nameValue = refs.profileNameInput?.value?.trim() ?? "";
  state.profile.name = nameValue;
  saveAppState();
  setProfileNameModalOpen(false);
  renderProfile();
}

function renderAll() {
  renderAppDate();
  renderTypeFilter();
  renderTodaySummary();
  renderWeekHeader();
  renderWeekOverview();
  renderMonthView();
  renderDayDetail();
  renderGoals();
  renderProfile();
  fillObjectiveField();
  setActiveTab(state.activeTab);
}

function openDayDetail(dateString) {
  state.dayDetailDate = dateString;
  setActiveTab("day-detail");
  renderAll();
}

function closeDayDetail() {
  state.dayDetailDate = "";
  setActiveTab("month");
  renderAll();
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

function shiftWeek(direction) {
  const next = new Date(state.weekCursor);
  next.setDate(next.getDate() + direction * 7);
  state.weekCursor = next;
  renderWeekHeader();
  renderWeekOverview();
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

  if (action === "prev-week") {
    shiftWeek(-1);
    return;
  }

  if (action === "next-week") {
    shiftWeek(1);
    return;
  }

  if (action === "open-day-detail") {
    openDayDetail(trigger.dataset.date);
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
    return;
  }

  if (action === "set-theme") {
    const nextTheme = normalizeTheme(trigger.dataset.theme || "ocean");
    const metrics = getGamificationMetrics();
    if (!isThemeUnlocked(nextTheme, metrics)) {
      return;
    }
    state.profile.theme = nextTheme;
    applyTheme(nextTheme);
    saveAppState();
    renderProfile();
    return;
  }

  if (action === "open-battle-pass-modal") {
    setBattlePassModalOpen(true);
    return;
  }

  if (action === "open-motes-modal") {
    setMotesModalOpen(true);
    return;
  }

  if (action === "open-themes-modal") {
    setThemesModalOpen(true);
    return;
  }

  if (action === "open-avatar-modal") {
    setAvatarModalOpen(true);
    return;
  }

  if (action === "close-battle-pass-modal") {
    setBattlePassModalOpen(false);
    return;
  }

  if (action === "close-motes-modal") {
    setMotesModalOpen(false);
    return;
  }

  if (action === "close-themes-modal") {
    setThemesModalOpen(false);
    return;
  }

  if (action === "close-avatar-modal") {
    setAvatarModalOpen(false);
    return;
  }

  if (action === "select-frame-preset") {
    selectFramePreset(trigger.dataset.avatarPreset || "");
    return;
  }

  if (action === "preview-frame") {
    openFramePreviewModal(trigger.dataset.frameKey || "");
    return;
  }

  if (action === "close-frame-preview-modal") {
    setFramePreviewModalOpen(false);
    return;
  }

  if (action === "clear-frame-preview") {
    clearFramePreview();
    return;
  }

  if (action === "claim-battle-pass") {
    claimBattlePassReward(trigger.dataset.rewardKey || "");
    return;
  }

  if (action === "equip-battle-pass-mote") {
    equipBattlePassMote(trigger.dataset.rewardKey || "");
    return;
  }
}

function bindEvents() {
  document.addEventListener("click", handleClick);

  // Hover preview for frame presets in the avatar/frame modal
  document.addEventListener("mouseover", (e) => {
    const btn = e.target.closest && e.target.closest(".avatar-preset-btn");
    if (btn) {
      const preset = btn.dataset?.avatarPreset || "";
      if (preset) previewFrame(preset);
    }
  });

  document.addEventListener("mouseout", (e) => {
    const btn = e.target.closest && e.target.closest(".avatar-preset-btn");
    if (btn) {
      clearFramePreview();
    }
  });

  // Capture preview-frame clicks early to prevent the global handler from triggering claim actions.
  document.addEventListener(
    "click",
    (e) => {
      const btn = e.target.closest && e.target.closest('button[data-action="preview-frame"]');
      if (!btn) return;
      const key = btn.dataset.frameKey || "";
      if (key) openFramePreviewModal(key);
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

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

  refs.taskSearchInput?.addEventListener("input", (event) => {
    state.filters.query = normalizeSearchQuery(event.target.value);
    renderAll();
  });

  refs.backToMonthBtn?.addEventListener("click", () => {
    closeDayDetail();
  });

  refs.choosePhotoBtn.addEventListener("click", () => {
    refs.profilePhotoInput.click();
  });

  refs.profilePhotoInput.addEventListener("change", (event) => {
    const selectedFile = event.target.files?.[0];
    readAvatarFile(selectedFile);
  });

  refs.openNameModalBtn?.addEventListener("click", () => {
    setProfileNameModalOpen(true);
  });

  refs.closeNameModal?.addEventListener("click", () => {
    setProfileNameModalOpen(false);
  });

  refs.cancelNameModal?.addEventListener("click", () => {
    setProfileNameModalOpen(false);
  });

  refs.profileNameModal?.addEventListener("click", (event) => {
    if (event.target === refs.profileNameModal) {
      setProfileNameModalOpen(false);
    }
  });

  refs.openAvatarModalBtn?.addEventListener("click", () => {
    setAvatarModalOpen(true);
  });

  refs.profileAvatarModal?.addEventListener("click", (event) => {
    if (event.target === refs.profileAvatarModal) {
      setAvatarModalOpen(false);
    }
  });

  refs.profileNameForm?.addEventListener("submit", handleProfileNameSubmit);

  refs.logoutBtn.addEventListener("click", async () => {
    try {
      await signOutUser();
      window.location.href = "/login";
    } catch (error) {
      console.error("Habitly: no se pudo cerrar sesion.", error);
    }
  });

  refs.profileBattlePassModal?.addEventListener("click", (event) => {
    if (event.target === refs.profileBattlePassModal) {
      setBattlePassModalOpen(false);
    }
  });

  refs.profileMotesModal?.addEventListener("click", (event) => {
    if (event.target === refs.profileMotesModal) {
      setMotesModalOpen(false);
    }
  });

  refs.profileThemesModal?.addEventListener("click", (event) => {
    if (event.target === refs.profileThemesModal) {
      setThemesModalOpen(false);
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

function moveProfileModalsToBody() {
  const profileModalRefs = [
    refs.profileBattlePassModal,
    refs.profileMotesModal,
    refs.profileThemesModal,
    refs.profileAvatarModal,
    refs.profileFramePreviewModal,
    refs.profileNameModal,
  ].filter(Boolean);

  profileModalRefs.forEach((modalRef) => {
    if (modalRef.parentElement !== document.body) {
      document.body.appendChild(modalRef);
    }
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
    currentUserId = currentUser.id;
    currentUserEmail = String(currentUser.email ?? "No disponible");
    currentUserUsername = String(currentUser.user_metadata?.username ?? "").trim();
    if (!currentUserUsername && currentUserEmail.includes("@")) {
      currentUserUsername = currentUserEmail.split("@")[0];
    }
    if (!currentUserUsername) {
      currentUserUsername = "No disponible";
    }
  } catch {
    window.location.href = "/login";
    return;
  }

  const persistedState = await loadState(currentUserId);
  state.tasks = persistedState.tasks;
  state.completedHours = persistedState.completedHours;
  state.objectives = persistedState.objectives;
  state.profile = persistedState.profile;
  state.weekCursor = new Date();

  const usernameFromAuth = String(currentUser.user_metadata?.username ?? "").trim();
  if (!state.profile.name && usernameFromAuth) {
    state.profile.name = usernameFromAuth;
  }

  migrateTasks();
  sanitizeObjectives();
  state.weekCursor = getWeekStart(new Date());
  moveProfileModalsToBody();
  fillDayAndHourFields();
  fillObjectiveField();
  renderAll();
  bindEvents();
  saveAppState({ immediate: true });
}

void startApp();
