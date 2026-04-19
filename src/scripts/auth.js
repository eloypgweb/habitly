import {
  getCurrentUser,
  requestPasswordReset,
  resolveUsernameAvailability,
  signInWithPassword,
  updateUserPassword,
  signUpWithPassword,
} from "../utils/supabase.js";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotForm = document.getElementById("forgot-form");
const resetForm = document.getElementById("reset-form");
const feedback = document.getElementById("auth-feedback");
const registerSuccessModal = document.getElementById("register-success-modal");

let registerRedirectTimer = null;

function setFeedback(message, kind = "info") {
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.classList.remove("error", "success");

  if (kind === "error") {
    feedback.classList.add("error");
  }

  if (kind === "success") {
    feedback.classList.add("success");
  }
}

function setButtonLoading(button, loading, loadingLabel) {
  if (!button) {
    return;
  }

  if (loading) {
    button.dataset.label = button.textContent ?? "";
    button.textContent = loadingLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label ?? button.textContent;
    button.disabled = false;
  }
}

function openSuccessModalAndRedirect() {
  if (!registerSuccessModal) {
    window.location.href = "/login";
    return;
  }

  registerSuccessModal.classList.add("open");
  registerSuccessModal.setAttribute("aria-hidden", "false");

  if (registerRedirectTimer) {
    clearTimeout(registerRedirectTimer);
  }

  registerRedirectTimer = window.setTimeout(() => {
    registerSuccessModal.classList.remove("open");
    registerSuccessModal.setAttribute("aria-hidden", "true");
    window.location.href = "/login";
  }, 3000);
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

function getReadableAuthError(error, fallbackMessage) {
  const rawMessage = String(error?.message ?? "").toLowerCase();

  if (rawMessage.includes("email rate limit") || rawMessage.includes("rate limit exceeded")) {
    return "Estamos teniendo muchas solicitudes de registro. Intentalo de nuevo en unos minutos.";
  }

  return error?.message ?? fallbackMessage;
}

function hasRecoveryTokensInUrl() {
  const hashContent = window.location.hash.replace(/^#/, "");
  const hashParams = new URLSearchParams(hashContent);
  const recoveryType = hashParams.get("type");
  const accessToken = hashParams.get("access_token");
  return recoveryType === "recovery" && Boolean(accessToken);
}

function bindPasswordToggles() {
  const toggleButtons = Array.from(document.querySelectorAll("[data-toggle-password]"));

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.togglePassword;
      const targetInput = targetId ? document.getElementById(targetId) : null;
      if (!targetInput) {
        return;
      }

      const reveal = targetInput.type === "password";
      targetInput.type = reveal ? "text" : "password";
      button.setAttribute("aria-pressed", String(reveal));
      button.textContent = reveal ? "🙈" : "👁";
    });
  });
}

async function redirectIfAuthenticated() {
  try {
    const user = await getCurrentUser();
    if (user) {
      window.location.href = "/";
    }
  } catch {
    // If session lookup fails at first paint, keep page usable and only report errors on submit.
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const submitBtn = document.getElementById("login-submit");
  const identifierInput = document.getElementById("login-identifier");
  const passwordInput = document.getElementById("login-password");
  const identifier = identifierInput?.value.trim() ?? "";
  const password = passwordInput?.value ?? "";

  if (!identifier || !password) {
    setFeedback("Completa usuario/correo y contrasena.", "error");
    return;
  }

  setButtonLoading(submitBtn, true, "Entrando...");
  setFeedback("");

  try {
    await signInWithPassword(identifier, password);
    setFeedback("Sesion iniciada. Redirigiendo...", "success");
    window.location.href = "/";
  } catch (error) {
    setFeedback(getReadableAuthError(error, "No se pudo iniciar sesion."), "error");
  } finally {
    setButtonLoading(submitBtn, false, "Entrar");
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const submitBtn = document.getElementById("register-submit");
  const emailInput = document.getElementById("register-email");
  const usernameInput = document.getElementById("register-username");
  const passwordInput = document.getElementById("register-password");
  const passwordConfirmInput = document.getElementById("register-password-confirm");
  const email = emailInput?.value.trim() ?? "";
  const username = normalizeUsername(usernameInput?.value ?? "");
  const password = passwordInput?.value ?? "";
  const passwordConfirm = passwordConfirmInput?.value ?? "";

  if (!email || !username || !password || !passwordConfirm) {
    setFeedback("Completa email, usuario y contrasena.", "error");
    return;
  }

  if (!isValidUsername(username)) {
    setFeedback("El usuario debe tener 3-24 caracteres: letras, numeros o _.", "error");
    return;
  }

  if (password !== passwordConfirm) {
    setFeedback("La confirmacion de contrasena no coincide.", "error");
    return;
  }

  setButtonLoading(submitBtn, true, "Creando...");
  setFeedback("");

  try {
    const usernameAvailable = await resolveUsernameAvailability(username);
    if (!usernameAvailable) {
      setFeedback("Ese usuario ya existe. Prueba con otro.", "error");
      return;
    }

    await signUpWithPassword(email, password, username);
    setFeedback("Cuenta creada. Revisa tu bandeja de entrada.", "success");
    openSuccessModalAndRedirect();
  } catch (error) {
    setFeedback(getReadableAuthError(error, "No se pudo crear la cuenta."), "error");
  } finally {
    setButtonLoading(submitBtn, false, "Crear cuenta");
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();

  const submitBtn = document.getElementById("forgot-submit");
  const emailInput = document.getElementById("forgot-email");
  const email = emailInput?.value.trim() ?? "";

  if (!email) {
    setFeedback("Introduce tu email.", "error");
    return;
  }

  setButtonLoading(submitBtn, true, "Enviando...");
  setFeedback("");

  try {
    await requestPasswordReset(email);
    setFeedback("Te hemos enviado un enlace de recuperacion. Revisa tu correo.", "success");
  } catch (error) {
    setFeedback(getReadableAuthError(error, "No se pudo enviar el enlace de recuperacion."), "error");
  } finally {
    setButtonLoading(submitBtn, false, "Enviar enlace");
  }
}

async function handleResetPassword(event) {
  event.preventDefault();

  const submitBtn = document.getElementById("reset-submit");
  const passwordInput = document.getElementById("reset-password");
  const confirmInput = document.getElementById("reset-password-confirm");

  const password = passwordInput?.value ?? "";
  const passwordConfirm = confirmInput?.value ?? "";

  if (!hasRecoveryTokensInUrl()) {
    setFeedback("Este enlace de recuperacion no es valido o ha caducado.", "error");
    return;
  }

  if (!password || !passwordConfirm) {
    setFeedback("Completa ambos campos de contrasena.", "error");
    return;
  }

  if (password.length < 6) {
    setFeedback("La contrasena debe tener al menos 6 caracteres.", "error");
    return;
  }

  if (password !== passwordConfirm) {
    setFeedback("La confirmacion de contrasena no coincide.", "error");
    return;
  }

  setButtonLoading(submitBtn, true, "Guardando...");
  setFeedback("");

  try {
    await updateUserPassword(password);
    setFeedback("Contrasena actualizada. Redirigiendo al login...", "success");
    window.setTimeout(() => {
      window.location.href = "/login";
    }, 1800);
  } catch (error) {
    setFeedback(getReadableAuthError(error, "No se pudo actualizar la contrasena."), "error");
  } finally {
    setButtonLoading(submitBtn, false, "Guardar nueva contrasena");
  }
}

async function initAuthPage() {
  if (!loginForm && !registerForm && !forgotForm && !resetForm) {
    return;
  }

  if (loginForm || registerForm) {
    await redirectIfAuthenticated();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  if (forgotForm) {
    forgotForm.addEventListener("submit", handleForgotPassword);
  }

  if (resetForm) {
    if (!hasRecoveryTokensInUrl()) {
      setFeedback("Abre esta pagina desde el enlace que recibiste por correo.", "error");
    }
    resetForm.addEventListener("submit", handleResetPassword);
  }

  bindPasswordToggles();
}

void initAuthPage();
