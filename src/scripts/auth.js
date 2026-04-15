import {
  getCurrentUser,
  resolveUsernameAvailability,
  signInWithPassword,
  signUpWithPassword,
} from "../utils/supabase.js";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const feedback = document.getElementById("auth-feedback");

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

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-z0-9_]{3,24}$/.test(username);
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
    setFeedback("No se pudo validar la sesion. Revisa la configuracion de Supabase.", "error");
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
    setFeedback(error?.message ?? "No se pudo iniciar sesion.", "error");
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
    setFeedback("Cuenta creada. Ya puedes iniciar sesion.", "success");
    window.location.href = "/login";
  } catch (error) {
    setFeedback(error?.message ?? "No se pudo crear la cuenta.", "error");
  } finally {
    setButtonLoading(submitBtn, false, "Crear cuenta");
  }
}

async function initAuthPage() {
  if (!loginForm && !registerForm) {
    return;
  }

  await redirectIfAuthenticated();

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  bindPasswordToggles();
}

void initAuthPage();
