let authCurrentUser = null;

function currentUser() {
  return authCurrentUser;
}

async function restoreSession() {
  const token = getAuthToken();
  if (!token) {
    authCurrentUser = null;
    return null;
  }
  try {
    const data = await api.me();
    authCurrentUser = data.user || null;
    return authCurrentUser;
  } catch {
    setAuthToken("");
    authCurrentUser = null;
    return null;
  }
}

async function registerUser({ name, email, password }) {
  const data = await api.register({ name, email, password });
  setAuthToken(data.token || "");
  authCurrentUser = data.user || null;
  return authCurrentUser;
}

async function loginUser({ email, password }) {
  const data = await api.login({ email, password });
  setAuthToken(data.token || "");
  authCurrentUser = data.user || null;
  return authCurrentUser;
}

function logoutUser() {
  setAuthToken("");
  authCurrentUser = null;
}

function ensureAuthModal() {
  if (document.getElementById("authModal")) return;

  const modal = document.createElement("div");
  modal.id = "authModal";
  modal.className = "modal hidden";
  modal.innerHTML = `
    <div class="modal-backdrop" data-close="true"></div>
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="Авторизация">
      <div class="modal-header">
        <div class="modal-title" id="authModalTitle">Вход</div>
        <button class="icon-btn" type="button" data-close="true" aria-label="Закрыть">✕</button>
      </div>

      <div class="tabs">
        <button class="tab-btn active" type="button" data-tab="login">Вход</button>
        <button class="tab-btn" type="button" data-tab="register">Регистрация</button>
      </div>

      <div class="modal-body">
        <div class="alert hidden" id="authAlert"></div>

        <form id="loginForm" class="modal-form">
          <label>
            E-mail
            <input type="email" id="loginEmail" required />
          </label>
          <label>
            Пароль
            <input type="password" id="loginPassword" required />
          </label>
          <button class="btn btn-primary" type="submit">Войти</button>
        </form>

        <form id="registerForm" class="modal-form hidden">
          <label>
            Имя
            <input type="text" id="regName" required />
          </label>
          <label>
            E-mail
            <input type="email" id="regEmail" required />
          </label>
          <label>
            Пароль
            <input type="password" id="regPassword" minlength="4" required />
          </label>
          <button class="btn btn-primary" type="submit">Создать аккаунт</button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const alertEl = modal.querySelector("#authAlert");
  const loginForm = modal.querySelector("#loginForm");
  const registerForm = modal.querySelector("#registerForm");

  function showAlert(message) {
    alertEl.textContent = message;
    alertEl.classList.remove("hidden");
  }

  function hideAlert() {
    alertEl.classList.add("hidden");
    alertEl.textContent = "";
  }

  function setTab(tab) {
    hideAlert();
    modal.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    modal.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");
    loginForm.classList.toggle("hidden", tab !== "login");
    registerForm.classList.toggle("hidden", tab !== "register");
    modal.querySelector("#authModalTitle").textContent = tab === "login" ? "Вход" : "Регистрация";
  }

  modal.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.close === "true") {
      closeAuthModal();
    }
    if (target.classList.contains("tab-btn")) {
      setTab(target.dataset.tab);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAuthModal();
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();
    try {
      await loginUser({
        email: modal.querySelector("#loginEmail").value,
        password: modal.querySelector("#loginPassword").value,
      });
      document.dispatchEvent(new CustomEvent("auth:changed"));
      closeAuthModal();
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Ошибка входа.");
    }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();
    try {
      await registerUser({
        name: modal.querySelector("#regName").value,
        email: modal.querySelector("#regEmail").value,
        password: modal.querySelector("#regPassword").value,
      });
      document.dispatchEvent(new CustomEvent("auth:changed"));
      closeAuthModal();
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "Ошибка регистрации.");
    }
  });

  setTab("login");
}

function openAuthModal() {
  ensureAuthModal();
  const modal = document.getElementById("authModal");
  modal.classList.remove("hidden");
  document.body.classList.add("no-scroll");
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.classList.remove("no-scroll");
}

