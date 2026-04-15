import {
  getCurrentUser,
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
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const email = emailInput?.value.trim() ?? "";
  const password = passwordInput?.value ?? "";

  if (!email || !password) {
    setFeedback("Completa email y contrasena.", "error");
    return;
  }

  setButtonLoading(submitBtn, true, "Entrando...");
  setFeedback("");

  try {
    await signInWithPassword(email, password);
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
  const passwordInput = document.getElementById("register-password");
  const email = emailInput?.value.trim() ?? "";
  const password = passwordInput?.value ?? "";

  if (!email || !password) {
    setFeedback("Completa email y contrasena.", "error");
    return;
  }

  setButtonLoading(submitBtn, true, "Creando...");
  setFeedback("");

  try {
    await signUpWithPassword(email, password);
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
}

void initAuthPage();
