/* ==========================================
   Crossflag Auth — persistent browser session
   ========================================== */

const API_BASE = "https://tg-crypto-exchanger.inkosssator.workers.dev";

const AUTH_TOKEN_KEY = "crossflag_user_token";
const AUTH_USER_KEY  = "crossflag_user";
const _ALL_TK = ["CF_USER_TOKEN","user_token","crossflag_user_token","X_AUTH_TOKEN","AUTH_TOKEN","userToken","cf_user_token"];

/* ---------- storage ---------- */

function saveAuth(token, user) {
  _ALL_TK.forEach(k=>{ try{ localStorage.setItem(k, token); }catch(_){} });
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  _ALL_TK.forEach(k=>{ try{ localStorage.removeItem(k); }catch(_){} });
  localStorage.removeItem(AUTH_USER_KEY);
}

function getAuthToken() {
  for (const k of _ALL_TK){
    try{ const v = localStorage.getItem(k); if(v && v.trim()) return v.trim(); }catch(_){}
  }
  return null;
}

function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY));
  } catch {
    return null;
  }
}

/* ---------- api ---------- */

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  const token = getAuthToken();

  if (token) {
    headers["X-User-Token"] = token;
  }

  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  const json = await res.json().catch(() => null);
  if (!json) throw new Error("Invalid server response");

  return json;
}

/* ---------- auth flow ---------- */

// 🔁 восстановление сессии
async function restoreSession() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await api("/api/public/auth/me");
    if (res.ok && res.user) {
      saveAuth(token, res.user);
      return res.user;
    }
  } catch {}

  clearAuth();
  return null;
}

// 📩 запрос кода
async function requestLoginCode(username) {
  const res = await api("/api/public/auth/request_code", {
    method: "POST",
    body: JSON.stringify({ username }),
  });

  if (!res.ok) {
    throw new Error(res.error || "Ошибка запроса кода");
  }

  return true;
}

// 🔐 подтверждение кода
async function verifyLoginCode(username, code) {
  const res = await api("/api/public/auth/verify_code", {
    method: "POST",
    body: JSON.stringify({ username, code }),
  });

  if (!res.ok || !res.userToken) {
    throw new Error(res.error || "Неверный код");
  }

  saveAuth(res.userToken, res.user);
  return res.user;
}

// 🚪 выход
function logout() {
  clearAuth();
  location.reload();
}

/* ---------- export ---------- */

window.CrossflagAuth = {
  restoreSession,
  requestLoginCode,
  verifyLoginCode,
  logout,
  getUser: getAuthUser,
};
