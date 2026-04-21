var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var USDT_TRON_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
function toDec6(amountStr) {
  const s = String(amountStr || "0").trim();
  if (!s) return 0;
  const neg = s.startsWith("-");
  const x = neg ? s.slice(1) : s;
  const [a0, b0 = ""] = x.split(".");
  const a = Number(a0 || 0);
  if (!Number.isFinite(a)) return 0;
  const b = (b0 + "000000").slice(0, 6);
  const v = a * 1e6 + Number(b || 0);
  return neg ? -v : v;
}
__name(toDec6, "toDec6");
__name2(toDec6, "toDec6");
async function tronApiGet(url, env) {
  const headers = { Accept: "application/json" };
  if (env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = env.TRONGRID_API_KEY;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`TronGrid ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}
__name(tronApiGet, "tronApiGet");
__name2(tronApiGet, "tronApiGet");

async function expireBuyAmountBroadcasts(env) {
  const DB = env.DB;
  const TOKEN = env.TG_BOT_TOKEN;
  if (!DB || !TOKEN) return;
  const TTL = 60 * 60 * 1e3;
  const WINDOW = 2 * 60 * 1e3;
  const ts = Date.now();
  const items = await DB.get("buyAmountRequests", { type: "json" });
  const arr = Array.isArray(items) ? items : [];
  for (const rec of arr) {
    if (!rec || !rec.id) continue;
    const st = String(rec.status || "").toUpperCase();
    if (st !== "PENDING") continue;
    const age = ts - Number(rec.createdAt || 0);
    if (age < TTL || age > TTL + WINDOW) continue;
    const refsKey = "buyAmountBroadcastRefs:" + String(rec.id);
    const refsRaw = await DB.get(refsKey, { type: "json" });
    const refs = Array.isArray(refsRaw) ? refsRaw : [];
    if (!refs.length) continue;
    const minRub = Number(rec.minRub || 0);
    const maxRub = Number(rec.maxRub || 0);
    const uname = String(rec.user && rec.user.username ? rec.user.username : "").replace(/^@/, "");
    const uid = String(rec.user && rec.user.id ? rec.user.id : "").trim();
    const who = uname ? "@" + uname : uid ? "tgId: " + uid : "\u2014";
    const text = [
      "\u041A\u043B\u0438\u0435\u043D\u0442 \u043E\u0441\u0442\u0430\u0432\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0432\u044B\u043F\u043B\u0430\u0442\u0443:",
      "\u041A\u043B\u0438\u0435\u043D\u0442: " + who,
      "\u0421\u0442\u0430\u0442\u0443\u0441: \u043D\u0435\u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E \u274C",
      "\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0441\u0443\u043C\u043C\u044B: " + String(minRub) + " \u2014 " + String(maxRub) + " RUB",
      "",
      "\u0415\u0441\u043B\u0438 \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u0432\u044B\u043F\u043B\u0430\u0442\u0430, \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442\u043D\u044B\u043C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C:",
      "",
      "\u0421\u0443\u043C\u043C\u0430",
      "\u0431\u0430\u043D\u043A",
      "\u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442",
      "\u043A\u0443\u0440\u0441"
    ].join("\n");
    for (const ref of refs) {
      try {
        await fetch("https://api.telegram.org/bot" + TOKEN + "/editMessageText", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: String(ref.chatId),
            message_id: Number(ref.messageId),
            text,
            disable_web_page_preview: true
          })
        });
      } catch (_) {
      }
    }
  }
}
__name(expireBuyAmountBroadcasts, "expireBuyAmountBroadcasts");
__name2(expireBuyAmountBroadcasts, "expireBuyAmountBroadcasts");
var ReservationsDO = class {
  static {
    __name(this, "ReservationsDO");
  }
  static {
    __name2(this, "ReservationsDO");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  // ===== helpers (KV user lookup) =====
  _userKeyById(id) {
    return `user:id:${id}`;
  }
  _userKeyByUsername(un) {
    return `user:username:${un}`;
  }
  async _readJsonKV(key, fallback) {
    try {
      const v = await this.env.DB.get(key);
      if (!v) return fallback;
      return JSON.parse(v);
    } catch {
      return fallback;
    }
  }
  _normalizePrivateNotifyUser(rec) {
    if (!rec) return null;
    const dmChatId = String(rec.dmChatId || "").trim();
    const legacyChatId = String(rec.chatId || "").trim();
    const chatType = String(rec.chatType || "").toLowerCase();
    if (dmChatId) return { ...rec, chatId: dmChatId };
    if (chatType === "private" && legacyChatId) return { ...rec, chatId: legacyChatId };
    if (legacyChatId && !legacyChatId.startsWith("-")) return { ...rec, chatId: legacyChatId };
    return null;
  }
  async _tgSendMessage(chatId, text) {
    if (!this.env.TG_BOT_TOKEN) return false;
    const res = await fetch(`https://api.telegram.org/bot${this.env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: String(text || "").slice(0, 3900), disable_web_page_preview: true })
    });
    const j = await res.json().catch(() => null);
    return !!(j && j.ok);
  }
  async _findUserForNotify(userShape) {
    try {
      if (!userShape) return null;
      const uid = userShape.id != null ? String(userShape.id) : "";
      const un = userShape.username != null ? String(userShape.username).replace(/^@/, "") : "";
      if (uid) {
        const rec = await this._readJsonKV(this._userKeyById(uid), null);
        const safe = this._normalizePrivateNotifyUser(rec);
        if (safe && !safe.banned) return safe;
      }
      if (un) {
        const map = await this._readJsonKV(this._userKeyByUsername(un), null);
        const id2 = map && map.userId ? String(map.userId) : "";
        if (id2) {
          const rec = await this._readJsonKV(this._userKeyById(id2), null);
          const safe = this._normalizePrivateNotifyUser(rec);
          if (safe && !safe.banned) return safe;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  async _notifyUser(userShape, text) {
    const u = await this._findUserForNotify(userShape);
    if (!u || !u.chatId) return false;
    return this._tgSendMessage(u.chatId, text);
  }
  async _loadWatchers() {
    const w = await this.state.storage.get("watchers");
    return Array.isArray(w) ? w : [];
  }
  // ===== BUY offer locks (atomic via DO) =====
  async _loadBuyLocks() {
    const v = await this.state.storage.get("buyLocks");
    return v && typeof v === "object" ? v : {};
  }
  async _saveBuyLocks(obj) {
    await this.state.storage.put("buyLocks", obj);
  }
  _cleanupExpiredLocks(locks) {
    const now = Date.now();
    let changed = false;
    for (const [offerId, rec] of Object.entries(locks || {})) {
      if (!rec) continue;
      const exp = Number(rec.expiresAt || 0);
      if (exp && now > exp) {
        delete locks[offerId];
        changed = true;
      }
    }
    return changed;
  }
  async _saveWatchers(arr) {
    await this.state.storage.put("watchers", arr);
  }
  async _rearmAlarm(watchers) {
    const now = Date.now();
    let next = null;
    for (const w of watchers) {
      if (!w || w.status !== "PENDING") continue;
      const t = Number(w.createdAt || 0) + 60 * 60 * 1e3;
      if (!Number.isFinite(t) || t <= 0) continue;
      if (t <= now) {
        next = now + 1e3;
        break;
      }
      if (next == null || t < next) next = t;
    }
    if (next != null) {
      await this.state.storage.setAlarm(next);
    }
  }
  async alarm() {
    const watchers = await this._loadWatchers();
    const now = Date.now();
    const keep = [];
    for (const w of watchers) {
      if (!w || w.status !== "PENDING") continue;
      const createdAt = Number(w.createdAt || 0);
      if (!createdAt) continue;
      if (now - createdAt >= 60 * 60 * 1e3) {
        continue;
      }
      keep.push(w);
    }
    await this._saveWatchers(keep);
    await this._rearmAlarm(keep);
  }
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname || "/";
    if (path === "/add" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "");
      const user = body.user || null;
      const minRub = Math.floor(Number(body.minRub ?? 0));
      const maxRub = Math.floor(Number(body.maxRub ?? 0));
      const createdAt = Number(body.createdAt || Date.now());
      if (!id) return new Response(JSON.stringify({ ok: false, error: "Missing id" }), { status: 400 });
      if (!Number.isFinite(minRub) || !Number.isFinite(maxRub) || minRub <= 0 || maxRub <= 0 || minRub > maxRub) {
        return new Response(JSON.stringify({ ok: false, error: "Bad range" }), { status: 400 });
      }
      let watchers = await this._loadWatchers();
      const uid = user && user.id != null ? String(user.id) : "";
      if (uid) watchers = watchers.filter((w) => !(w && w.status === "PENDING" && w.user && String(w.user.id || "") === uid));
      watchers.unshift({
        id,
        user,
        minRub,
        maxRub,
        createdAt,
        status: "PENDING"
      });
      if (watchers.length > 5e3) watchers = watchers.slice(0, 5e3);
      await this._saveWatchers(watchers);
      await this._rearmAlarm(watchers);
      return new Response(JSON.stringify({ ok: true }));
    }
    if (path === "/match" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const offer = body.offer || body || {};
      const amountRub = Number(offer.amountRub);
      if (!Number.isFinite(amountRub) || amountRub <= 0) {
        return new Response(JSON.stringify({ ok: false, error: "Bad offer amount" }), { status: 400 });
      }
      let watchers = await this._loadWatchers();
      const keep = [];
      for (const w of watchers) {
        if (!w || w.status !== "PENDING") continue;
        if (Date.now() - Number(w.createdAt || 0) >= 60 * 60 * 1e3) {
          continue;
        }
        const minRub = Number(w.minRub);
        const maxRub = Number(w.maxRub);
        if (Number.isFinite(minRub) && Number.isFinite(maxRub) && amountRub >= minRub && amountRub <= maxRub) {
          const rate = offer.rate != null ? String(offer.rate) : "\u2014";
          const bank = offer.payBank ? String(offer.payBank) : "";
          const oid = offer.id ? String(offer.id) : "";
          const lines = [];
          lines.push(`\u{1F3AF} \u041D\u0430\u0448\u043B\u0430\u0441\u044C \u0437\u0430\u044F\u0432\u043A\u0430 \u043F\u043E\u0434 \u0442\u0432\u043E\u0439 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D! \u2705`);
          lines.push(`\u{1F4B5} \u0421\u0443\u043C\u043C\u0430: ${Math.round(amountRub).toLocaleString("ru-RU")} \u20BD`);
          if (rate && rate !== "\u2014") lines.push(`\u{1F4B1} \u041A\u0443\u0440\u0441: ${rate}`);
          if (bank) lines.push(`\u{1F3E6} \u0411\u0430\u043D\u043A: ${bank}`);
          if (oid) lines.push(`\u{1F9FE} BUY ${oid}`);
          await this._notifyUser(w.user || null, lines.join("\n"));
          keep.push(w);
          continue;
        }
        keep.push(w);
      }
      await this._saveWatchers(keep);
      await this._rearmAlarm(keep);
      return new Response(JSON.stringify({ ok: true, left: keep.length }));
    }
    if (path === "/claim_buy" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const offerId = String(body.offerId || body.id || "").trim();
      const reserveIdIn = String(body.reserveId || "").trim();
      const user = body.user || null;
      const ttlMs = Math.max(3e4, Math.min(60 * 60 * 1e3, Number(body.ttlMs || 20 * 60 * 1e3)));
      if (!offerId) {
        return new Response(JSON.stringify({ ok: false, error: "Missing offerId" }), { status: 400 });
      }
      const locks = await this._loadBuyLocks();
      const changed = this._cleanupExpiredLocks(locks);
      const now = Date.now();
      const meId = user && user.id != null ? String(user.id) : "";
      const meUn = user && user.username != null ? String(user.username).replace(/^@/, "") : "";
      const cur = locks[offerId] || null;
      const curReserveId = cur && cur.reserveId ? String(cur.reserveId) : "";
      const curUserId = cur && cur.user && cur.user.id != null ? String(cur.user.id) : "";
      const curUserUn = cur && cur.user && cur.user.username != null ? String(cur.user.username).replace(/^@/, "") : "";
      const sameUser = !!meId && meId === curUserId || !!meUn && !!curUserUn && meUn === curUserUn;
      if (cur && Number(cur.expiresAt || 0) > now) {
        if (reserveIdIn && reserveIdIn === curReserveId || !reserveIdIn && sameUser) {
          cur.lastSeenAt = now;
          // Keep original expiresAt — only extend if less than 3 min remain
          const msLeft = Number(cur.expiresAt || 0) - now;
          if (msLeft < 3 * 60 * 1000) {
            cur.expiresAt = now + ttlMs;
          }
          if (user && (meId || meUn)) cur.user = user;
          locks[offerId] = cur;
          await this._saveBuyLocks(locks);
          return new Response(JSON.stringify({ ok: true, reserved: true, isNew: false, reserveId: curReserveId, expiresAt: cur.expiresAt }));
        }
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Offer is reserved",
            reserved: true,
            reserveId: curReserveId,
            expiresAt: cur.expiresAt,
            owner: cur.user || null
          }),
          { status: 409 }
        );
      }
      const finalReserveId = reserveIdIn || "r_" + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
      const rec = {
        offerId,
        reserveId: finalReserveId,
        user: user && (meId || meUn) ? user : null,
        ts: now,
        lastSeenAt: now,
        expiresAt: now + ttlMs
      };
      locks[offerId] = rec;
      await this._saveBuyLocks(locks);
      return new Response(JSON.stringify({ ok: true, reserved: true, isNew: true, reserveId: finalReserveId, expiresAt: rec.expiresAt }));
    }
    if (path === "/release_buy" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const offerId = String(body.offerId || body.id || "").trim();
      const reserveId = String(body.reserveId || "").trim();
      if (!offerId || !reserveId) {
        return new Response(JSON.stringify({ ok: false, error: "Missing offerId or reserveId" }), { status: 400 });
      }
      const locks = await this._loadBuyLocks();
      const changed = this._cleanupExpiredLocks(locks);
      const cur = locks[offerId] || null;
      if (cur && String(cur.reserveId || "") === reserveId) {
        delete locks[offerId];
        await this._saveBuyLocks(locks);
        return new Response(JSON.stringify({ ok: true, released: true }));
      }
      if (changed) await this._saveBuyLocks(locks);
      return new Response(JSON.stringify({ ok: true, released: false }));
    }
    if (path === "/buy_lock_status" && request.method === "GET") {
      const idsParam = (url.searchParams.get("ids") || "").trim();
      const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200) : [];
      const locks = await this._loadBuyLocks();
      const changed = this._cleanupExpiredLocks(locks);
      if (changed) await this._saveBuyLocks(locks);
      const now = Date.now();
      const out = {};
      for (const id of ids) {
        const cur = locks[id] || null;
        if (cur && Number(cur.expiresAt || 0) > now) {
          out[id] = { reserved: true, expiresAt: Number(cur.expiresAt || 0), reserveId: String(cur.reserveId || "") };
        } else {
          out[id] = { reserved: false };
        }
      }
      return new Response(JSON.stringify({ ok: true, locks: out }), { headers: { "Content-Type": "application/json; charset=utf-8" } });
    }
    return new Response("ok");
  }
};
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOriginsList = env.ALLOWED_ORIGINS ? JSON.parse(env.ALLOWED_ORIGINS) : ["https://crossflag.org", "https://www.crossflag.org", "https://api.crossflag.org", "https://zalupinenko.github.io"];
    const allowed = /* @__PURE__ */ new Set(allowedOriginsList);
    const allowOrigin = allowed.has(origin) ? origin : null;
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowOrigin || "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Origin, X-Admin-Token, X-Scanner-Token, X-Tg-Init-Data, X-User-Token, X-Auth-Token",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const json = /* @__PURE__ */ __name2((obj, status = 200, extraHeaders = {}) => new Response(JSON.stringify(obj), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...corsHeaders,
        ...extraHeaders
      }
    }), "json");
    const bad = /* @__PURE__ */ __name2((msg, status = 400) => json({ ok: false, error: msg }, status), "bad");
    const now = /* @__PURE__ */ __name2(() => Date.now(), "now");
    const randId = /* @__PURE__ */ __name2((len = 12) => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let s = "";
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }, "randId");
    const requireAdmin = /* @__PURE__ */ __name2(() => {
      const token = request.headers.get("X-Admin-Token") || "";
      if (!env.ADMIN_TOKEN) throw new Error("ADMIN_TOKEN is not set");
      return token === env.ADMIN_TOKEN;
    }, "requireAdmin");
    const requireScanner = /* @__PURE__ */ __name2(() => {
      const token = request.headers.get("X-Scanner-Token") || "";
      if (!env.SCANNER_TOKEN) throw new Error("SCANNER_TOKEN is not set");
      return token === env.SCANNER_TOKEN;
    }, "requireScanner");
    const readJsonKV = /* @__PURE__ */ __name2(async (key, fallback) => {
      const v = await env.DB.get(key);
      if (!v) return fallback;
      try {
        return JSON.parse(v);
      } catch {
        return fallback;
      }
    }, "readJsonKV");
    const writeJsonKV = /* @__PURE__ */ __name2(async (key, obj, opts) => {
      if (opts) return env.DB.put(key, JSON.stringify(obj), opts);
      return env.DB.put(key, JSON.stringify(obj));
    }, "writeJsonKV");
    const d1 = env.us_bal_wal;
    if (!d1) throw new Error("D1 binding 'us_bal_wal' is not set");
    const WALLET_ASSET = "USDT";
    const WALLET_NETWORK = "TRON";
    

    async function getBalanceDec6(userId) {
      const row = await d1.prepare("SELECT usdt_trc20_balance FROM user_balances WHERE user_id=?").bind(String(userId)).first();
      return row ? Number(row.usdt_trc20_balance || 0) : 0;
    }
    __name(getBalanceDec6, "getBalanceDec6");
    __name2(getBalanceDec6, "getBalanceDec6");
    async function creditBuyOfferToWalletBalance(offer) {
      try {
        if (!offer) return false;
        const offerId = String(offer.id || "").trim();
        if (!offerId) return false;
        const doneKey = `buy:walletCredited:${offerId}`;
        const already = await env.DB.get(doneKey);
        if (already) return true;
        let userId = offer.user && offer.user.id ? String(offer.user.id).trim() : "";
        if (!userId) {
          const reserves = await readJsonKV("reserves", {});
          const r = reserves && reserves[offerId] ? reserves[offerId] : null;
          if (r && r.user && r.user.id) userId = String(r.user.id).trim();
        }
        if (!userId) {
          return false;
        }
        const amountRub = Number(offer.amountRub || 0);
        const rate = Number(offer.rate || 0);
        if (!Number.isFinite(amountRub) || amountRub <= 0) return false;
        if (!Number.isFinite(rate) || rate <= 0) return false;
        const usdt = amountRub / rate;
        const amountE6 = Math.trunc(usdt * 1e6);
        if (amountE6 <= 0) return false;
        await d1.prepare(
          "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
        ).bind(userId, now()).run();
        await d1.prepare(
          "UPDATE user_balances SET usdt_trc20_balance = usdt_trc20_balance + ?, updated_at=? WHERE user_id=?"
        ).bind(amountE6, now(), userId).run();
        await env.DB.put(doneKey, JSON.stringify({ ts: now(), userId, amountE6 }), {
          expirationTtl: 3600 * 24 * 180
          // 180 дней
        });
        offer.walletCreditedAt = now();
        offer.walletCreditedE6 = amountE6;
        return true;
      } catch {
        return false;
      }
    }
    __name(creditBuyOfferToWalletBalance, "creditBuyOfferToWalletBalance");
    __name2(creditBuyOfferToWalletBalance, "creditBuyOfferToWalletBalance");
    async function appendWalletLedgerEntries(entries) {
      try {
        const key = "walletLedger";
        const items = await readJsonKV(key, []);
        const arr = Array.isArray(items) ? items : [];
        for (const e of Array.isArray(entries) ? entries : []) {
          if (!e || !e.userId) continue;
          arr.unshift({ ...e, ts: Number(e.ts || now()) || now() });
        }
        await writeJsonKV(key, arr.slice(0, 5e3));
      } catch {
      }
    }
    __name(appendWalletLedgerEntries, "appendWalletLedgerEntries");
    __name2(appendWalletLedgerEntries, "appendWalletLedgerEntries");
    async function settleQrBuyOfferTransfer(offer) {
      try {
        if (!offer || !offer.qrOrder) return { ok: false, error: "NOT_QR_ORDER" };
        const offerId = String(offer.id || "").trim();
        if (!offerId) return { ok: false, error: "MISSING_ID" };
        const doneKey = `buy:qrSettled:${offerId}`;
        const already = await env.DB.get(doneKey);
        if (already) return { ok: true, already: true };
        const creatorId = String(
          offer?.qrOrder?.createdBy?.id || offer?.user?.id || ""
        ).trim();
        let executorId = String(
          offer?.executorUser?.id || ""
        ).trim();
        if (!executorId) {
          const reserves = await readJsonKV("reserves", {});
          const r = reserves && reserves[offerId] ? reserves[offerId] : null;
          executorId = String(r?.user?.id || "").trim();
        }
        if (!creatorId) return { ok: false, error: "CREATOR_NOT_FOUND" };
        if (!executorId) return { ok: false, error: "EXECUTOR_NOT_FOUND" };
        if (creatorId === executorId) return { ok: false, error: "SAME_USER" };
        let amountE6 = Math.trunc(Number(offer?.qrOrder?.usdtAmount || 0) * 1e6);
        if (!(amountE6 > 0)) {
          const amountRub = Number(offer.amountRub || 0);
          const rate = Number(offer.rate || 0);
          if (!Number.isFinite(amountRub) || amountRub <= 0) return { ok: false, error: "BAD_AMOUNT" };
          if (!Number.isFinite(rate) || rate <= 0) return { ok: false, error: "BAD_RATE" };
          amountE6 = Math.trunc(amountRub / rate * 1e6);
        }
        if (!(amountE6 > 0)) return { ok: false, error: "BAD_USDT" };
        const ts = now();
        await d1.prepare(
          "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
        ).bind(executorId, ts).run();
        const creatorSpend = await spendQrCashbackAndWallet({
          userId: creatorId,
          amountDec6: amountE6,
          offerId
        });
        if (!creatorSpend?.ok) {
          return {
            ok: false,
            error: creatorSpend?.error || "INSUFFICIENT_BALANCE",
            amountE6,
            creatorId,
            executorId
          };
        }
        await d1.prepare(
          "UPDATE user_balances SET usdt_trc20_balance = usdt_trc20_balance + ?, updated_at=? WHERE user_id=?"
        ).bind(amountE6, ts, executorId).run();
        await env.DB.put(doneKey, JSON.stringify({ ts, creatorId, executorId, amountE6 }), {
          expirationTtl: 3600 * 24 * 180
        });
        offer.qrOrder = offer.qrOrder || {};
        offer.qrOrder.settledAt = ts;
        offer.qrOrder.settledAmountE6 = amountE6;
        offer.qrOrder.creatorDebited = true;
        offer.qrOrder.executorCredited = true;
        offer.qrOrder.cashbackUsedE6 = Number(creatorSpend?.cashbackUsedDec6 || 0) || 0;
        offer.qrOrder.walletUsedE6 = Number(creatorSpend?.walletUsedDec6 || 0) || 0;
        await appendWalletLedgerEntries([
          {
            id: `qrpay-debit-${offerId}`,
            userId: creatorId,
            kind: "QR_PAY",
            dec6: -Math.abs(amountE6),
            ts,
            note: `\u041E\u043F\u043B\u0430\u0442\u0430 QR \u2022 BUY ${offerId}`,
            offerId,
            cashbackUsedE6: Number(creatorSpend?.cashbackUsedDec6 || 0) || 0,
            walletUsedE6: Number(creatorSpend?.walletUsedDec6 || 0) || 0
          },
          {
            id: `qrpay-credit-${offerId}`,
            userId: executorId,
            kind: "QR_SELL",
            dec6: Math.abs(amountE6),
            ts,
            note: `\u041E\u043F\u043B\u0430\u0442\u0430 QR \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430 \u2022 BUY ${offerId}`,
            offerId
          }
        ]);
        return {
          ok: true,
          amountE6,
          creatorId,
          executorId,
          cashbackUsedDec6: Number(creatorSpend?.cashbackUsedDec6 || 0) || 0,
          walletUsedDec6: Number(creatorSpend?.walletUsedDec6 || 0) || 0
        };
      } catch (e) {
        return { ok: false, error: e?.message || "QR_SETTLE_FAILED" };
      }
    }
    __name(settleQrBuyOfferTransfer, "settleQrBuyOfferTransfer");
    __name2(settleQrBuyOfferTransfer, "settleQrBuyOfferTransfer");
    function formatDec6(n) {
      const sign = n < 0 ? "-" : "";
      n = Math.abs(Math.trunc(n));
      const a = Math.floor(n / 1e6);
      const b = String(n % 1e6).padStart(6, "0");
      return `${sign}${a}.${b}`;
    }
    __name(formatDec6, "formatDec6");
    __name2(formatDec6, "formatDec6");
    const BUY_BYBIT_STATUSES = /* @__PURE__ */ new Set([
      "NEW",
      "BYBIT_CREATING",
      "BYBIT",
      "BYBIT_MATCHED",
      "BYBIT_DONE",
      "BYBIT_CANCELED",
      "ERROR"
    ]);
    function normalizeBybitStatus(s) {
      const x = String(s || "").toUpperCase().trim();
      return BUY_BYBIT_STATUSES.has(x) ? x : "NEW";
    }
    __name(normalizeBybitStatus, "normalizeBybitStatus");
    __name2(normalizeBybitStatus, "normalizeBybitStatus");
    function ensureBybitObj(o) {
      if (!o.bybit || typeof o.bybit !== "object") {
        o.bybit = {
          status: "NEW",
          adId: null,
          orderId: null,
          cryptoAmount: null,
          minFiat: null,
          maxFiat: null,
          note: null,
          updatedAt: null,
          error: null
        };
      }
      o.bybit.status = normalizeBybitStatus(o.bybit.status || o.status || "NEW");
      return o;
    }
    __name(ensureBybitObj, "ensureBybitObj");
    __name2(ensureBybitObj, "ensureBybitObj");
    const USER_TOKEN_TTL_SEC = Number(env.USER_TOKEN_TTL_SEC || 2592e3);
    const normUsername = /* @__PURE__ */ __name2((u) => {
      u = String(u || "").trim();
      if (!u) return "";
      if (u.startsWith("@")) u = u.slice(1);
      u = u.trim();
      if (!/^[a-zA-Z0-9_]{5,32}$/.test(u)) return "";
      return u;
    }, "normUsername");
    const code6 = /* @__PURE__ */ __name2(() => String(Math.floor(1e5 + Math.random() * 9e5)), "code6");
    const sha256Hex = /* @__PURE__ */ __name2(async (str) => {
      const enc = new TextEncoder().encode(str);
      const buf = await crypto.subtle.digest("SHA-256", enc);
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }, "sha256Hex");
    function normRefCode(code) {
      code = String(code || "").trim().toUpperCase();
      code = code.replace(/[^A-Z0-9]/g, "");
      return code;
    }
    __name(normRefCode, "normRefCode");
    __name2(normRefCode, "normRefCode");
    const REF_PREFIX = "CF";
    async function ensureUserRef(user) {
      if (!user) return user;
      if (!user.ref || typeof user.ref !== "object") user.ref = {};
      if (!user.ref.code) {
        const salt = String(env.REF_SALT || "");
        const h = await sha256Hex(salt + ":" + String(user.id || ""));
        const code = (REF_PREFIX + h.slice(0, 10)).toUpperCase();
        user.ref.code = code;
        await writeJsonKV(`ref:code:${code}`, { userId: String(user.id) });
      }
      return user;
    }
    __name(ensureUserRef, "ensureUserRef");
    __name2(ensureUserRef, "ensureUserRef");
    async function ensureUserRefOnMe(user) {
      return await ensureUserRef(user);
    }
    __name(ensureUserRefOnMe, "ensureUserRefOnMe");
    __name2(ensureUserRefOnMe, "ensureUserRefOnMe");
    const userKeyById = /* @__PURE__ */ __name2((id) => `user:id:${id}`, "userKeyById");
    const userKeyByUsername = /* @__PURE__ */ __name2((u) => `user:username:${String(u || "").toLowerCase()}`, "userKeyByUsername");
    const userIndexKey = `users:index`;
    const userSessionKey = /* @__PURE__ */ __name2((tok) => `user:session:${tok}`, "userSessionKey");
    const regCodeKey = /* @__PURE__ */ __name2((u) => `user:regcode:${String(u || "").toLowerCase()}`, "regCodeKey");
    const addUserToIndex = /* @__PURE__ */ __name2(async (userId) => {
      const idx = await readJsonKV(userIndexKey, []);
      if (!Array.isArray(idx)) return;
      if (!idx.includes(userId)) {
        idx.unshift(userId);
        await writeJsonKV(userIndexKey, idx.slice(0, 5e4));
      }
    }, "addUserToIndex");
    const readUserToken = /* @__PURE__ */ __name2(async (req) => {
      const h = req.headers.get("Authorization") || "";
      let tok = req.headers.get("X-User-Token") || req.headers.get("X-Auth-Token") || "";
      if (!tok && /^bearer\s+/i.test(h)) tok = h.replace(/^bearer\s+/i, "").trim();
      if (!tok) return null;
      const sess = await readJsonKV(userSessionKey(tok), null);
      if (!sess || !sess.userId) return null;
      const user = await readJsonKV(userKeyById(sess.userId), null);
      if (!user) return null;
      if (user.banned) return { ok: false, error: "Banned" };
      return { ok: true, user, token: tok };
    }, "readUserToken");
    const tgSendMessage = /* @__PURE__ */ __name2(async (chatId, text) => {
      if (!env.TG_BOT_TOKEN) throw new Error("TG_BOT_TOKEN is not set");
      const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
      });
      const j = await res.json().catch(() => null);
      if (!j || !j.ok) throw new Error("Telegram sendMessage error: " + (j?.description || "unknown"));
      return true;
    }, "tgSendMessage");
    const tgSendMessageEx = /* @__PURE__ */ __name2(async (chatId, text, extra = {}) => {
      if (!env.TG_BOT_TOKEN) throw new Error("TG_BOT_TOKEN is not set");
      const payload = {
        chat_id: chatId,
        text: String(text || "").slice(0, 3900),
        disable_web_page_preview: true,
        ...extra
      };
      const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await res.json().catch(() => null);
      if (!j || !j.ok) {
        throw new Error("Telegram sendMessage error: " + (j?.description || "unknown"));
      }
      return j.result || null;
    }, "tgSendMessageEx");
    async function tgApi(method, payload, isForm = false) {
      if (!env.TG_BOT_TOKEN) throw new Error("TG_BOT_TOKEN is not set");
      const res = await fetch(
        `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${method}`,
        isForm ? { method: "POST", body: payload } : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      const j = await res.json().catch(() => null);
      if (!j || !j.ok) {
        throw new Error(`Telegram ${method} error: ${j?.description || res.status}`);
      }
      return j.result || null;
    }
    __name(tgApi, "tgApi");
    __name2(tgApi, "tgApi");
    async function tgSendFileToChat(chatId, kind, file, filename, extra = {}) {
      if (!env.TG_BOT_TOKEN || !chatId) return null;
      const isVideo = kind === "video";
      const isPhoto = kind === "photo";
      const endpoint = isVideo ? "sendVideo" : isPhoto ? "sendPhoto" : "sendDocument";
      const field = isVideo ? "video" : isPhoto ? "photo" : "document";
      const fd = new FormData();
      fd.set("chat_id", String(chatId));
      fd.set(field, file, filename);
      if (isVideo) fd.set("supports_streaming", "true");
      for (const [k, v] of Object.entries(extra || {})) {
        if (v == null || v === "") continue;
        fd.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
      const msg = await tgApi(endpoint, fd, true);
      return {
        messageId: msg?.message_id || null,
        chatId: msg?.chat?.id != null ? String(msg.chat.id) : String(chatId)
      };
    }
    __name(tgSendFileToChat, "tgSendFileToChat");
    __name2(tgSendFileToChat, "tgSendFileToChat");
    async function tgSendFile(kind, file, filename) {
      if (!env.TG_CHAT_ID) return null;
      return await tgSendFileToChat(env.TG_CHAT_ID, kind, file, filename);
    }
    __name(tgSendFile, "tgSendFile");
    __name2(tgSendFile, "tgSendFile");
    function afHashCode(str) {
      let h = 2654435769;
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 2246822507);
        h ^= h >>> 13;
      }
      return h >>> 0;
    }
    __name(afHashCode, "afHashCode");
    function afRand(seed) {
      const x = Math.sin(seed + 1) * 1e4;
      return x - Math.floor(x);
    }
    __name(afRand, "afRand");
    function computeTrustTier(user) {
      const score = Number(user?.trustScore || 0);
      const completed = Number(user?.buyStats?.totalCompleted || 0);
      if (score >= 55 && completed >= 31) return 4;
      if (score >= 30 && completed >= 16) return 3;
      if (score >= 15 && completed >= 6) return 2;
      if (score >= 5 && completed >= 1) return 1;
      return 0;
    }
    __name(computeTrustTier, "computeTrustTier");
    function computeVerificationRequirements(user, offer, nowMs) {
      const ts = nowMs || Date.now();
      const trustTier = computeTrustTier(user);
      const amountRub = Number(offer?.amountRub || 0);
      const paidAt = Number(offer?.paidAt || 0);
      const userCreatedAt = Number(user?.createdAt || 0);
      const lastDealAt = Number(user?.lastDealAt || 0);
      const completed = Number(user?.buyStats?.totalCompleted || 0);
      let amountMod = 0;
      if (amountRub > 0 && amountRub < 5e3) amountMod = -1;
      else if (amountRub >= 2e4 && amountRub < 5e4) amountMod = 1;
      else if (amountRub >= 5e4 && amountRub < 1e5) amountMod = 2;
      else if (amountRub >= 1e5) amountMod = 10;
      const accountAgeDays = userCreatedAt > 0 ? (ts - userCreatedAt) / 864e5 : 0;
      const ageMod = accountAgeDays < 7 ? 2 : 0;
      let timeMod = 0;
      if (paidAt > 0) {
        const hrs = (ts - paidAt) / 36e5;
        if (hrs < 2) timeMod = 1;
        else if (hrs < 24) timeMod = 0;
        else if (hrs < 72) timeMod = -1;
        else if (hrs < 168) timeMod = -2;
        else timeMod = -3;
      }
      const inactivityMod = lastDealAt > 0 && ts - lastDealAt > 30 * 864e5 ? 4 : 0;
      const isRoundAmount = amountRub >= 5e3 && amountRub % 1e3 === 0;
      const forceTier0 = completed === 0 || amountRub >= 1e5 || isRoundAmount || inactivityMod > 0;
      let effectiveTier;
      if (forceTier0) {
        effectiveTier = 0;
      } else {
        effectiveTier = Math.max(0, Math.min(4, trustTier + amountMod + ageMod + timeMod));
      }
      const dayBucket = Math.floor(ts / 864e5);
      const seed = afHashCode(String(user?.id || "anon") + "|" + String(offer?.id || "") + "|" + String(dayBucket));
      const lastVerifAt = Number(user?.lastVerificationAt || 0);
      const spacingFactor = lastVerifAt > 0 && ts - lastVerifAt < 1728e5 ? 0.6 : 1;
      const phantom = !forceTier0 && afRand(seed + 777) < 0.08;
      const photoProbs = [1, 1, 0.55, 0.25, 0.1];
      const videoProbs = [1, 0.65, 0.2, 0.06, 0.02];
      let requirePhoto = false;
      if (!phantom) {
        requirePhoto = forceTier0 || afRand(seed + 1) < photoProbs[effectiveTier] * spacingFactor;
      }
      return { requirePdf: true, requirePhoto, requireVideo: false, effectiveTier, trustTier, phantom, forceTier0 };
    }
    __name(computeVerificationRequirements, "computeVerificationRequirements");
    async function tgAnswerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
      try {
        return await tgApi("answerCallbackQuery", {
          callback_query_id: String(callbackQueryId || ""),
          text: String(text || "").slice(0, 180),
          show_alert: !!showAlert
        });
      } catch {
        return null;
      }
    }
    __name(tgAnswerCallbackQuery, "tgAnswerCallbackQuery");
    __name2(tgAnswerCallbackQuery, "tgAnswerCallbackQuery");
    async function tgClearInlineButtons(chatId, messageId) {
      try {
        return await tgApi("editMessageReplyMarkup", {
          chat_id: String(chatId),
          message_id: Number(messageId),
          reply_markup: { inline_keyboard: [] }
        });
      } catch {
        return null;
      }
    }
    __name(tgClearInlineButtons, "tgClearInlineButtons");
    __name2(tgClearInlineButtons, "tgClearInlineButtons");
    const TG_NOTIFY_ENABLED = String(env.TG_NOTIFY_ENABLED ?? "1") !== "0";
    const TG_ADMIN_CHAT_ID = String(env.TG_CHAT_ID || "").trim();
    const escHtml = /* @__PURE__ */ __name2((s) => String(s ?? "").replace(
      /[&<>"']/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch]
    ), "escHtml");
    const fmtTs = /* @__PURE__ */ __name2((ts) => {
      try {
        return new Date(ts || Date.now()).toLocaleString("ru-RU");
      } catch {
        return String(ts || "");
      }
    }, "fmtTs");
    const actorText = /* @__PURE__ */ __name2((u) => {
      if (!u) return "\u2014";
      const uname = u.username ? "@" + String(u.username).replace(/^@/, "") : "";
      const uid = u.id ? String(u.id) : "";
      if (uname && uid) return `${uname} (tgId: <code>${escHtml(uid)}</code>)`;
      if (uname) return uname;
      if (uid) return `tgId: <code>${escHtml(uid)}</code>`;
      return "\u2014";
    }, "actorText");
    const reqMeta = /* @__PURE__ */ __name2((req) => ({
      ip: req.headers.get("CF-Connecting-IP") || "",
      country: req.headers.get("CF-IPCountry") || ""
    }), "reqMeta");
    const tgAdminSend = /* @__PURE__ */ __name2(async (html, replyMarkup) => {
      try {
        if (!TG_NOTIFY_ENABLED) return false;
        if (!env.TG_BOT_TOKEN || !TG_ADMIN_CHAT_ID) return false;
        const body = {
          chat_id: TG_ADMIN_CHAT_ID,
          text: String(html || "").slice(0, 3900),
          parse_mode: "HTML",
          disable_web_page_preview: true
        };
        if (replyMarkup) body.reply_markup = replyMarkup;
        const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const j = await res.json().catch(() => null);
        return !!(j && j.ok);
      } catch {
        return false;
      }
    }, "tgAdminSend");
    if (url.pathname === "/api/admin/broadcast_photo" && request.method === "POST") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const tgSendMessage2 = /* @__PURE__ */ __name2(async (chatId, text2) => {
        if (!env.TG_BOT_TOKEN) throw new Error("TG_BOT_TOKEN is not set");
        const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: text2, disable_web_page_preview: true })
        });
        const j = await res.json().catch(() => null);
        if (!j || !j.ok) throw new Error("Telegram sendMessage error: " + (j?.description || "unknown"));
        return true;
      }, "tgSendMessage");
      const body = await request.json().catch(() => ({}));
      const photo = String(body.photo || "").trim();
      const text = String(body.text || body.caption || "").trim();
      if (!photo) return bad("Missing photo");
      if (!text) return bad("Missing text");
      const idx = await readJsonKV(userIndexKey, []);
      const ids = Array.isArray(idx) ? idx.slice(0, 5e4) : [];
      let total = 0;
      let sent = 0;
      let failed = 0;
      for (const id of ids) {
        total++;
        try {
          const user = await readJsonKV(userKeyById(id), null);
          if (!user || user.banned || !user.chatId) continue;
          await tgApi("sendPhoto", {
  chat_id: String(user.chatId),
  photo: String(photo),
  caption: String(text),
  disable_web_page_preview: true
});
          sent++;
        } catch {
          failed++;
        }
      }
      return json({ ok: true, total, sent, failed });
    }
    const tgNotifyAdmin = /* @__PURE__ */ __name2(async ({ title, lines = [], user, deal, step, req, buttons } = {}) => {
      const m = req ? reqMeta(req) : { ip: "", country: "" };
      const parts = [];
      parts.push(`<b>${escHtml(title || "\u0421\u043E\u0431\u044B\u0442\u0438\u0435")}</b>`);
      if (user) parts.push(`\u{1F464} ${actorText(user)}`);
      if (deal) parts.push(`\u{1F9FE} <code>${escHtml(deal)}</code>`);
      if (step) parts.push(`\u{1F4CC} ${escHtml(step)}`);
      if (m.ip) parts.push(`\u{1F310} ${escHtml(m.ip)}${m.country ? " (" + escHtml(m.country) + ")" : ""}`);
      parts.push(`\u23F1 ${escHtml(fmtTs(Date.now()))}`);
      parts.push("");
      for (const ln of lines) {
        if (!ln) continue;
        parts.push(escHtml(String(ln)));
      }
      const kb = buttons && buttons.length ? { inline_keyboard: buttons.map((b) => [{ text: String(b.text || "\u041E\u0442\u043A\u0440\u044B\u0442\u044C"), url: String(b.url || "") }]) } : null;
      return tgAdminSend(parts.join("\n"), kb);
    }, "tgNotifyAdmin");
    const fmtUsdtE6 = /* @__PURE__ */ __name2((v) => {
      const n = Number(v || 0) / 1e6;
      return `${n.toFixed(6)} USDT`;
    }, "fmtUsdtE6");
    const BUY_AMOUNT_NOTIFY_CHATS_KEY = "buyAmountNotifyChats";
const BUY_AMOUNT_ALL_CHATS_KEY = "buyAmountAllChats";
const BUY_AMOUNT_REQ_KEY = "buyAmountRequests";
const BUY_AMOUNT_BROADCAST_REFS_PREFIX = "buyAmountBroadcastRefs:";
    const normalizeTgCommand = /* @__PURE__ */ __name2((text) => String(text || "").trim().split(/\s+/)[0].split("@")[0].toLowerCase(), "normalizeTgCommand");
    async function getBuyAmountNotifyChats() {
      const arr = await readJsonKV(BUY_AMOUNT_NOTIFY_CHATS_KEY, []);
      return Array.isArray(arr) ? arr : [];
    }
    __name(getBuyAmountNotifyChats, "getBuyAmountNotifyChats");
    __name2(getBuyAmountNotifyChats, "getBuyAmountNotifyChats");
    async function saveBuyAmountNotifyChats(items) {
      const out = [];
      const seen = /* @__PURE__ */ new Set();
      for (const x of Array.isArray(items) ? items : []) {
        const chatId = String(x?.chatId || "").trim();
        if (!chatId || seen.has(chatId)) continue;
        seen.add(chatId);
        out.push({
          chatId,
          title: String(x?.title || ""),
          type: String(x?.type || ""),
          enabledAt: Number(x?.enabledAt || now()) || now(),
          enabledById: String(x?.enabledById || ""),
          enabledByUsername: String(x?.enabledByUsername || "")
        });
      }
      await writeJsonKV(BUY_AMOUNT_NOTIFY_CHATS_KEY, out.slice(0, 300));
    }

async function getAllBuyAmountChats() {
  const arr = await readJsonKV(BUY_AMOUNT_ALL_CHATS_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

async function saveAllBuyAmountChats(items) {
  const out = [];
  const seen = new Set();
  for (const x of Array.isArray(items) ? items : []) {
    const chatId = String(x?.chatId || "").trim();
    if (!chatId || seen.has(chatId)) continue;
    seen.add(chatId);
    out.push({
      chatId,
      title: String(x?.title || ""),
      type: String(x?.type || ""),
      enabledAt: Number(x?.enabledAt || now()) || now(),
      enabledById: String(x?.enabledById || ""),
      enabledByUsername: String(x?.enabledByUsername || "")
    });
  }
  await writeJsonKV(BUY_AMOUNT_ALL_CHATS_KEY, out.slice(0, 300));
}

async function rememberBuyAmountChat(chat, byUser) {
  const items = await getAllBuyAmountChats();
  const chatId = String(chat?.id || "").trim();
  if (!chatId) return false;

  const next = items.filter((x) => String(x?.chatId || "") !== chatId);
  next.unshift({
    chatId,
    title: String(chat?.title || chat?.username || chatId),
    type: String(chat?.type || ""),
    enabledAt: now(),
    enabledById: String(byUser?.id || ""),
    enabledByUsername: String(byUser?.username || "").replace(/^@/, "")
  });

  await saveAllBuyAmountChats(next);
  return true;
}

    __name(saveBuyAmountNotifyChats, "saveBuyAmountNotifyChats");
    __name2(saveBuyAmountNotifyChats, "saveBuyAmountNotifyChats");
    function buyAmountBroadcastRefsKey(requestId) {
      return BUY_AMOUNT_BROADCAST_REFS_PREFIX + String(requestId || "");
    }
    __name(buyAmountBroadcastRefsKey, "buyAmountBroadcastRefsKey");
    __name2(buyAmountBroadcastRefsKey, "buyAmountBroadcastRefsKey");
    function getBuyAmountNeed(rec) {
      return Math.max(1, Math.min(10, Math.floor(Number(rec?.count ?? 1) || 1)));
    }
    __name(getBuyAmountNeed, "getBuyAmountNeed");
    __name2(getBuyAmountNeed, "getBuyAmountNeed");
    function getBuyAmountMatched(rec) {
      const ids = Array.isArray(rec?.matchedOfferIds) ? rec.matchedOfferIds.map((x) => String(x || "")).filter(Boolean) : [];
      const fromIds = ids.length;
      const fromField = Math.max(0, Math.floor(Number(rec?.matchedOffersCount || 0) || 0));
      return Math.max(fromIds, fromField);
    }
    __name(getBuyAmountMatched, "getBuyAmountMatched");
    __name2(getBuyAmountMatched, "getBuyAmountMatched");
    const BUY_AMOUNT_REQ_TTL = 60 * 60 * 1e3;
    function isBuyAmountActual(rec) {
      if (!rec) return false;
      const st = String(rec.status || "").toUpperCase();
      if (st === "REJECTED" || st === "CANCELED" || st === "CANCELLED") return false;
      const age = now() - Number(rec.createdAt || 0);
      if (age > BUY_AMOUNT_REQ_TTL) return false;
      return getBuyAmountMatched(rec) < getBuyAmountNeed(rec);
    }
    __name(isBuyAmountActual, "isBuyAmountActual");
    __name2(isBuyAmountActual, "isBuyAmountActual");
    function renderBuyAmountChatText(rec) {
      const minRub = Number(rec?.minRub || 0);
      const maxRub = Number(rec?.maxRub || 0);
      const actual = isBuyAmountActual(rec);
      const uname = String(rec?.user?.username || "").replace(/^@/, "");
      const uid = String(rec?.user?.id || "").trim();
      const who = uname ? `@${uname}` : uid ? `tgId: ${uid}` : "\u2014";
      return [
        "\u041A\u043B\u0438\u0435\u043D\u0442 \u043E\u0441\u0442\u0430\u0432\u0438\u043B \u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0430 \u0432\u044B\u043F\u043B\u0430\u0442\u0443:",
        `\u041A\u043B\u0438\u0435\u043D\u0442: ${who}`,
        `\u0421\u0442\u0430\u0442\u0443\u0441: ${actual ? "\u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E \u2705" : "\u043D\u0435\u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E \u274C"}`,
        `\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0441\u0443\u043C\u043C\u044B: ${String(minRub)} \u2014 ${String(maxRub)} RUB`,
        "",
        "\u0415\u0441\u043B\u0438 \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u0432\u044B\u043F\u043B\u0430\u0442\u0430, \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u0442\u0432\u0435\u0442\u043D\u044B\u043C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C:",
        "",
        "\u0421\u0443\u043C\u043C\u0430",
        "\u0431\u0430\u043D\u043A",
        "\u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442",
        "\u043A\u0443\u0440\u0441"
      ].join("\n");
    }
    __name(renderBuyAmountChatText, "renderBuyAmountChatText");
    __name2(renderBuyAmountChatText, "renderBuyAmountChatText");
    async function getBuyAmountRequestById(requestId) {
      const items = await readJsonKV(BUY_AMOUNT_REQ_KEY, []);
      const arr = Array.isArray(items) ? items : [];
      const idx = arr.findIndex((x) => String(x?.id || "") === String(requestId || ""));
      return {
        items: arr,
        idx,
        rec: idx >= 0 ? arr[idx] : null
      };
    }
    __name(getBuyAmountRequestById, "getBuyAmountRequestById");
    __name2(getBuyAmountRequestById, "getBuyAmountRequestById");
    async function addBuyAmountBroadcastRef(requestId, chatId, messageId) {
      if (!requestId || !chatId || !messageId) return false;
      const key = buyAmountBroadcastRefsKey(requestId);
      const items = await readJsonKV(key, []);
      const arr = Array.isArray(items) ? items : [];
      const next = arr.filter(
        (x) => !(String(x?.chatId || "") === String(chatId) && String(x?.messageId || "") === String(messageId))
      );
      next.unshift({
        chatId: String(chatId),
        messageId: Number(messageId),
        ts: now()
      });
      await writeJsonKV(key, next.slice(0, 500), { expirationTtl: 3600 * 24 * 7 });
      return true;
    }
    __name(addBuyAmountBroadcastRef, "addBuyAmountBroadcastRef");
    __name2(addBuyAmountBroadcastRef, "addBuyAmountBroadcastRef");
    async function getBuyAmountBroadcastRefs(requestId) {
      const items = await readJsonKV(buyAmountBroadcastRefsKey(requestId), []);
      return Array.isArray(items) ? items : [];
    }
    __name(getBuyAmountBroadcastRefs, "getBuyAmountBroadcastRefs");
    __name2(getBuyAmountBroadcastRefs, "getBuyAmountBroadcastRefs");
    async function refreshBuyAmountBroadcastMessages(requestId) {
      const state = await getBuyAmountRequestById(requestId);
      if (!state.rec) return false;
      const refs = await getBuyAmountBroadcastRefs(requestId);
      if (!refs.length) return true;
      const text = renderBuyAmountChatText(state.rec);
      for (const ref of refs) {
        try {
          await tgApi("editMessageText", {
            chat_id: String(ref.chatId),
            message_id: Number(ref.messageId),
            text,
            disable_web_page_preview: true
          });
        } catch (_) {
        }
      }
      return true;
    }
    __name(refreshBuyAmountBroadcastMessages, "refreshBuyAmountBroadcastMessages");
    __name2(refreshBuyAmountBroadcastMessages, "refreshBuyAmountBroadcastMessages");
    async function registerBuyAmountMatch({ requestId, offerId, chat, from }) {
      const state = await getBuyAmountRequestById(requestId);
      if (!state.rec || state.idx < 0) {
        return { ok: false, error: "REQUEST_NOT_FOUND" };
      }
      const rec = state.rec;
      const ids = Array.isArray(rec.matchedOfferIds) ? rec.matchedOfferIds.map((x) => String(x || "")).filter(Boolean) : [];
      const cleanOfferId = String(offerId || "").trim();
      if (cleanOfferId && !ids.includes(cleanOfferId)) {
        ids.push(cleanOfferId);
      }
      rec.matchedOfferIds = ids.slice(0, 100);
      rec.matchedOffersCount = rec.matchedOfferIds.length;
      rec.updatedAt = now();
      rec.lastMatchedAt = now();
      rec.lastMatchedOfferId = cleanOfferId || null;
      rec.lastMatchedChatId = String(chat?.id || "");
      rec.lastMatchedChatTitle = String(chat?.title || chat?.username || "");
      rec.lastMatchedById = String(from?.id || "");
      rec.lastMatchedByUsername = String(from?.username || "").replace(/^@/, "");
      state.items[state.idx] = rec;
      await writeJsonKV(BUY_AMOUNT_REQ_KEY, state.items);
      await refreshBuyAmountBroadcastMessages(requestId);

      // Notify Moon Wallet if this was a MW request
      const mwTgId = rec.mwTgId || rec.user?.mwTgId || "";
      const mwWebhookBase = rec.mwWebhookBase || rec.user?.mwWebhookBase || "";
      const mwReqId = rec.mwReqId || rec.user?.mwReqId || "";
      if (mwTgId && mwWebhookBase && cleanOfferId) {
        try {
          // Get offer details from main KV
          const buyOffers = await this._readJsonKV("buyOffers", []);
          const offer = (Array.isArray(buyOffers) ? buyOffers : []).find(o => String(o.id || "") === cleanOfferId);
          const secret = String(env?.BOT_TOKEN || "").slice(0, 20); // not available in DO, leave for MW cron fallback
          await fetch(mwWebhookBase + "/api/internal/mw_match_notify", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-MW-Secret": secret },
            body: JSON.stringify({ tgId: mwTgId, reqId: mwReqId, offer: offer || { id: cleanOfferId } }),
          }).catch(() => {});
        } catch {}
      }

      return { ok: true, rec };
    }
    __name(registerBuyAmountMatch, "registerBuyAmountMatch");
    __name2(registerBuyAmountMatch, "registerBuyAmountMatch");
    async function addBuyAmountNotifyChat(chat, byUser) {
  const items = await getBuyAmountNotifyChats();
  const chatId = String(chat?.id || "").trim();
  if (!chatId) return false;

  const next = items.filter((x) => String(x?.chatId || "") !== chatId);
  next.unshift({
    chatId,
    title: String(chat?.title || chat?.username || chatId),
    type: String(chat?.type || ""),
    enabledAt: now(),
    enabledById: String(byUser?.id || ""),
    enabledByUsername: String(byUser?.username || "").replace(/^@/, "")
  });

  await saveBuyAmountNotifyChats(next);
  await rememberBuyAmountChat(chat, byUser);
  return true;
}
    __name(addBuyAmountNotifyChat, "addBuyAmountNotifyChat");
    __name2(addBuyAmountNotifyChat, "addBuyAmountNotifyChat");
    async function removeBuyAmountNotifyChat(chatId) {
      const items = await getBuyAmountNotifyChats();
      const next = items.filter((x) => String(x?.chatId || "") !== String(chatId || ""));
      await saveBuyAmountNotifyChats(next);
      return true;
    }
    __name(removeBuyAmountNotifyChat, "removeBuyAmountNotifyChat");
    __name2(removeBuyAmountNotifyChat, "removeBuyAmountNotifyChat");
    async function tgIsChatAdmin(chatId, userId) {
      if (!env.TG_BOT_TOKEN || !chatId || !userId) return false;
      const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getChatMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: String(chatId),
          user_id: String(userId)
        })
      });
      const j = await res.json().catch(() => null);
      const st = String(j?.result?.status || "").toLowerCase();
      return !!(j?.ok && (st === "creator" || st === "administrator"));
    }
    __name(tgIsChatAdmin, "tgIsChatAdmin");
    __name2(tgIsChatAdmin, "tgIsChatAdmin");
    const buyAmountReplyLinkKey = /* @__PURE__ */ __name2((chatId, messageId) => `buyAmountReplyLink:${String(chatId)}:${String(messageId)}`, "buyAmountReplyLinkKey");
    const buyAmountReplyProcessedKey = /* @__PURE__ */ __name2((chatId, messageId) => `buyAmountReplyProcessed:${String(chatId)}:${String(messageId)}`, "buyAmountReplyProcessedKey");
    const buyProofDecisionCallbackData = /* @__PURE__ */ __name2((offerId, result) => `buyproof:${String(offerId)}:${String(result).toLowerCase()}`, "buyProofDecisionCallbackData");
    function analyzePdfMeta(bytes, fileName) {
      const result = {
        file: fileName || "unknown.pdf",
        suspicious: false,
        reasons: [],
        creator: "",
        producer: "",
        creationDate: "",
        modDate: "",
        eofCount: 0,
        whitelisted: false
      };
      try {
        const raw = Array.from(bytes).map((b) => String.fromCharCode(b)).join("");
        const eofMatches = raw.match(/%%EOF/g);
        result.eofCount = eofMatches ? eofMatches.length : 0;
        if (result.eofCount > 1) {
          result.suspicious = true;
          result.reasons.push(`\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E %%EOF (${result.eofCount}) \u2014 \u0444\u0430\u0439\u043B \u0438\u043C\u0435\u0435\u0442 \u0438\u043D\u043A\u0440\u0435\u043C\u0435\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043F\u0440\u0430\u0432\u043A\u0438`);
        }
        const extractField = /* @__PURE__ */ __name2((field) => {
          const re1 = new RegExp("/" + field + "\\s*\\(([^)]{0,500})\\)", "i");
          const re2 = new RegExp("/" + field + "\\s*<([0-9A-Fa-f]{2,600})>", "i");
          const m1 = raw.match(re1);
          if (m1) {
            let v = m1[1];
            if (v.startsWith("\xFE\xFF")) {
              let decoded = "";
              for (let i = 2; i < v.length; i += 2) {
                const code = v.charCodeAt(i) << 8 | (v.charCodeAt(i + 1) || 0);
                if (code > 0) decoded += String.fromCharCode(code);
              }
              return decoded.trim();
            }
            return v.trim();
          }
          const m2 = raw.match(re2);
          if (m2) {
            const hex = m2[1];
            let decoded = "";
            if (hex.toUpperCase().startsWith("FEFF")) {
              for (let i = 4; i < hex.length; i += 4) {
                const code = parseInt(hex.substring(i, i + 4), 16);
                if (code > 0) decoded += String.fromCharCode(code);
              }
            } else {
              for (let i = 0; i < hex.length; i += 2) {
                const code = parseInt(hex.substring(i, i + 2), 16);
                if (code > 0) decoded += String.fromCharCode(code);
              }
            }
            return decoded.trim();
          }
          return "";
        }, "extractField");
        result.creator = extractField("Creator");
        result.producer = extractField("Producer");
        result.creationDate = extractField("CreationDate");
        result.modDate = extractField("ModDate");
        const creatorLow = result.creator.toLowerCase();
        const producerLow = result.producer.toLowerCase();
        const combined = creatorLow + " | " + producerLow;
        const whitelistPatterns = [
          // Сбер, Т-Банк, Альфа, ВТБ, Газпром, Почта, etc. — JasperReports + iText/OpenPDF
          { creator: "jasperreports", producer: "itext" },
          { creator: "jasperreports", producer: "openpdf" },
          // Ozon Банк, СовкомБанк, МТС — Chromium + Skia
          { creator: "chromium", producer: "skia" },
          // Ак Барс, ВТБ — wkhtmltopdf + Qt
          { creator: "wkhtmltopdf", producer: "qt" },
          // Райффайзен, Альфа через iOS — iOS as Producer
          { creator: "", producer: "ios version" },
          // PayTop / merchant banks — rPDF
          { creator: "", producer: "rpdf" },
          // Android WebView-based banks
          { creator: "chromium", producer: "chromium" },
          // Some banks use Mozilla/Firefox-based generators
          { creator: "mozilla", producer: "skia" },
          // iText (any version, any creator — used by many bank systems)
          { creator: "", producer: "itext" }
        ];
        let isWhitelisted = false;
        for (const wl of whitelistPatterns) {
          const creatorOk = !wl.creator || creatorLow.includes(wl.creator);
          const producerOk = !wl.producer || producerLow.includes(wl.producer);
          if (creatorOk && producerOk && (wl.creator || wl.producer)) {
            isWhitelisted = true;
            break;
          }
        }
        result.whitelisted = isWhitelisted;
        const editorPatterns = [
          "adobe acrobat",
          "acrobat pro",
          "acrobat dc",
          "foxit",
          "phantompdf",
          "phantom pdf",
          "pdfelement",
          "pdf element",
          "wondershare",
          "nitro pro",
          "nitro pdf",
          "master pdf",
          "pdf-xchange",
          "pdf xchange",
          "libreoffice",
          "openoffice",
          "ilovepdf",
          "smallpdf",
          "sejda",
          "soda pdf",
          "canva",
          "figma",
          "inkscape",
          "gimp",
          "photoshop",
          "illustrator",
          "pdf editor",
          "pdf-editor",
          "pdfsam",
          "pdfill",
          "pdftk",
          "pixelmator",
          "affinity",
          "nuance",
          "power pdf",
          "kofax",
          "pdf architect",
          "pdf24",
          "dochub",
          "kami",
          "xodo",
          "microsoft word",
          "microsoft excel",
          "writer2latex",
          "scribus",
          "pdfcreator",
          "bullzip",
          "cutepdf",
          "dopdf",
          "primo",
          "google docs",
          "google slides"
        ];
        for (const pat of editorPatterns) {
          if (combined.includes(pat)) {
            result.suspicious = true;
            result.reasons.push(`\u{1F6AB} PDF-\u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440: "${pat}" (Creator: "${result.creator}", Producer: "${result.producer}")`);
            break;
          }
        }
        if (!isWhitelisted && (result.creator || result.producer)) {
          if (!result.reasons.some((r) => r.includes("PDF-\u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440"))) {
            result.suspicious = true;
            result.reasons.push(`\u26A0\uFE0F \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440 PDF (Creator: "${result.creator}", Producer: "${result.producer}") \u2014 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u043C\u0438 \u0431\u0430\u043D\u043A\u0430\u043C\u0438`);
          }
        }
        if (!result.creator && !result.producer && !result.creationDate) {
          result.suspicious = true;
          result.reasons.push("\u26A0\uFE0F \u041C\u0435\u0442\u0430\u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u2014 \u0444\u0430\u0439\u043B \u043C\u043E\u0433 \u0431\u044B\u0442\u044C \u043F\u0435\u0440\u0435\u0441\u043E\u0431\u0440\u0430\u043D");
        }
        const parseD = /* @__PURE__ */ __name2((s) => {
          const m = String(s || "").match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
          if (!m) return null;
          return new Date(
            Number(m[1]),
            Number(m[2]) - 1,
            Number(m[3]),
            Number(m[4] || 0),
            Number(m[5] || 0),
            Number(m[6] || 0)
          );
        }, "parseD");
        const cDate = parseD(result.creationDate);
        const mDate = parseD(result.modDate);
        if (cDate && mDate) {
          const diffMs = Math.abs(mDate.getTime() - cDate.getTime());
          if (diffMs > 12e4) {
            result.suspicious = true;
            const diffMin = Math.round(diffMs / 6e4);
            result.reasons.push(`\u{1F4C5} \u0414\u0430\u0442\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F \u043E\u0442 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043D\u0430 ${diffMin} \u043C\u0438\u043D.`);
          }
        }
        if (raw.includes("/Subtype /FreeText") || raw.includes("/Subtype/FreeText")) {
          result.suspicious = true;
          result.reasons.push("\u270F\uFE0F FreeText \u0430\u043D\u043D\u043E\u0442\u0430\u0446\u0438\u0438 \u2014 \u0442\u0435\u043A\u0441\u0442 \u043D\u0430\u043B\u043E\u0436\u0435\u043D \u043F\u043E\u0432\u0435\u0440\u0445 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430");
        }
        if (raw.includes("/AcroForm")) {
          result.suspicious = true;
          result.reasons.push("\u{1F4DD} AcroForm \u2014 \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u043E\u043B\u044F (\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430\u044F \u043F\u043E\u0434\u043C\u0435\u043D\u0430 \u0442\u0435\u043A\u0441\u0442\u0430)");
        }
        if (raw.includes("/Subtype /Stamp") || raw.includes("/Subtype/Stamp")) {
          result.suspicious = true;
          result.reasons.push("\u{1F4CC} \u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B Stamp \u0430\u043D\u043D\u043E\u0442\u0430\u0446\u0438\u0438 (\u043D\u0430\u043B\u043E\u0436\u0435\u043D\u043D\u044B\u0435 \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B)");
        }
        if (bytes.length > 2 * 1024 * 1024) {
          result.suspicious = true;
          result.reasons.push(`\u{1F4E6} \u041D\u0435\u043E\u0431\u044B\u0447\u043D\u043E \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u0444\u0430\u0439\u043B (${(bytes.length / 1024 / 1024).toFixed(1)} MB)`);
        }
      } catch (e) {
        result.suspicious = true;
        result.reasons.push("\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u043D\u0430\u043B\u0438\u0437\u0430: " + String(e?.message || e));
      }
      return result;
    }
    __name(analyzePdfMeta, "analyzePdfMeta");
    __name2(analyzePdfMeta, "analyzePdfMeta");
    async function linkBuyAmountBroadcastMessage(chatId, messageId, rec) {
      await writeJsonKV(
        buyAmountReplyLinkKey(chatId, messageId),
        {
          requestId: String(rec?.id || ""),
          minRub: Number(rec?.minRub || 0),
          maxRub: Number(rec?.maxRub || 0),
          count: Number(rec?.count || 1),
          approxRate: Number(rec?.approxRate || 0) || 0,
          user: rec?.user || null,
          createdAt: Number(rec?.createdAt || now()) || now()
        },
        { expirationTtl: 3600 * 24 * 7 }
      );
      await addBuyAmountBroadcastRef(String(rec?.id || ""), chatId, messageId);
    }
    __name(linkBuyAmountBroadcastMessage, "linkBuyAmountBroadcastMessage");
    __name2(linkBuyAmountBroadcastMessage, "linkBuyAmountBroadcastMessage");
    async function getBuyAmountBroadcastLink(chatId, messageId) {
      return await readJsonKV(buyAmountReplyLinkKey(chatId, messageId), null);
    }
    __name(getBuyAmountBroadcastLink, "getBuyAmountBroadcastLink");
    __name2(getBuyAmountBroadcastLink, "getBuyAmountBroadcastLink");
    function stripReplyLabel(value, labels) {
      let s = String(value || "").trim();
      for (const label of labels) {
        const re = new RegExp("^\\s*" + label + "\\s*[:\\-]?\\s*", "i");
        s = s.replace(re, "");
      }
      return s.trim();
    }
    __name(stripReplyLabel, "stripReplyLabel");
    __name2(stripReplyLabel, "stripReplyLabel");
    function parseRubAmount(value) {
      let s = String(value || "").trim();
      s = s.replace(/\s+/g, "");
      s = s.replace(",", ".");
      s = s.replace(/[^\d.\-]/g, "");
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0) return NaN;
      return Math.round(n);
    }
    __name(parseRubAmount, "parseRubAmount");
    __name2(parseRubAmount, "parseRubAmount");
    function detectBuyMethodFromRequisite(requisite) {
      const digits = String(requisite || "").replace(/\D/g, "");
      if (digits.length >= 16 && digits.length <= 19) return "CARD";
      return "SBP";
    }
    __name(detectBuyMethodFromRequisite, "detectBuyMethodFromRequisite");
    __name2(detectBuyMethodFromRequisite, "detectBuyMethodFromRequisite");
    function parseBuyAmountReplyText(text) {
      const lines = String(text || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
      if (lines.length < 4) {
        return { ok: false, error: "\u041D\u0443\u0436\u043D\u044B 4 \u0441\u0442\u0440\u043E\u043A\u0438: \u0441\u0443\u043C\u043C\u0430, \u0431\u0430\u043D\u043A, \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442, \u043A\u0443\u0440\u0441" };
      }
      const amountLine = stripReplyLabel(lines[0], ["\u0441\u0443\u043C\u043C\u0430", "amount"]);
      const bankLine = stripReplyLabel(lines[1], ["\u0431\u0430\u043D\u043A", "bank"]);
      const reqLine = stripReplyLabel(lines[2], ["\u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442", "\u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B", "requisite", "card", "\u043A\u0430\u0440\u0442\u0430", "\u043D\u043E\u043C\u0435\u0440"]);
      const rateLine = stripReplyLabel(lines[3], ["\u043A\u0443\u0440\u0441", "rate", "\u0446\u0435\u043D\u0430", "price"]);
      const amountRub = parseRubAmount(amountLine);
      if (!Number.isFinite(amountRub) || amountRub <= 0) {
        return { ok: false, error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043D\u044F\u0442\u044C \u0441\u0443\u043C\u043C\u0443" };
      }
      if (!bankLine) return { ok: false, error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0431\u0430\u043D\u043A" };
      if (!reqLine) return { ok: false, error: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442" };
      const customRate = Number(String(rateLine || "").replace(/[^\d.,]/g, "").replace(",", "."));
      if (!Number.isFinite(customRate) || customRate <= 0) {
        return { ok: false, error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043D\u044F\u0442\u044C \u043A\u0443\u0440\u0441" };
      }
      return {
        ok: true,
        amountRub,
        payBank: bankLine,
        payRequisite: reqLine,
        customRate
      };
    }
    __name(parseBuyAmountReplyText, "parseBuyAmountReplyText");
    __name2(parseBuyAmountReplyText, "parseBuyAmountReplyText");
    async function calcCurrentBuyRate() {
      const cfg = await readJsonKV("config", { buyPercent: 0 });
      let rates;
      try {
        rates = await fetchRapiraRate("USDT/RUB");
      } catch (e) {
        const last = await readJsonKV("lastRates", null);
        if (last && last.ok) rates = last;
        else throw e;
      }
      const ask = Number(rates.ask);
      const bp = 1;
      const rate = ask * (1 + bp / 100);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Cannot calculate BUY rate");
      }
      return Number(rate.toFixed(2));
    }
    __name(calcCurrentBuyRate, "calcCurrentBuyRate");
    __name2(calcCurrentBuyRate, "calcCurrentBuyRate");
    async function tgBroadcastBuyAmountRequest(rec) {
      const chats = await getBuyAmountNotifyChats();
      const targets = chats.filter((x) => String(x?.chatId || "") !== String(TG_ADMIN_CHAT_ID || ""));
      if (!targets.length) return { ok: true, total: 0, sent: 0, failed: 0 };
      const text = renderBuyAmountChatText(rec);
      let sent = 0;
      let failed = 0;
      for (const ch of targets) {
        try {
          const tgMsg = await tgSendMessageEx(String(ch.chatId), text);
          if (tgMsg?.message_id) {
            await linkBuyAmountBroadcastMessage(String(ch.chatId), String(tgMsg.message_id), rec);
          }
          sent++;
        } catch {
          failed++;
        }
      }
      return { ok: true, total: targets.length, sent, failed };
    }
    __name(tgBroadcastBuyAmountRequest, "tgBroadcastBuyAmountRequest");
    __name2(tgBroadcastBuyAmountRequest, "tgBroadcastBuyAmountRequest");
    async function createBuyOfferFromBuyAmountReply({ link, chat, from, text, req, messageId, replyToMessageId }) {
      const parsed = parseBuyAmountReplyText(text);
      if (!parsed.ok) return parsed;
      const reqState = await getBuyAmountRequestById(String(link?.requestId || ""));
      const reqRec = reqState.rec;
      if (!reqRec) {
        return { ok: false, error: "\u0417\u0430\u043F\u0440\u043E\u0441 \u0443\u0436\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" };
      }
      const need = getBuyAmountNeed(reqRec);
      const matched = getBuyAmountMatched(reqRec);
      if (!isBuyAmountActual(reqRec)) {
        return { ok: false, error: `\u0417\u0430\u043F\u0440\u043E\u0441 \u0443\u0436\u0435 \u043D\u0435\u0430\u043A\u0442\u0443\u0430\u043B\u0435\u043D (${matched} \u0438\u0437 ${need})` };
      }
      const amountRub = Number(parsed.amountRub || 0);
      const minRub = Number(link?.minRub || 0);
      const maxRub = Number(link?.maxRub || 0);
      if (minRub > 0 && amountRub < minRub) {
        return { ok: false, error: `\u0421\u0443\u043C\u043C\u0430 \u043C\u0435\u043D\u044C\u0448\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430 \u043A\u043B\u0438\u0435\u043D\u0442\u0430 (${minRub} RUB)` };
      }
      if (maxRub > 0 && amountRub > maxRub) {
        return { ok: false, error: `\u0421\u0443\u043C\u043C\u0430 \u0431\u043E\u043B\u044C\u0448\u0435 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u0430 \u043A\u043B\u0438\u0435\u043D\u0442\u0430 (${maxRub} RUB)` };
      }
      let rate = Number(parsed.customRate || 0);
      if (!Number.isFinite(rate) || rate <= 0) {
        rate = Number(reqRec?.approxRate || link?.approxRate || 0);
        if (!Number.isFinite(rate) || rate <= 0) {
          rate = await calcCurrentBuyRate();
        }
      } else {
        rate = rate * 1.005;
      }
      rate = Number(rate.toFixed(2));
      const method = detectBuyMethodFromRequisite(parsed.payRequisite);
      const offers = await readJsonKV("buyOffers", []);
      const id = randId(10);
      const offer = {
        id,
        amountRub,
        method,
        rate,
        sourceCustomRate: Number(parsed.customRate || 0) || rate,
        payBank: parsed.payBank,
        payRequisite: parsed.payRequisite,
        checkOnly: true,
        frozen: false,
        status: "NEW",
        checkInfo: null,
        wallet: null,
        txHash: null,
        createdAt: now(),
        sourceKind: "BUY_AMOUNT_CHAT_REPLY",
        sourceRequestId: String(link?.requestId || ""),
        sourceChat: {
          id: String(chat?.id || ""),
          title: String(chat?.title || chat?.username || ""),
          type: String(chat?.type || "")
        },
        sourceAuthor: {
          id: String(from?.id || ""),
          username: String(from?.username || "").replace(/^@/, "")
        },
        sourceMessageId: Number(messageId || 0) || null,
        sourceReplyToMessageId: Number(replyToMessageId || 0) || null,
        sourceRawText: String(text || ""),
        // Mark as MW-only if the source request came from Moon Wallet
        mwOnly: !!(reqRec?.mwTgId || reqRec?.source === "moon_wallet"),
        mwTgId: reqRec?.mwTgId || "",
        mwReqId: reqRec?.mwReqId || "",
        mwWebhookBase: reqRec?.mwWebhookBase || "",
      };
      // Copy MW user shape directly onto offer so enrichment in setBuyOfferStatusFromChat works immediately
      if (reqRec?.mwTgId) {
        offer.moonWalletUser = { tgId: reqRec.mwTgId };
        offer.user = {
          id: reqRec.mwTgId,
          username: String(reqRec.user?.username || "moon_wallet"),
          source: "moon_wallet",
          mwTgId: reqRec.mwTgId,
          mwReqId: reqRec.mwReqId || "",
          mwWebhookBase: reqRec.mwWebhookBase || (env.MW_WEBHOOK_BASE || "https://client-qr-pay.kireeshka73.workers.dev"),
        };
      }
      offers.unshift(offer);
      await writeJsonKV("buyOffers", offers);
      try {
        await registerBuyAmountMatch({
          requestId: String(link?.requestId || ""),
          offerId: id,
          chat,
          from
        });
      } catch {
      }
      try {
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F4E5} BUY: \u0437\u0430\u044F\u0432\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u043E\u0442\u0432\u0435\u0442\u043E\u043C \u0438\u0437 \u0447\u0430\u0442\u0430",
            deal: "BUY " + id,
            step: "BUY_FROM_CHAT_REPLY",
            req,
            lines: [
              "Request ID: " + String(link?.requestId || ""),
              "\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u043A\u043B\u0438\u0435\u043D\u0442\u0430: " + String(link?.minRub || 0) + " \u2014 " + String(link?.maxRub || 0) + " RUB",
              "\u0421\u0443\u043C\u043C\u0430: " + String(amountRub) + " RUB",
              "\u0411\u0430\u043D\u043A: " + String(parsed.payBank),
              "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B: " + String(parsed.payRequisite),
              "\u0427\u0430\u0442: " + String(chat?.title || chat?.id || ""),
              from?.username ? "\u041E\u0442\u0432\u0435\u0442\u0438\u043B: @" + String(from.username).replace(/^@/, "") : "\u041E\u0442\u0432\u0435\u0442\u0438\u043B userId: " + String(from?.id || "")
            ]
          })
        );
      } catch {
      }
      try {
        if (env.RESERVATIONS_DO) {
          const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-amount-watch"));
          ctx.waitUntil(
            stub.fetch("https://do/match", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                offer: {
                  id,
                  amountRub,
                  rate,
                  method,
                  payBank: parsed.payBank,
                  payRequisite: parsed.payRequisite
                }
              })
            })
          );
        }
      } catch {
      }
      return { ok: true, offer };
    }
    __name(createBuyOfferFromBuyAmountReply, "createBuyOfferFromBuyAmountReply");
    __name2(createBuyOfferFromBuyAmountReply, "createBuyOfferFromBuyAmountReply");
    const walletEventTitle = /* @__PURE__ */ __name2((kind) => {
      switch (String(kind || "").toUpperCase()) {
        case "DEPOSIT":
          return "\u{1F4B0} WALLET: \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435";
        case "WITHDRAW_REQUEST":
          return "\u{1F4B8} WALLET: \u0437\u0430\u044F\u0432\u043A\u0430 \u043D\u0430 \u0432\u044B\u0432\u043E\u0434";
        case "WITHDRAW_APPROVED":
          return "\u2705 WALLET: \u0432\u044B\u0432\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D";
        case "WITHDRAW_REJECTED":
          return "\u21A9\uFE0F WALLET: \u0432\u044B\u0432\u043E\u0434 \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D";
        case "ADMIN_CREDIT":
          return "\u{1F6E0} WALLET: \u0430\u0434\u043C\u0438\u043D \u043F\u043E\u043F\u043E\u043B\u043D\u0438\u043B \u0431\u0430\u043B\u0430\u043D\u0441";
        case "ADMIN_DEBIT":
          return "\u{1F6E0} WALLET: \u0430\u0434\u043C\u0438\u043D \u0441\u043F\u0438\u0441\u0430\u043B \u0431\u0430\u043B\u0430\u043D\u0441";
        case "REF_TO_WALLET":
          return "\u{1F381} WALLET: \u0431\u043E\u043D\u0443\u0441\u044B \u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u044B";
        case "QR_DEBIT":
          return "\u{1F4F2} WALLET: \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u043E QR";
        case "QR_CREDIT":
          return "\u{1F4F2} WALLET: \u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435 \u043F\u043E QR";
        case "P2P_BUY_CREDIT":
          return "\u{1F6D2} WALLET: \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435 \u043F\u043E P2P BUY";
        case "QRPAY_EXECUTOR_CREDIT":
          return "\u{1F4F2} WALLET: \u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E QR";
        case "QRPAY_CREATOR_DEBIT":
          return "\u{1F4F2} WALLET: \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0443 \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044F QR";
        case "P2P_DEAL_RESULT":
          return "\u{1F91D} P2P: \u0438\u0442\u043E\u0433 \u0441\u0434\u0435\u043B\u043A\u0438";
        default:
          return "\u{1F4D8} WALLET: \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435";
      }
    }, "walletEventTitle");
    if (url.pathname === "/api/admin/broadcast_message" && request.method === "POST") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const body = await request.json().catch(() => ({}));
      const text = String(body.text || "").trim();
      if (!text) return bad("Missing text");
      const idx = await readJsonKV(userIndexKey, []);
      const ids = Array.isArray(idx) ? idx.slice(0, 5e4) : [];
      let total = 0;
      let sent = 0;
      let failed = 0;
      const errors = [];
      for (const id of ids) {
        total++;
        try {
          const user = await readJsonKV(userKeyById(id), null);
          if (!user || user.banned || !user.chatId) continue;
          await tgSendMessage(user.chatId, text);
          sent++;
        } catch (e) {
          failed++;
          if (errors.length < 10) {
            errors.push({
              userId: String(id),
              error: String(e.message || e)
            });
          }
        }
      }
      return json({ ok: true, total, sent, failed, errors });
    }
    const tgNotifyWallet = /* @__PURE__ */ __name2(async ({ kind, user, req, lines = [], refId = "", step = "WALLET_EVENT" } = {}) => {
      return tgNotifyAdmin({
        title: walletEventTitle(kind),
        user: user || null,
        deal: refId ? `WALLET ${refId}` : "WALLET",
        step,
        req,
        lines
      });
    }, "tgNotifyWallet");
    const resolveUserByIdShape = /* @__PURE__ */ __name2(async (id) => {
      try {
        if (!id && id !== 0) return null;
        const u = await readJsonKV(userKeyById(String(id)), null);
        return u ? ensureUserShape(u) : { id: String(id), username: "" };
      } catch {
        return { id: String(id || ""), username: "" };
      }
    }, "resolveUserByIdShape");
    const resolveUserByUsernameShape = /* @__PURE__ */ __name2(async (uname) => {
      try {
        const map = await readJsonKV(userKeyByUsername(String(uname || "").replace(/^@/, "")), null);
        const uid = map && map.userId ? String(map.userId) : "";
        if (uid) return await resolveUserByIdShape(uid);
      } catch {
      }
      return { id: "", username: String(uname || "").replace(/^@/, "") };
    }, "resolveUserByUsernameShape");
    const resolveActorUser = /* @__PURE__ */ __name2(async (req, attached) => {
      try {
        const au = await readUserToken(req);
        if (au && au.ok && au.user) return au.user;
      } catch {
      }
      if (attached && (attached.id || attached.username)) return attached;
      return null;
    }, "resolveActorUser");
    const ensureUserShape = /* @__PURE__ */ __name2((u) => {
      if (!u) return null;
      return {
        id: u.id != null ? String(u.id) : "",
        username: u.username != null ? String(u.username).replace(/^@/, "") : ""
      };
    }, "ensureUserShape");
    const TG_USER_NOTIFY_ENABLED = String(env.TG_USER_NOTIFY_ENABLED ?? "1") !== "0";
    const shortMid = /* @__PURE__ */ __name2((s, left = 6, right = 4) => {
      const x = String(s || "");
      if (x.length <= left + right + 3) return x;
      return x.slice(0, left) + "\u2026" + x.slice(-right);
    }, "shortMid");
    const money = /* @__PURE__ */ __name2((n, digits = 2) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return "0";
      return v.toFixed(digits).replace(/\.00$/, "");
    }, "money");
    const e6ToUsdt = /* @__PURE__ */ __name2((e6) => {
      const v = Number(e6);
      if (!Number.isFinite(v)) return 0;
      return v / 1e6;
    }, "e6ToUsdt");
    const statusRu = /* @__PURE__ */ __name2((type, code) => {
      const t = String(type || "").toUpperCase();
      const c = String(code || "").toUpperCase();
      const BUY = {
        NEW: "\u0421\u043E\u0437\u0434\u0430\u043D\u0430",
        ON_PAY: "\u041E\u0436\u0438\u0434\u0430\u0435\u043C \u043E\u043F\u043B\u0430\u0442\u0443",
        PAID: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E",
        ON_CHECK: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043E\u043F\u043B\u0430\u0442\u0443",
        SUCCESS: "\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430",
        ERROR: "\u041E\u0448\u0438\u0431\u043A\u0430",
        CANCELED: "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430",
        CANCELLED: "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430"
      };
      const SELL = {
        WAIT_CRYPTO: "\u041E\u0436\u0438\u0434\u0430\u0435\u043C \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 \u043A\u0440\u0438\u043F\u0442\u043E\u0432\u0430\u043B\u044E\u0442\u044B",
        CRYPTO_NOT_RECEIVED: "\u041A\u0440\u0438\u043F\u0442\u043E\u0432\u0430\u043B\u044E\u0442\u0430 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430",
        CRYPTO_RECEIVED: "\u041A\u0440\u0438\u043F\u0442\u043E\u0432\u0430\u043B\u044E\u0442\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430",
        CHECK_SUBMITTED: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430",
        PAYOUT_PROGRESS: "\u0412\u044B\u043F\u043B\u0430\u0442\u0430 \u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435",
        COMPLETED: "\u0421\u0434\u0435\u043B\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430",
        CANCELED: "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430",
        CANCELLED: "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u0430"
      };
      const dict = t === "SELL" ? SELL : BUY;
      return dict[c] || c;
    }, "statusRu");
    const normalizePrivateNotifyUser = /* @__PURE__ */ __name2((rec) => {
      if (!rec) return null;
      const dmChatId = String(rec.dmChatId || "").trim();
      const legacyChatId = String(rec.chatId || "").trim();
      const chatType = String(rec.chatType || "").toLowerCase();
      if (dmChatId) return { ...rec, chatId: dmChatId };
      if (chatType === "private" && legacyChatId) return { ...rec, chatId: legacyChatId };
      if (legacyChatId && !legacyChatId.startsWith("-")) return { ...rec, chatId: legacyChatId };
      return null;
    }, "normalizePrivateNotifyUser");
    const findUserForNotify = /* @__PURE__ */ __name2(async (u) => {
      try {
        if (!u) return null;
        const uid = u.id != null ? String(u.id) : "";
        const un = u.username != null ? String(u.username).replace(/^@/, "") : "";
        if (uid) {
          const rec = await readJsonKV(userKeyById(uid), null);
          const safe = normalizePrivateNotifyUser(rec);
          if (safe && !safe.banned) return safe;
        }
        if (un) {
          const map = await readJsonKV(userKeyByUsername(un), null);
          const id2 = map && map.userId ? String(map.userId) : "";
          if (id2) {
            const rec = await readJsonKV(userKeyById(id2), null);
            const safe = normalizePrivateNotifyUser(rec);
            if (safe && !safe.banned) return safe;
          }
        }
        return null;
      } catch {
        return null;
      }
    }, "findUserForNotify");
    const tgNotifyUserText = /* @__PURE__ */ __name2(async (userShape, text) => {
      try {
        if (!TG_USER_NOTIFY_ENABLED) return false;
        if (!env.TG_BOT_TOKEN) return false;
        const u = await findUserForNotify(userShape);
        if (!u || !u.chatId) return false;
        if (u.banned) return false;
        await tgSendMessage(u.chatId, String(text || "").slice(0, 3900));
        return true;
      } catch {
        return false;
      }
    }, "tgNotifyUserText");
    async function fetchRapiraRate(symbol = "USDT/RUB") {
      const ctrl = new AbortController();
      const _t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch("https://api.rapira.net/open/market/rates", {
        headers: { Accept: "application/json" }, signal: ctrl.signal
      }).finally(() => clearTimeout(_t));
      if (!res.ok) throw new Error("Rapira HTTP " + res.status);
      const j = await res.json();
      const arr = Array.isArray(j.data) ? j.data : [];
      const item = arr.find((x) => String(x.symbol || "").toUpperCase() === String(symbol).toUpperCase());
      if (!item) throw new Error("Rapira symbol not found: " + symbol);
      const ask = Number(item.askPrice);
      const bid = Number(item.bidPrice);
      const close = Number(item.close);
      if (!Number.isFinite(ask) || !Number.isFinite(bid)) throw new Error("Rapira invalid ask/bid");
      const out = {
        ok: true,
        symbol: String(symbol).toUpperCase(),
        ask,
        bid,
        close: Number.isFinite(close) ? close : null,
        ts: now(),
        source: "rapira"
      };
      await writeJsonKV("lastRates", out);
      return out;
    }

    function b64urlFromBytes(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64ToUint8(base64) {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function normalizeBase64(s) {
  s = String(s || "").replace(/\s+/g, "");
  const pad = (4 - (s.length % 4)) % 4;
  return s + "=".repeat(pad);
}

// Wraps a PKCS#1 (BEGIN RSA PRIVATE KEY) DER into a PKCS#8 envelope
// so that crypto.subtle.importKey("pkcs8") can accept it.
function wrapPkcs1InPkcs8(pkcs1Der) {
  function encLen(n) {
    if (n < 0x80) return new Uint8Array([n]);
    if (n < 0x100) return new Uint8Array([0x81, n]);
    return new Uint8Array([0x82, (n >> 8) & 0xff, n & 0xff]);
  }
  function cat(...arrays) {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) { out.set(a, offset); offset += a.length; }
    return out;
  }
  // version INTEGER 0
  const ver = new Uint8Array([0x02, 0x01, 0x00]);
  // AlgorithmIdentifier: SEQUENCE { OID rsaEncryption (1.2.840.113549.1.1.1), NULL }
  const alg = new Uint8Array([
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00
  ]);
  // privateKey OCTET STRING ::= pkcs1Der
  const pkOctet = cat(new Uint8Array([0x04]), encLen(pkcs1Der.length), pkcs1Der);
  const inner = cat(ver, alg, pkOctet);
  return cat(new Uint8Array([0x30]), encLen(inner.length), inner);
}

function b64ToBytes(input) {
  let s = String(input || "").trim();
  if (!s) throw new Error("Empty private key");

  // Если это base64-обертка PEM (начинается с LS0t..., т.е. -----BEGIN ...)
  if (!s.includes("BEGIN ") && /^LS0tLS1CRUdJTi/.test(s)) {
    const pad1 = "=".repeat((4 - (s.length % 4)) % 4);
    s = atob(s + pad1);
  }

  // Если это PEM-текст
  if (s.includes("BEGIN ")) {
    const m = s.match(
      /-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]+?)-----END (?:RSA )?PRIVATE KEY-----/
    );
    if (!m) {
      throw new Error("Bad PEM format");
    }
    s = m[1].replace(/\s+/g, "");
  } else {
    s = s.replace(/\s+/g, "");
  }

  const pad2 = "=".repeat((4 - (s.length % 4)) % 4);
  s += pad2;

  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function decodeJwtExpMs(token) {
  try {
    const part = String(token || "").split(".")[1] || "";
    if (!part) return 0;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/")
      + "===".slice((part.length + 3) % 4);
    const json = atob(padded);
    const obj = JSON.parse(json);
    return Number(obj.exp || 0) * 1000;
  } catch {
    return 0;
  }
}

async function createRapiraClientJwt(env) {
  const rawKey = String(env.RAPIRA_PRIVATE_KEY || "").trim();
  if (!rawKey) {
    throw new Error("RAPIRA_PRIVATE_KEY is empty");
  }

  // Decode base64-wrapped PEM if needed to check the header text
  let pemText = rawKey;
  if (!rawKey.includes("BEGIN ") && /^LS0tLS1CRUdJTi/.test(rawKey)) {
    const pad = "=".repeat((4 - (rawKey.length % 4)) % 4);
    pemText = atob(rawKey + pad);
  }

  let keyBytes = b64ToBytes(rawKey);

  // Detect whether the DER is PKCS#1 or PKCS#8.
  // After decoding PEM/base64 we have raw DER bytes.
  // PKCS#8:  30 .. 02 01 00 30 ..  (version then SEQUENCE=AlgorithmIdentifier)
  // PKCS#1:  30 .. 02 01 00 02 ..  (version then INTEGER=modulus)
  // We check the tag byte right after the 3-byte version field (02 01 00).
  function derTagAfterVersion(buf) {
    if (buf.length < 6 || buf[0] !== 0x30) return null;
    let off = 1;
    if (buf[off] & 0x80) off += 1 + (buf[off] & 0x7f); else off += 1;
    if (buf[off] === 0x02 && buf[off+1] === 0x01 && buf[off+2] === 0x00) return buf[off+3];
    return null;
  }

  let isPkcs1 = pemText.includes("BEGIN RSA PRIVATE KEY");
  if (!isPkcs1 && !pemText.includes("BEGIN PRIVATE KEY")) {
    // No PEM header — determine from DER structure
    const tagAfterVer = derTagAfterVersion(keyBytes);
    // 0x02 = INTEGER → PKCS#1 (next field is modulus)
    // 0x30 = SEQUENCE → PKCS#8 (next field is AlgorithmIdentifier)
    if (tagAfterVer === 0x02) isPkcs1 = true;
  }

  // If PKCS#1, wrap in PKCS#8 envelope so crypto.subtle can import it
  if (isPkcs1) {
    keyBytes = wrapPkcs1InPkcs8(keyBytes);
  }

  let privateKey;
  try {
    privateKey = await crypto.subtle.importKey(
      "pkcs8",
      keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  } catch (e) {
    // Last-ditch: maybe the stored key is already PKCS#8 DER but wrapped — try as-is without conversion
    const raw2 = b64ToBytes(rawKey);
    try {
      privateKey = await crypto.subtle.importKey(
        "pkcs8",
        raw2.buffer.slice(raw2.byteOffset, raw2.byteOffset + raw2.byteLength),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
    } catch (e2) {
      const hint = Array.from(keyBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, "0")).join(" ");
      throw new Error(
        `Не удалось импортировать RAPIRA_PRIVATE_KEY (isPkcs1=${isPkcs1}, DER prefix: ${hint}). ` +
        `Ошибка: ${e?.message || e}`
      );
    }
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = 3600;

  const header = { typ: "JWT", alg: "RS256" };
  const payload = {
    exp: nowSec + ttlSec,
    jti: crypto.randomUUID().replace(/-/g, "")
  };

  const te = new TextEncoder();
  const h = b64urlFromBytes(te.encode(JSON.stringify(header)));
  const p = b64urlFromBytes(te.encode(JSON.stringify(payload)));
  const signingInput = `${h}.${p}`;

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    te.encode(signingInput)
  );

  return `${signingInput}.${b64urlFromBytes(new Uint8Array(signature))}`;
}

async function getRapiraBearer(env) {
  const cacheKey = "rapira:bearer";
  const cached = await env.DB.get(cacheKey, { type: "json" });

  if (cached && cached.token && Number(cached.expiresAt || 0) > Date.now() + 60_000) {
    return String(cached.token);
  }

  const clientJwt = await createRapiraClientJwt(env);

  const res = await fetch("https://api.rapira.net/open/generate_jwt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      kid: String(env.RAPIRA_KID || ""),
      jwt_token: clientJwt
    })
  });

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok || !data || !data.token) {
    throw new Error("Rapira generate_jwt failed: " + res.status + " " + text.slice(0, 300));
  }

  const token = String(data.token);
  const expMs = decodeJwtExpMs(token) || (Date.now() + 25 * 60 * 1000);

  await env.DB.put(
    cacheKey,
    JSON.stringify({ token, expiresAt: expMs }),
    { expirationTtl: 24 * 60 * 60 }
  );

  return token;
}

async function rapiraFetch(env, path, opts = {}) {
  const method = String(opts.method || "GET").toUpperCase();
  const query = opts.query || null;
  const jsonBody = opts.jsonBody || null;
  const form = opts.form || null;

  // Call Rapira API directly using Bearer token (no relay needed)
  const bearer = await getRapiraBearer(env);
  let url = "https://api.rapira.net" + path;

  if (query && typeof query === "object") {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) url += "?" + qs;
  }

  const headers = {
    "Accept": "application/json",
    "Authorization": "Bearer " + bearer
  };

  let body = undefined;

  if (jsonBody) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(jsonBody);
  } else if (form) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(form)) {
      if (v === undefined || v === null || v === "") continue;
      fd.append(k, String(v));
    }
    body = fd;
  }

  const res = await fetch(url, { method, headers, body });
  const text = await res.text();

  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      `RapiraAPI ${method} ${path} -> ${res.status}: ${
        typeof data === "string"
          ? data.slice(0, 300)
          : JSON.stringify(data).slice(0, 300)
      }`
    );
  }

  return data;
}

async function createRapiraDepositAddressViaRapiraOnly(userId, env, d1) {
  const created = await rapiraFetch(env, "/open/deposit_address", {
    method: "POST",
    query: { currency: "usdt-trc20" }
  });

  const address = String(
    created?.address ||
    created?.data?.address ||
    created?.result?.address ||
    ""
  ).trim();

  if (!address) {
    throw new Error(
      "Rapira did not return deposit address: " +
      JSON.stringify(created).slice(0, 500)
    );
  }

  const user = await readJsonKV(userKeyById(String(userId)), null);
  if (user) {
    user.rapiraDepositAddress = address;
    user.rapiraDepositAddressCreatedAt = Date.now();
    user.rapiraDepositAddressNetwork = "TRON";
    user.rapiraDepositAddressAsset = "USDT";
    user.rapiraDepositAddressProvider = "RAPIRA";
    user.updatedAt = Date.now();
    await writeJsonKV(userKeyById(String(userId)), user);
  }

  await d1.prepare(
    "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
  ).bind(String(userId), Date.now()).run();

  return { address, creating: false };
}

async function creditRapiraDepositToUser(d1, userId, address, dep, env) {
  const txid = String(dep?.txid || "").trim();
  if (!txid) return false;

  const exists = await d1.prepare(
    "SELECT tx_hash FROM wallet_deposits WHERE tx_hash=? LIMIT 1"
  ).bind(txid).first();

  if (exists?.tx_hash) return false;

  const amountDec6 = toDec6(dep.amount);
  if (!(amountDec6 > 0)) return false;

  const rawTs = Number(dep?.createTimeTimestamp || 0);
  const ts = rawTs > 0 ? (rawTs < 1e12 ? rawTs * 1000 : rawTs) : Date.now();

  await d1.prepare(
    "INSERT INTO wallet_deposits (user_id, address, network, asset, amount_dec6, tx_hash, ts) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    String(userId),
    String(address),
    "TRON",
    "USDT",
    amountDec6,
    txid,
    ts
  ).run();

  await d1.prepare(
    "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET usdt_trc20_balance = usdt_trc20_balance + excluded.usdt_trc20_balance, updated_at = excluded.updated_at"
  ).bind(
    String(userId),
    amountDec6,
    Date.now()
  ).run();

  try {
    if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: String(env.TG_CHAT_ID),
          text: [
            "<b>💰 DEPOSIT: Rapira автопополнение</b>",
            `👤 userId: <code>${userId}</code>`,
            `📬 ${address}`,
            `🧾 <code>${txid}</code>`,
            `Amount: ${(amountDec6 / 1e6).toFixed(6)} USDT`,
            "Network: TRON"
          ].join("\n"),
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      }).catch(() => null);
    }
  } catch {}

  try {
    const userRec = await env.DB.get(`user:id:${userId}`, { type: "json" });
    const chatId = String(userRec?.dmChatId || userRec?.chatId || "").trim();
    if (env.TG_BOT_TOKEN && chatId) {
      await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✅ Депозит зачислен!\n💰 +${(amountDec6 / 1e6).toFixed(2)} USDT на ваш баланс`,
          disable_web_page_preview: true
        })
      }).catch(() => null);
    }
  } catch {}

  return true;
}

async function syncRapiraDepositsForUser(env, d1, userId, address) {
  const data = await rapiraFetch(env, "/open/deposit/records", {
    method: "POST",
    form: {
      pageNo: 0,
      pageSize: 20,
      address: String(address)
    }
  });

  const items = Array.isArray(data?.data?.content) ? data.data.content : [];
  items.sort((a, b) => Number(b?.createTimeTimestamp || 0) - Number(a?.createTimeTimestamp || 0));

  let pending = null;

  for (const dep of items) {
    const depAddress = String(dep?.address || "").trim().toLowerCase();
    if (depAddress !== String(address).trim().toLowerCase()) continue;

    const tokenLike = String(dep?.token || dep?.unit || "").toUpperCase();
    if (!tokenLike.includes("USDT")) continue;

    const st = String(dep?.status || "").toUpperCase();

    if (st === "SUCCESS") {
      await creditRapiraDepositToUser(d1, userId, address, dep, env);
      return {
        status: "CREDITED",
        rapiraStatus: st,
        txid: String(dep?.txid || ""),
        amountUsdt: Number(dep?.amount || 0)
      };
    }

    if (["MEMPOOL", "PENDING_CONFIRMATIONS", "PENDING_AML", "MANUAL_CHECK"].includes(st) && !pending) {
      pending = {
        status: "PENDING",
        rapiraStatus: st,
        txid: String(dep?.txid || ""),
        amountUsdt: Number(dep?.amount || 0)
      };
    }
  }

  return pending || { status: "NONE" };
}

async function scanRapiraDeposits(env) {
  const d1 = env.us_bal_wal;
  if (!d1) throw new Error("D1 binding 'us_bal_wal' is not set");

  const idx = await readJsonKV(userIndexKey, []);
  const ids = Array.isArray(idx) ? idx.slice(0, 5000) : [];

  for (const userId of ids) {
    try {
      const user = await readJsonKV(userKeyById(String(userId)), null);
      const address = String(user?.rapiraDepositAddress || "").trim();
      if (!address) continue;

      await syncRapiraDepositsForUser(env, d1, String(userId), address);
    } catch (_) {
    }
  }
}

    function getRapiraWithdrawMeta(network, asset = "USDT") {
      const n = String(network || "").toUpperCase().trim();
      const a = String(asset || "USDT").toUpperCase().trim();

      if (a !== "USDT") {
        throw new Error("Auto-withdraw currently supports only USDT");
      }

      if (n === "TRON" || n === "TRC20" || n === "TRX") {
        return { code: "USDTTRC20", coin: "USDT", chain: "TRX" };
      }

      throw new Error("Auto-withdraw via Rapira is configured only for USDT TRON");
    }

    function mapRapiraWithdrawStatus(status) {
      const s = String(status || "").toUpperCase().trim();

      if (s === "SUCCESS") return "DONE";
      if (s === "FAIL") return "FAILED";
      if (s === "REJECT") return "REJECTED";
      if (s === "CANCEL_BY_USER") return "CANCELED";
      if (s === "CREATE" || s === "WAITING" || s === "PROCESSING") return "PROCESSING";

      return "PROCESSING";
    }

    async function createRapiraWithdraw(env, { network, asset = "USDT", address, amountUsdt, memo = "" }) {
      const meta = getRapiraWithdrawMeta(network, asset);
      const amountNum = Number(amountUsdt || 0);

      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new Error("Bad withdraw amount");
      }

      const payload = {
        code: meta.code,
        coin: meta.coin,
        chain: meta.chain,
        address: String(address || "").trim(),
        amount: amountNum.toFixed(6).replace(/\.?0+$/, ""),
        nonce: Date.now()
      };

      if (memo) payload.memo = String(memo).slice(0, 120);

      const data = await rapiraFetch(env, "/open/withdraw/create", {
        method: "POST",
        jsonBody: payload
      });

      const withdrawRecordId = Number(
        data?.withdrawRecordId || data?.data?.withdrawRecordId || data?.result?.withdrawRecordId || 0
      );

      if (!(withdrawRecordId > 0)) {
        throw new Error("Rapira did not return withdrawRecordId: " + JSON.stringify(data).slice(0, 300));
      }

      return { withdrawRecordId, raw: data };
    }

    async function getRapiraWithdrawRecord(env, withdrawId) {
      return await rapiraFetch(
        env,
        `/open/withdraw/crypto/history/${encodeURIComponent(String(withdrawId))}`,
        { method: "GET" }
      );
    }

    async function syncPendingRapiraWithdrawals(filterUserId = "") {
      const WKEY = "userWithdrawals";
      const items = await readJsonKV(WKEY, []);
      const list = Array.isArray(items) ? items : [];
      let changed = false;

      for (let i = 0; i < list.length; i++) {
        const w = list[i];
        if (!w) continue;

        const userId = String(w.user_id || w.user?.id || "").trim();
        if (filterUserId && userId !== String(filterUserId)) continue;

        const rapiraWithdrawId = Number(w.rapiraWithdrawId || 0);
        if (!(rapiraWithdrawId > 0)) continue;

        const prevStatus = String(w.status || "").toUpperCase().trim();
        if (["DONE", "FAILED", "REJECTED", "CANCELED"].includes(prevStatus)) continue;

        try {
          const rec = await getRapiraWithdrawRecord(env, rapiraWithdrawId);
          const rapiraStatus = String(rec?.status || "").toUpperCase().trim();
          const nextStatus = mapRapiraWithdrawStatus(rapiraStatus);

          w.rapiraStatus = rapiraStatus || null;
          w.txHash = String(rec?.transactionNumber || w.txHash || "").trim() || null;
          w.txScanUrl = String(rec?.txidScanUrl || w.txScanUrl || "").trim() || null;
          w.updatedAt = now();

          if (nextStatus !== prevStatus) {
            w.status = nextStatus;
            changed = true;

            if (nextStatus === "DONE") {
              w.completedAt = now();

              try {
                const targetUser = await resolveUserByIdShape(userId);
                ctx.waitUntil(
                  tgNotifyUserText(
                    targetUser,
                    `✅ Вывод завершён.\n💸 ${fmtUsdtE6(Number(w.amountUsdtE6 || 0))}\nСеть: ${String(w.network || "TRON")}`
                  )
                );
              } catch {}
            }

            if (["FAILED", "REJECTED", "CANCELED"].includes(nextStatus) && !Number(w.walletRefundedAt || 0)) {
              const amountE6 = Number(w.amountUsdtE6 || 0);

              if (userId && amountE6 > 0) {
                await d1.prepare(
                  "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET usdt_trc20_balance = usdt_trc20_balance + excluded.usdt_trc20_balance, updated_at = excluded.updated_at"
                ).bind(userId, amountE6, now()).run();

                w.walletRefundedAt = now();
                w.walletRefundedE6 = amountE6;
              }

              try {
                const targetUser = await resolveUserByIdShape(userId);
                ctx.waitUntil(
                  tgNotifyUserText(
                    targetUser,
                    `⚠️ Вывод не прошёл.\nСредства возвращены на баланс: ${fmtUsdtE6(Number(w.amountUsdtE6 || 0))}.`
                  )
                );
              } catch {}
            }
          }

          list[i] = w;
        } catch (e) {
          w.syncError = String(e?.message || e);
          w.updatedAt = now();
          list[i] = w;
          changed = true;
        }
      }

      if (changed) {
        await writeJsonKV(WKEY, list.slice(0, 5000));
      }

      return { ok: true, changed };
    }

    __name(fetchRapiraRate, "fetchRapiraRate");
    __name2(fetchRapiraRate, "fetchRapiraRate");
    const cleanupExpiredReserves = /* @__PURE__ */ __name2(async () => {
      const reserves = await readJsonKV("reserves", {});
      let changed = false;
      for (const [offerId, r] of Object.entries(reserves)) {
        if (!r) continue;
        if (Number(r.expiresAt || 0) && now() > Number(r.expiresAt)) {
          if (r && (r.locked === true || r.paidAt)) {
            continue;
          }
          const buyOffers = await readJsonKV("buyOffers", []);
          const idx = buyOffers.findIndex((o) => o.id === offerId);
          if (idx >= 0) {
            const st = String(buyOffers[idx].status || "NEW").toUpperCase();
            if (st === "PAID" || st === "ON_CHECK" || st === "SUCCESS") {
              continue;
            }
            if (st === "NEW" || st === "ON_PAY" || st === "HTX_WAITING" || st === "BYBIT_WAITING") {
              buyOffers[idx].frozen = false;
              buyOffers[idx].status = "NEW";
              buyOffers[idx].wallet = null;
              await writeJsonKV("buyOffers", buyOffers);
            }
          }
          try {
            if (env.RESERVATIONS_DO && r && r.reserveId) {
              const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-offer-locks"));
              ctx && ctx.waitUntil && ctx.waitUntil(
                stub.fetch("https://do/release_buy", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ offerId, reserveId: r.reserveId })
                })
              );
            }
          } catch {
          }
          delete reserves[offerId];
          changed = true;
        }
      }
      if (changed) await writeJsonKV("reserves", reserves);
      try {
        const CHAT_OFFER_TTL = 10 * 60 * 1e3;
        const buyOffers = await readJsonKV("buyOffers", []);
        let offerChanged = false;
        const keptOffers = [];
        for (const o of buyOffers) {
          if (o && o.sourceKind === "BUY_AMOUNT_CHAT_REPLY" && String(o.status || "NEW").toUpperCase() === "NEW" && !o.frozen && o.createdAt && now() - Number(o.createdAt) > CHAT_OFFER_TTL) {
            offerChanged = true;
            try {
              ctx.waitUntil(
                tgNotifyOfferSourceChat(
                  o,
                  `\u23F3 \u0417\u0430\u044F\u0432\u043A\u0430 BUY ${o.id} \u0443\u0434\u0430\u043B\u0435\u043D\u0430 \u2014 \u043A\u043B\u0438\u0435\u043D\u0442 \u043D\u0435 \u0432\u0437\u044F\u043B \u0432 \u0442\u0435\u0447\u0435\u043D\u0438\u0435 10 \u043C\u0438\u043D\u0443\u0442`
                )
              );
            } catch {
            }
            continue;
          }
          keptOffers.push(o);
        }
        if (offerChanged) {
          await writeJsonKV("buyOffers", keptOffers);
        }
      } catch {
      }
    }, "cleanupExpiredReserves");
    const SELL_DEALS_KEY = "sellDeals";
    const normalizeSellStatus = /* @__PURE__ */ __name2((s) => {
      const x = String(s || "").toUpperCase().trim();
      if (!x) return "WAIT_CRYPTO";
      if (x === "WAITING_CRYPTO") return "WAIT_CRYPTO";
      if (x === "CRYPTO_FAILED") return "CRYPTO_NOT_RECEIVED";
      if (x === "CANCELLED") return "CANCELED";
      if (x === "DONE" || x === "SUCCESS" || x === "COMPLETED") return "COMPLETED";
      return x;
    }, "normalizeSellStatus");
    const sellCompute = /* @__PURE__ */ __name2((deal) => {
      const total = Number(deal.amountRub || 0) || 0;
      const payouts = Array.isArray(deal.payouts) ? deal.payouts : [];
      const paid = payouts.reduce((acc, p) => acc + (Number(p.amountRub) || 0), 0);
      const left = Math.max(0, total - paid);
      return { total, paid, left };
    }, "sellCompute");
    const withSellDerivedFields = /* @__PURE__ */ __name2((deal) => {
      const { total, paid, left } = sellCompute(deal);
      return {
        ...deal,
        paidTotal: paid,
        remaining: left,
        progress: { total, paid, left },
        parts: Array.isArray(deal.payouts) ? deal.payouts : [],
        received: Array.isArray(deal.payouts) ? deal.payouts : []
      };
    }, "withSellDerivedFields");
    async function hideSellOfferAfterCompletedDeal(offerId, dealId) {
      const cleanOfferId = String(offerId || "").trim();
      if (!cleanOfferId) return false;
      const offers = await readJsonKV("sellOffers", []);
      const arr = Array.isArray(offers) ? offers : [];
      const idx = arr.findIndex((o) => String(o?.id || "") === cleanOfferId);
      if (idx < 0) return false;
      arr[idx] = {
        ...arr[idx],
        status: "COMPLETED",
        frozen: true,
        completedAt: now(),
        completedByDealId: String(dealId || "") || null
      };
      await writeJsonKV("sellOffers", arr);
      return true;
    }
    __name(hideSellOfferAfterCompletedDeal, "hideSellOfferAfterCompletedDeal");
    __name2(hideSellOfferAfterCompletedDeal, "hideSellOfferAfterCompletedDeal");
    const pushSellLog = /* @__PURE__ */ __name2((deal, type, msg, extra = {}) => {
      const log = Array.isArray(deal.log) ? deal.log : [];
      log.push({ ts: now(), type, msg: String(msg || ""), ...extra });
      deal.log = log.slice(-200);
    }, "pushSellLog");
    if (url.pathname === "/api/admin/me" && request.method === "GET") {
      try {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        return json({ ok: true, via: "token" });
      } catch (e) {
        return bad(String(e.message || e), 401);
      }
    }
    if (url.pathname === "/api/scanner/addresses" && request.method === "GET") {
      try {
        if (!requireScanner()) return bad("Unauthorized", 401);
        const rows = await d1.prepare("SELECT user_id, network, asset, address FROM user_deposit_addresses WHERE network=? AND asset=?").bind(WALLET_NETWORK, WALLET_ASSET).all();
        const list = (rows?.results || []).map((r) => ({
          userId: String(r.user_id),
          network: String(r.network),
          asset: String(r.asset),
          address: String(r.address)
        }));
        return json({ ok: true, items: list });
      } catch (e) {
        return bad(String(e.message || e), 500);
      }
    }
    if (url.pathname === "/api/scanner/report" && request.method === "POST") {
      try {
        if (!requireScanner()) return bad("Unauthorized", 401);
        const body = await request.json().catch(() => ({}));
        const userId = String(body.userId || "").trim();
        const network = String(body.network || "TRC20").trim().toUpperCase();
        const token = String(body.token || "USDT").trim().toUpperCase();
        const toAddress = String(body.toAddress || "").trim();
        const txid = String(body.txid || "").trim();
        const amountDec6 = Number(body.amountDec6 ?? body.amount ?? 0);
        const blockTs = Number(body.blockTs ?? 0);
        const confirmations = Number(body.confirmations ?? 0);
        if (!userId || !toAddress || !txid) return bad("Missing userId/toAddress/txid");
        if (!Number.isFinite(amountDec6) || amountDec6 <= 0) return bad("Invalid amountDec6");
        const MIN_CONF = Number(env.DEPOSIT_MIN_CONFIRMATIONS || 1);
        await d1.prepare(
          "INSERT OR IGNORE INTO deposits (user_id, network, token, to_address, txid, amount_dec6, status, seen_at, confirmed_at, credited_at) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, NULL, NULL)"
        ).bind(
          userId,
          network,
          token,
          toAddress,
          txid,
          Math.trunc(amountDec6),
          now()
        ).run();
        if (confirmations >= MIN_CONF) {
          const lock = await d1.prepare(
            "UPDATE deposits SET status='CREDITING', confirmed_at=? WHERE txid=? AND status='PENDING'"
          ).bind(now(), txid).run();
          if (lock?.meta?.changes) {
            await d1.prepare(
              "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET usdt_trc20_balance = usdt_trc20_balance + excluded.usdt_trc20_balance, updated_at = excluded.updated_at"
            ).bind(userId, Math.trunc(amountDec6), now()).run();
            await d1.prepare(
              "UPDATE deposits SET status='CREDITED', credited_at=? WHERE txid=?"
            ).bind(now(), txid).run();
          }
        }
        return json({ ok: true, credited: confirmations >= MIN_CONF, minConf: MIN_CONF });
      } catch (e) {
        return bad(String(e.message || e), 500);
      }
    }
    if (url.pathname === "/rates" && request.method === "GET") {
      try {
        const symbol = url.searchParams.get("symbol") || "USDT/RUB";
        const out = await fetchRapiraRate(symbol);
        return json(out);
      } catch (e) {
        const last = await readJsonKV("lastRates", null);
        if (last && last.ok) return json({ ...last, note: "fallback lastRates" });
        return bad(String(e.message || e), 502);
      }
    }
    if (url.pathname === "/api/public/quotes" && request.method === "GET") {
      try {
        const config = await readJsonKV("config", { buyPercent: 0, sellPercent: 0 });
        const symbol = "USDT/RUB";
        let rates;
        try {
          rates = await fetchRapiraRate(symbol);
        } catch (e) {
          const last = await readJsonKV("lastRates", null);
          if (last && last.ok) rates = last;
          else throw e;
        }
        const ask = Number(rates.ask);
        const bid = Number(rates.bid);
        const bp = Number(config.buyPercent || 0);
        const sp = Number(config.sellPercent || 0);
        const buy = ask * (1 + bp / 100);
        const sell = bid * (1 + sp / 100);
        return json({ ok: true, ts: rates.ts || now(), raw: { ask, bid }, adjusted: { buy, sell } });
      } catch (e) {
        return bad(String(e.message || e), 502);
      }
    }
    if (url.pathname === "/api/public/rapira_rate" && request.method === "GET") {
      try {
        const symbol = "USDT/RUB";
        let rates;
        try {
          rates = await fetchRapiraRate(symbol);
        } catch (e) {
          const last = await readJsonKV("lastRates", null);
          if (last && last.ok) rates = last;
          else throw e;
        }
        const ask = Number(rates.ask);
        if (!Number.isFinite(ask) || ask <= 0) {
          return bad("Rapira invalid ask", 502);
        }
        return json({ ok: true, rate: ask, ts: rates.ts || now(), symbol });
      } catch (e) {
        return bad(String(e.message || e), 502);
      }
    }
    if (url.pathname === "/api/public/buy_offers" && request.method === "GET") {
      await cleanupExpiredReserves();
      const offers = await readJsonKV("buyOffers", []);
      // Moon Wallet worker can pass X-MW-Secret + ?mw_tg_id= to see its user's offers
      const mwSecret = request.headers.get("X-MW-Secret") || "";
      const cfSecret = String(env?.BOT_TOKEN || "").slice(0, 20);
      const mwTgId = url.searchParams.get("mw_tg_id") || "";
      const isMwCall = !!(mwSecret && cfSecret && mwSecret === cfSecret && mwTgId);
      const visible = offers.filter((o) => {
        if (o.frozen) return false;
        if (String(o.status || "NEW").toUpperCase() !== "NEW") return false;
        // MW-only offers: only visible to the specific MW user who created the request
        if (o.mwOnly || o.user?.mwTgId || o.moonWalletUser?.tgId) {
          if (isMwCall) {
            const offerMwTgId = String(o.mwTgId || o.user?.mwTgId || o.moonWalletUser?.tgId || "");
            return offerMwTgId === mwTgId;
          }
          return false;
        }
        return true;
      });
      return json({ ok: true, offers: visible });
    }
    if (url.pathname === "/api/public/qr_buy_create" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const amountRub = Math.round(Number(body.amountRub ?? body.rub ?? body.amount ?? 0));
      const qrRaw = String(body.qrRaw || body.payload || body.qr || "").trim();
      const merchant = String(body.merchant || body.payBank || body.title || "").trim();
      let rate = Number(body.rate || 0);
      const usdtAmount = Number(body.usdtAmount || 0);
      if (!Number.isFinite(amountRub) || amountRub <= 0) return bad("Invalid amountRub");
      if (!qrRaw) return bad("Missing qrRaw");
      if ((!Number.isFinite(rate) || rate <= 0) && Number.isFinite(usdtAmount) && usdtAmount > 0) {
        rate = amountRub / usdtAmount;
      }
      if (!Number.isFinite(rate) || rate <= 0) {
        const cfg = await readJsonKV("config", {});
        rate = Number(
          cfg.qrRate || cfg.rapiraAsk || cfg.ask || cfg.buyRate || cfg.rate || 0
        );
      }
      if (!Number.isFinite(rate) || rate <= 0) return bad("Invalid rate");
      let actor = null;
      try {
        actor = ensureUserShape(await resolveActorUser(request, null));
      } catch {
      }
      if (!actor || !actor.id && !actor.username) return bad("Unauthorized", 401);
      const offers = await readJsonKV("buyOffers", []);
      const id = randId(10);
      const nowTs = now();
      const offer = {
        id,
        amountRub,
        method: "QR",
        rate,
        payBank: merchant || "QR payment",
        payRequisite: qrRaw,
        checkOnly: false,
        frozen: false,
        status: "NEW",
        checkInfo: null,
        wallet: null,
        txHash: null,
        createdAt: nowTs,
        user: actor,
        qrOrder: {
          merchant,
          qrRaw,
          createdBy: actor,
          usdtAmount: Number.isFinite(usdtAmount) && usdtAmount > 0 ? usdtAmount : null
        }
      };
      offers.unshift(offer);
      await writeJsonKV("buyOffers", offers);
      try {
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F9FE} QR \u2192 BUY: \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u0437\u0430\u044F\u0432\u043A\u0430",
            user: actor,
            deal: `BUY ${id}`,
            step: "QR_BUY_CREATE",
            req: request,
            lines: [
              `\u0421\u0443\u043C\u043C\u0430: ${amountRub} RUB`,
              `\u041C\u0435\u0442\u043E\u0434: QR`,
              `\u041A\u0443\u0440\u0441: ${rate}`,
              `\u041C\u0435\u0440\u0447\u0430\u043D\u0442: ${merchant || "\u2014"}`
            ]
          })
        );
      } catch {
      }
      try {
        if (env.RESERVATIONS_DO) {
          const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-amount-watch"));
          ctx.waitUntil(
            stub.fetch("https://do/match", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ offer: { id, amountRub, rate, method: "QR", payBank: merchant || "QR payment", payRequisite: qrRaw } })
            })
          );
        }
      } catch {
      }
      return json({ ok: true, id, offer });
    }
    if (url.pathname === "/api/public/sell_offers" && request.method === "GET") {
      const offers = await readJsonKV("sellOffers", []);
      const visibleRaw = (Array.isArray(offers) ? offers : []).filter(
        (o) => !o.frozen && String(o.status || "NEW").toUpperCase() === "NEW"
      );
      let rapiraAsk = null;
      try {
        const rates = await fetchRapiraRate("USDT/RUB");
        rapiraAsk = Number(rates.ask);
      } catch (_) {
      }
      const visible = visibleRaw.map((o) => {
        const mode = String(o.rateMode || "ABS").toUpperCase();
        if (mode === "PERCENT" && Number.isFinite(rapiraAsk) && rapiraAsk > 0) {
          const pct = Number(o.ratePercent || 0);
          const dynamicRate = rapiraAsk * (1 + pct / 100);
          return {
            ...o,
            rate: Number(dynamicRate.toFixed(2))
          };
        }
        return {
          ...o,
          rate: Number(o.rate || 0)
        };
      });
      return json({ ok: true, offers: visible });
    }
    if (url.pathname === "/api/public/buy_lock_status" && request.method === "GET") {
      const idsParam = (url.searchParams.get("ids") || "").trim();
      const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200) : [];
      if (!env.RESERVATIONS_DO) return json({ ok: true, locks: {} });
      if (!ids.length) return json({ ok: true, locks: {} });
      try {
        const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-offer-locks"));
        const doUrl = "https://do/buy_lock_status?ids=" + encodeURIComponent(ids.join(","));
        const doRes = await stub.fetch(doUrl, { method: "GET" });
        const j = await doRes.json().catch(() => null);
        if (!doRes.ok || !j || !j.ok) return bad(j?.error || "Lock status error", doRes.status || 502);
        return json({ ok: true, locks: j.locks || {} });
      } catch (e) {
        return bad(String(e.message || e), 502);
      }
    }
    if (url.pathname === "/api/public/verification_requirements" && request.method === "GET") {
      const vid = String(url.searchParams.get("id") || "").trim();
      if (!vid) return bad("Missing id");
      const buyOffers = await readJsonKV("buyOffers", []);
      const offer = (Array.isArray(buyOffers) ? buyOffers : []).find((o) => String(o.id || "") === vid);
      if (!offer) return bad("Offer not found", 404);
      let userRec = null;
      try {
        const actor = await resolveActorUser(request, offer.user || null);
        if (actor && actor.id) userRec = await readJsonKV(userKeyById(String(actor.id)), null);
      } catch {
      }
      const reqs = computeVerificationRequirements(userRec || {}, offer, now());
      return json({ ok: true, ...reqs });
    }
    if (url.pathname === "/api/public/reserve_offer" && request.method === "POST") {
      await cleanupExpiredReserves();
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "");
      const reserveId = String(body.reserveId || "");
      const notifyOpen = body.notifyOpen === true || body.notify_open === true || body.notify === true;
      const toAddress = String(body.toAddress || body.moonWalletUser?.address || "").trim();
      const moonWalletUser = body.moonWalletUser || null;
      if (!id) return bad("Missing id");
      const buyOffers = await readJsonKV("buyOffers", []);
      const offer = buyOffers.find((o) => o.id === id);
      if (!offer) return bad("Offer not found", 404);
      let actorShape = null;
      try {
        const actor = await resolveActorUser(request, offer.user || null);
        actorShape = ensureUserShape(actor);
      } catch {
      }
      const ttlMs = 20 * 60 * 1e3;
      let finalReserveId = reserveId;
      let finalExpiresAt = now() + ttlMs;
      let doIsNew = true;
      try {
        if (env.RESERVATIONS_DO) {
          const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-offer-locks"));
          const doRes = await stub.fetch("https://do/claim_buy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offerId: id, reserveId: reserveId || "", user: actorShape || null, ttlMs })
          });
          const j = await doRes.json().catch(() => null);
          if (!doRes.ok || !j || !j.ok) {
            return bad(j?.error || "Offer is reserved", doRes.status || 409);
          }
          finalReserveId = String(j.reserveId || finalReserveId || "");
          finalExpiresAt = Number(j.expiresAt || finalExpiresAt) || finalExpiresAt;
          if (typeof j.isNew === "boolean") doIsNew = j.isNew;
        }
      } catch (e) {
        return bad("Reserve service unavailable", 503);
      }
      const reserves = await readJsonKV("reserves", {});
      const existing = reserves[id];
      const offerWasNew = String(offer.status || "NEW").toUpperCase() === "NEW";
      if (existing && String(existing.reserveId || "") !== String(finalReserveId || "")) {
        return bad("Offer is reserved", 409);
      }
      const effectiveReserveId = finalReserveId || existing && existing.reserveId || randId(18);
      reserves[id] = {
        reserveId: effectiveReserveId,
        ts: existing?.ts || now(),
        lastSeenAt: now(),
        expiresAt: finalExpiresAt,
        user: actorShape || existing?.user || offer.user || null,
        toAddress: toAddress || existing?.toAddress || "",
        moonWalletUser: moonWalletUser || existing?.moonWalletUser || null
      };
      try {
        if (actorShape && (actorShape.id || actorShape.username)) {
          if (offer.qrOrder) {
            offer.executorUser = actorShape;
          } else {
            offer.user = actorShape;
          }
        }
      } catch {
      }
      offer.frozen = true;
      if (String(offer.status || "NEW").toUpperCase() === "NEW") offer.status = "ON_PAY";
      await writeJsonKV("buyOffers", buyOffers);
      await writeJsonKV("reserves", reserves);
      if (doIsNew && notifyOpen) {
        try {
          ctx.waitUntil(
            tgNotifyAdmin({
              title: offer.qrOrder ? "\u{1F9FE} QR BUY: \u0437\u0430\u044F\u0432\u043A\u0443 \u0432\u0437\u044F\u043B\u0438" : "\u{1F7E2} BUY: \u0441\u0434\u0435\u043B\u043A\u0430 \u043E\u0442\u043A\u0440\u044B\u0442\u0430",
              user: offer.qrOrder ? offer.qrOrder?.createdBy || offer.user || null : offer.user || reserves[id].user || null,
              deal: "BUY " + id,
              step: offer.qrOrder ? "QR_BUY_TAKEN" : "BUY_OPEN",
              req: request,
              lines: [
                "Offer ID: " + id,
                "Reserve ID: " + reserves[id].reserveId,
                "\u0421\u0443\u043C\u043C\u0430: " + String(offer.amountRub) + " RUB",
                "\u041C\u0435\u0442\u043E\u0434: " + String(offer.method || ""),
                "\u041A\u0443\u0440\u0441: " + String(offer.rate || ""),
                "\u0411\u0430\u043D\u043A: " + String(offer.payBank || ""),
                "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B: " + String(offer.payRequisite || ""),
                ...offer.qrOrder ? ["QR-\u0437\u0430\u044F\u0432\u043A\u0430 \u0432\u0437\u044F\u0442\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0435\u043C"] : [],
                ...(reserves[id].toAddress ? ["📥 USDT addr: " + reserves[id].toAddress] : []),
                ...(reserves[id].moonWalletUser?.name ? ["Moon Wallet: " + reserves[id].moonWalletUser.name] : [])
              ]
            })
          );
        } catch {
        }
      }
      try {
        if (doIsNew && offer.sourceKind === "BUY_AMOUNT_CHAT_REPLY") {
          // Dedup: only notify once per offer (in case DO state is lost on hibernation)
          const dedupKey = `notified_taken:${id}`;
          const alreadyNotified = await env.DB.get(dedupKey);
          if (!alreadyNotified) {
            await env.DB.put(dedupKey, "1", { expirationTtl: 86400 });
            ctx.waitUntil(
              tgNotifyOfferSourceChat(
                offer,
                `\u{1F7E2} \u041A\u043B\u0438\u0435\u043D\u0442 \u0432\u0437\u044F\u043B \u0437\u0430\u044F\u0432\u043A\u0443 BUY ${id}
\u0421\u0443\u043C\u043C\u0430: ${String(offer.amountRub || 0)} RUB`
              )
            );
          }
        }
      } catch {
      }
      if (doIsNew && notifyOpen) {
        try {
          if (offer.qrOrder) {
            ctx.waitUntil(tgNotifyUserText(
              offer.qrOrder?.createdBy || offer.user || null,
              `\u{1F9FE} \u0412\u0430\u0448\u0430 QR-\u0437\u0430\u044F\u0432\u043A\u0430 BUY ${id} \u0432\u0437\u044F\u0442\u0430 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443.
\u0421\u0443\u043C\u043C\u0430: ${money(offer.amountRub, 0)} \u20BD.
\u041E\u0436\u0438\u0434\u0430\u0439\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443 QR \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u0435\u043C.`
            ));
            ctx.waitUntil(tgNotifyUserText(
              reserves[id].user || offer.executorUser || null,
              `\u{1F7E2} \u0412\u044B \u0432\u0437\u044F\u043B\u0438 QR-\u0437\u0430\u044F\u0432\u043A\u0443 BUY ${id}.
\u041E\u043F\u043B\u0430\u0442\u0438\u0442\u0435 QR \u043D\u0430 ${money(offer.amountRub, 0)} \u20BD \u0438 \u0437\u0430\u0442\u0435\u043C \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043E\u043F\u043B\u0430\u0442\u0443 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u0441\u0434\u0435\u043B\u043A\u0438.`
            ));
          } else {
            ctx.waitUntil(
              tgNotifyUserText(
                offer.user || reserves[id].user || null,
                `\u{1F7E2} \u0421\u0434\u0435\u043B\u043A\u0430 \u043E\u0442\u043A\u0440\u044B\u0442\u0430!
\u0412\u044B \u043F\u043E\u043A\u0443\u043F\u0430\u0435\u0442\u0435 USDT \u0437\u0430 ${money(offer.amountRub, 0)} \u20BD \u043F\u043E \u043A\u0443\u0440\u0441\u0443 ${money(offer.rate, 2)}.
\u041F\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u0434\u0435\u043D\u044C\u0433\u0438 \u043F\u043E \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u0430\u043C \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u042F \u043E\u043F\u043B\u0430\u0442\u0438\u043B\xBB \u2705`
              )
            );
          }
        } catch {
        }
      }
      return json({
        ok: true,
        reserved: true,
        reserveId: reserves[id].reserveId,
        expiresAt: reserves[id].expiresAt,
        offer: {
          id: offer.id,
          payBank: offer.payBank || "",
          payRequisite: offer.payRequisite || "",
          amountRub: offer.amountRub,
          method: offer.method,
          rate: offer.rate,
          checkOnly: !!offer.checkOnly,
          sourceKind: offer.sourceKind || ""
        }
      });
    }
    if (url.pathname === "/api/public/choose_route" && request.method === "POST") {
      await cleanupExpiredReserves();
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      const reserveId = String(body.reserveId || body.reservedId || "").trim();
      const route = String(body.route || "").trim().toUpperCase();
      if (!id) return bad("Missing id");
      if (!["HTX", "BYBIT"].includes(route)) return bad("Invalid route");
      const buyOffers = await readJsonKV("buyOffers", []);
      const idx = buyOffers.findIndex((o) => o.id === id);
      if (idx < 0) return bad("Offer not found", 404);
      let actorShape = null;
      try {
        const actor = await resolveActorUser(request, buyOffers[idx].user || null);
        actorShape = ensureUserShape(actor);
      } catch {
      }
      const ttlMs = 20 * 60 * 1e3;
      let finalReserveId = reserveId;
      let finalExpiresAt = now() + ttlMs;
      try {
        if (env.RESERVATIONS_DO) {
          const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-offer-locks"));
          const doRes = await stub.fetch("https://do/claim_buy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offerId: id, reserveId: reserveId || "", user: actorShape || null, ttlMs })
          });
          const j = await doRes.json().catch(() => null);
          if (!doRes.ok || !j || !j.ok) return bad(j?.error || "Offer is reserved", doRes.status || 409);
          finalReserveId = String(j.reserveId || finalReserveId || "");
          finalExpiresAt = Number(j.expiresAt || finalExpiresAt) || finalExpiresAt;
        }
      } catch {
        return bad("Reserve service unavailable", 503);
      }
      const reserves = await readJsonKV("reserves", {});
      let r = reserves[id];
      if (r && String(r.reserveId || "") !== String(finalReserveId || "")) {
        return bad("Offer is reserved", 409);
      }
      const effectiveReserveId = finalReserveId || r && r.reserveId || randId(18);
      r = {
        reserveId: effectiveReserveId,
        ts: r?.ts || now(),
        lastSeenAt: now(),
        expiresAt: finalExpiresAt,
        user: actorShape || r?.user || buyOffers[idx].user || null
      };
      reserves[id] = r;
      await writeJsonKV("reserves", reserves);
      buyOffers[idx].frozen = true;
      buyOffers[idx].status = route === "HTX" ? "HTX_WAITING" : "BYBIT_WAITING";
      await writeJsonKV("buyOffers", buyOffers);
      try {
        const actor = await resolveActorUser(request, buyOffers[idx].user || r.user || null);
        const u = ensureUserShape(actor);
        if (u && (u.id || u.username) && !buyOffers[idx].user) {
          buyOffers[idx].user = u;
          await writeJsonKV("buyOffers", buyOffers);
        }
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F9ED} BUY: \u0432\u044B\u0431\u0440\u0430\u043D \u043C\u0430\u0440\u0448\u0440\u0443\u0442",
            user: buyOffers[idx].user || r.user || null,
            deal: "BUY " + id,
            step: "BUY_ROUTE",
            req: request,
            lines: ["Route: " + route, "Status: " + buyOffers[idx].status]
          })
        );
      } catch {
      }
      try {
        ctx.waitUntil(
          tgNotifyUserText(
            buyOffers[idx].user || r.user || null,
            `\u{1F9ED} \u041C\u0430\u0440\u0448\u0440\u0443\u0442 \u0432\u044B\u0431\u0440\u0430\u043D: ${route}.
\u041C\u044B \u0433\u043E\u0442\u043E\u0432\u0438\u043C \u0441\u0434\u0435\u043B\u043A\u0443 \u0438 \u043F\u0440\u0438\u0448\u043B\u0451\u043C \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0437\u0434\u0435\u0441\u044C \u{1F91D}`
          )
        );
      } catch {
      }
      return json({ ok: true, status: buyOffers[idx].status });
    }
    async function setBuyOfferStatusFromChat({ offerId, nextStatus, actor, req }) {
      const status = String(nextStatus || "").toUpperCase().trim();
      if (!["SUCCESS", "ERROR"].includes(status)) {
        return { ok: false, error: "Bad status", code: 400 };
      }
      const offers = await readJsonKV("buyOffers", []);
      const idx = offers.findIndex((o) => String(o.id || "") === String(offerId || ""));
      if (idx < 0) {
        return { ok: false, error: "Offer not found", code: 404 };
      }
      const offer = offers[idx];

      // ── Enrich offer with Moon Wallet user data ────────────────
      // moonWalletUser is stored in reserves (set during reserve_offer) or
      // in the buyAmountRequest (for BUY_AMOUNT_CHAT_REPLY). Copy it onto
      // the offer so the SUCCESS webhook can reach MW.
      if (!offer.moonWalletUser && !offer.user?.mwTgId) {
        try {
          const reserves = await readJsonKV("reserves", {});
          const reserve = reserves[String(offerId || "")];
          if (reserve?.moonWalletUser?.tgId) {
            offer.moonWalletUser = reserve.moonWalletUser;
            offer.user = offer.user || {};
            offer.user.mwTgId = reserve.moonWalletUser.tgId;
             offer.user.mwWebhookBase = reserve.moonWalletUser.mwWebhookBase || (env.MW_WEBHOOK_BASE || "https://client-qr-pay.kireeshka73.workers.dev");
          } else if (offer.sourceKind === "BUY_AMOUNT_CHAT_REPLY" && offer.sourceRequestId) {
            const reqState = await getBuyAmountRequestById(String(offer.sourceRequestId || ""));
            const reqRec = reqState?.rec;
            if (reqRec?.mwTgId) {
              offer.moonWalletUser = { tgId: reqRec.mwTgId };
              offer.user = offer.user || {};
              offer.user.mwTgId = reqRec.mwTgId;
              offer.user.mwReqId = reqRec.mwReqId || "";
               offer.user.mwWebhookBase = reqRec.mwWebhookBase || (env.MW_WEBHOOK_BASE || "https://client-qr-pay.kireeshka73.workers.dev");
            }
          }
        } catch {}
      }
      // ─────────────────────────────────────────────────────────

      const prevStatus = String(offer.status || "").toUpperCase();
      const actorShape = actor ? {
        id: String(actor.id || ""),
        username: String(actor.username || "").replace(/^@/, "")
      } : null;
      offer.checkInfo = offer.checkInfo && typeof offer.checkInfo === "object" ? offer.checkInfo : {};
      offer.checkInfo.chatDecision = {
        result: status,
        at: now(),
        by: actorShape
      };
      offer.updatedAt = now();
      offer.frozen = true;
      offer.status = status;
      if (status === "SUCCESS" && prevStatus !== "SUCCESS") {
        try {
          if (offer.qrOrder) {
            const settled = await settleQrBuyOfferTransfer(offer);
            if (!settled?.ok) {
              offer.status = prevStatus || "ON_CHECK";
              offers[idx] = offer;
              await writeJsonKV("buyOffers", offers);
              return {
                ok: false,
                error: settled?.error === "INSUFFICIENT_BALANCE" ? "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0442\u0440\u0430\u0442\u0438\u0442\u0441\u044F \u043A\u0435\u0448\u0431\u044D\u043A, \u0437\u0430\u0442\u0435\u043C \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A" : settled?.error || "QR settle failed",
                code: 409
              };
            }
            offer.walletCreditedAt = offer.walletCreditedAt || Date.now();
            offer.qrOrder = offer.qrOrder || {};
            offer.qrOrder.cashbackUsedE6 = Number(settled?.cashbackUsedDec6 || offer.qrOrder.cashbackUsedE6 || 0) || 0;
            offer.qrOrder.walletUsedE6 = Number(settled?.walletUsedDec6 || offer.qrOrder.walletUsedE6 || 0) || 0;
          } else {
            await tryAwardBonusForBuyOffer(offer);
            await creditBuyOfferToWalletBalance(offer);
            offer.walletCreditedAt = offer.walletCreditedAt || Date.now();
            offer.cashbackAwardedE6 = 0;
            offer.cashbackAwardedAt = 0;
          }
        } catch (e) {
          offer.status = prevStatus || "ON_CHECK";
          offers[idx] = offer;
          await writeJsonKV("buyOffers", offers);
          return { ok: false, error: e?.message || "Settlement failed", code: 409 };
        }
      }
      offers[idx] = offer;
      await writeJsonKV("buyOffers", offers);
      if (status === "SUCCESS") {
        const buyUserId = String(offer?.user?.id || "").trim();
        if (buyUserId) {
          try {
            const uRec = await readJsonKV(userKeyById(buyUserId), null);
            if (uRec) {
              const bs = uRec.buyStats || {};
              bs.totalCompleted = (bs.totalCompleted || 0) + 1;
              bs.consecutiveCancels = 0;
              uRec.buyStats = bs;
              const checkInfo = offer.checkInfo || {};
              const hasVideo = Array.isArray(checkInfo.files) && checkInfo.files.some((f) => f.kind === "video");
              const hasPhoto = Array.isArray(checkInfo.files) && checkInfo.files.some((f) => f.kind === "photo");
              const trustGain = hasVideo ? 3 : hasPhoto ? 1 : 2;
              uRec.trustScore = Number(uRec.trustScore || 0) + trustGain;
              uRec.lastDealAt = now();
              uRec.updatedAt = now();
              await writeJsonKV(userKeyById(buyUserId), uRec);
            }
          } catch {
          }
        }
      }
      try {
        const items = await readJsonKV("dealLog", []);
        const arr = Array.isArray(items) ? items : [];
        arr.unshift({
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          kind: "STATUS",
          dealType: "BUY",
          id: String(offerId),
          offerId: String(offerId),
          status,
          data: {
            step: "BUY_CHAT_DECISION",
            prevStatus,
            by: actorShape
          }
        });
        await writeJsonKV("dealLog", arr.slice(0, 2e3));
      } catch {
      }
      try {
        if (status === "SUCCESS" && offer.qrOrder) {
          const amountE6 = Number(offer?.qrOrder?.settledAmountE6 || 0) || Math.trunc(Number(offer.amountRub || 0) / Number(offer.rate || 0) * 1e6);
          const creatorUser = await resolveUserByIdShape(
            String(offer?.qrOrder?.createdBy?.id || offer?.user?.id || "")
          );
          const executorUser = await resolveUserByIdShape(String(offer?.executorUser?.id || ""));
          ctx.waitUntil(
            tgNotifyWallet({
              kind: "QRPAY_CREATOR_DEBIT",
              user: creatorUser,
              req,
              refId: String(offer.id || offerId),
              step: "BUY_QR_SUCCESS",
              lines: [
                "\u0421\u0434\u0435\u043B\u043A\u0430: BUY / QR",
                "\u0421\u0442\u0430\u0442\u0443\u0441: SUCCESS",
                `\u0421\u043F\u0438\u0441\u0430\u043D\u043E \u0443 \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044F: ${fmtUsdtE6(amountE6)}`,
                `\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C: ${executorUser?.username ? "@" + executorUser.username : executorUser?.id || "\u2014"}`,
                `\u0421\u0443\u043C\u043C\u0430 \u0432 \u20BD: ${Number(offer.amountRub || 0) || 0}`,
                `\u041A\u0443\u0440\u0441: ${Number(offer.rate || 0) || 0}`
              ]
            })
          );
          ctx.waitUntil(
            tgNotifyWallet({
              kind: "QRPAY_EXECUTOR_CREDIT",
              user: executorUser,
              req,
              refId: String(offer.id || offerId),
              step: "BUY_QR_SUCCESS",
              lines: [
                "\u0421\u0434\u0435\u043B\u043A\u0430: BUY / QR",
                "\u0421\u0442\u0430\u0442\u0443\u0441: SUCCESS",
                `\u0417\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E: ${fmtUsdtE6(amountE6)}`,
                `\u0421\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044C QR: ${creatorUser?.username ? "@" + creatorUser.username : creatorUser?.id || "\u2014"}`,
                `\u0421\u0443\u043C\u043C\u0430 \u0432 \u20BD: ${Number(offer.amountRub || 0) || 0}`,
                `\u041A\u0443\u0440\u0441: ${Number(offer.rate || 0) || 0}`
              ]
            })
          );
        } else if (status === "SUCCESS") {
          const amountE6 = Number(offer.walletCreditedE6 || 0) || Math.trunc(Number(offer.amountRub || 0) / Number(offer.rate || 0) * 1e6);
          const buyerUser = await resolveUserByIdShape(String(offer?.user?.id || ""));
          ctx.waitUntil(
            tgNotifyWallet({
              kind: "P2P_BUY_CREDIT",
              user: buyerUser,
              req,
              refId: String(offer.id || offerId),
              step: "BUY_SUCCESS",
              lines: [
                "\u0421\u0434\u0435\u043B\u043A\u0430: BUY",
                "\u0421\u0442\u0430\u0442\u0443\u0441: SUCCESS",
                `\u041D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E: ${fmtUsdtE6(amountE6)}`,
                `\u0421\u0443\u043C\u043C\u0430 \u0432 \u20BD: ${Number(offer.amountRub || 0) || 0}`,
                `\u041A\u0443\u0440\u0441: ${Number(offer.rate || 0) || 0}`,
                `\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B/\u0431\u0430\u043D\u043A: ${String(offer.payBank || offer.method || "\u2014")}`
              ]
            })
          );
          // ── Moon Wallet deal complete webhook ──────────────────
          // offer.moonWalletUser / offer.user.mwTgId were populated above
          // from reserves or buyAmountRequest before this block runs.
          const mwTgIdDeal = String(offer.moonWalletUser?.tgId || offer.user?.mwTgId || "").trim();
          const mwWebhookBaseDeal = String(offer.user?.mwWebhookBase || offer.moonWalletUser?.mwWebhookBase || (env.MW_WEBHOOK_BASE || "https://client-qr-pay.kireeshka73.workers.dev")).trim();
          if (mwTgIdDeal) {
            ctx.waitUntil(
              fetch(mwWebhookBaseDeal + "/api/internal/mw_deal_complete", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-MW-Secret": String(env?.BOT_TOKEN || "").slice(0, 20),
                },
                body: JSON.stringify({
                  tgId: mwTgIdDeal,
                  offerId: String(offer.id || offerId),
                  amountRub: Number(offer.amountRub || 0),
                  rate: Number(offer.rate || 0),
                  amountUsdt: amountE6 / 1e6,
                  mwReqId: String(offer.user?.mwReqId || ""),
                }),
              }).catch(() => {})
            );
          }
        }
        ctx.waitUntil(
          tgNotifyAdmin({
            title: status === "SUCCESS" ? "\u2705 BUY: \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u043E \u0438\u0437 \u0447\u0430\u0442\u0430" : "\u274C BUY: \u043E\u0442\u043A\u043B\u043E\u043D\u0435\u043D\u043E \u0438\u0437 \u0447\u0430\u0442\u0430",
            user: offer.user || null,
            deal: "BUY " + String(offerId),
            step: "BUY_CHAT_DECISION",
            req,
            lines: [
              "\u0420\u0435\u0448\u0435\u043D\u0438\u0435: " + status,
              actorShape?.username ? "\u041A\u0442\u043E \u043D\u0430\u0436\u0430\u043B: @" + actorShape.username : "\u041A\u0442\u043E \u043D\u0430\u0436\u0430\u043B userId: " + String(actorShape?.id || ""),
              "\u0421\u0443\u043C\u043C\u0430: " + String(offer.amountRub || 0) + " RUB",
              "\u0411\u0430\u043D\u043A: " + String(offer.payBank || ""),
              "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B: " + String(offer.payRequisite || "")
            ]
          })
        );
        const userMsg = status === "SUCCESS" ? "\u2705 \u0421\u0434\u0435\u043B\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430!\nUSDT \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u044B \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u{1F4B0}\u{1F389}" : "\u274C \u041E\u043F\u043B\u0430\u0442\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430.\n\u0421\u0442\u0430\u0442\u0443\u0441 \u0441\u0434\u0435\u043B\u043A\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D, \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0443\u0432\u0438\u0434\u0438\u0442 \u044D\u0442\u043E \u0432 \u043F\u0430\u043D\u0435\u043B\u0438.";
        ctx.waitUntil(tgNotifyUserText(offer.user || null, userMsg));
      } catch {
      }
      try {
        if (offer.sourceKind === "BUY_AMOUNT_CHAT_REPLY") {
          const sourceMsg = status === "SUCCESS" ? `\u2705 \u0421\u0434\u0435\u043B\u043A\u0430 BUY ${offerId} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E` : `\u274C \u0421\u0434\u0435\u043B\u043A\u0430 BUY ${offerId} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u043D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u043E`;
          ctx.waitUntil(tgNotifyOfferSourceChat(offer, sourceMsg));
          if (status === "SUCCESS") {
            const sourceChatId = String(offer?.sourceChat?.id || "").trim();
            if (sourceChatId) {
              try {
                const debtKey = `chatDebt:${sourceChatId}`;
                const prev = await readJsonKV(debtKey, { totalE6: 0, deals: [] });
                const chatRate = Number(offer.sourceCustomRate || 0) > 0 ? Number(offer.sourceCustomRate) : Number(offer.rate || 1);
                const dealUsdtE6 = Math.trunc(Number(offer.amountRub || 0) / chatRate * 1e6);
                const newTotalE6 = (Number(prev.totalE6) || 0) + dealUsdtE6;
                const deals = Array.isArray(prev.deals) ? prev.deals : [];
                deals.push({ offerId, amountRub: Number(offer.amountRub || 0), rate: chatRate, usdtE6: dealUsdtE6, ts: now() });
                await writeJsonKV(debtKey, { totalE6: newTotalE6, deals: deals.slice(-500) });
                const debtUsdt = (newTotalE6 / 1e6).toFixed(2);
                ctx.waitUntil(
                  tgSendMessageEx(
                    sourceChatId,
                    `\u{1F4B0} \u0414\u043E\u043B\u0433 \u043F\u043E \u0447\u0430\u0442\u0443: ${debtUsdt} USDT
(+${(dealUsdtE6 / 1e6).toFixed(2)} USDT \u0437\u0430 \u0441\u0434\u0435\u043B\u043A\u0443 ${offerId})`,
                    {
                      reply_markup: JSON.stringify({
                        inline_keyboard: [
                          [{ text: "\u041E\u0431\u043D\u0443\u043B\u0438\u0442\u044C", callback_data: `chatdebt_reset:${sourceChatId}` }],
                          [{ text: "\u2795 \u041D\u0430\u0447\u0438\u0441\u043B\u0438\u0442\u044C", callback_data: `chatdebt_add:${sourceChatId}` }, { text: "\u2796 \u0421\u043F\u0438\u0441\u0430\u0442\u044C", callback_data: `chatdebt_sub:${sourceChatId}` }]
                        ]
                      })
                    }
                  ).catch(() => {
                  })
                );
              } catch {
              }
            }
          }
        }
      } catch {
      }
      return { ok: true, offer, prevStatus, nextStatus: status };
    }
    __name(setBuyOfferStatusFromChat, "setBuyOfferStatusFromChat");
    __name2(setBuyOfferStatusFromChat, "setBuyOfferStatusFromChat");
    if (url.pathname === "/api/public/set_wallet" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "");
      const reserveId = String(body.reserveId || body.reservedId || "").trim();
      const walletTypeRaw = body.walletType ?? body.wallet_type ?? body.network ?? body.chain ?? body.type ?? body.walletNetwork;
      const walletValueRaw = body.walletValue ?? body.wallet_value ?? body.address ?? body.wallet ?? body.uid ?? body.value;
      const walletType = String(walletTypeRaw || "").trim().toUpperCase().replace(/\s+/g, "_");
      const walletValue = String(walletValueRaw || "").trim();
      if (!id || !reserveId) return bad("Missing id or reserveId");
      if (!walletType || !walletValue) return bad("Missing walletType or walletValue");
      const reserves = await readJsonKV("reserves", {});
      const r = reserves[id];
      if (!r || r.reserveId !== reserveId) return bad("Reserve not found", 404);
      const buyOffers = await readJsonKV("buyOffers", []);
      const idx = buyOffers.findIndex((o) => o.id === id);
      if (idx < 0) return bad("Offer not found", 404);
      buyOffers[idx].wallet = { type: walletType, value: walletValue, ts: now() };
      try {
        const actor = await resolveActorUser(request, buyOffers[idx].user || null);
        const u = ensureUserShape(actor);
        if (u && (u.id || u.username) && !buyOffers[idx].user) buyOffers[idx].user = u;
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F45B} BUY: \u0443\u043A\u0430\u0437\u0430\u043D \u043A\u043E\u0448\u0435\u043B\u0451\u043A",
            user: buyOffers[idx].user || null,
            deal: "BUY " + id,
            step: "BUY_WALLET",
            req: request,
            lines: ["\u0422\u0438\u043F: " + walletType, "\u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435: " + walletValue]
          })
        );
      } catch {
      }
      try {
        ctx.waitUntil(
          tgNotifyUserText(
            buyOffers[idx].user || null,
            `\u{1F45B} \u041A\u043E\u0448\u0435\u043B\u0451\u043A \u0434\u043B\u044F \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F USDT \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.
\u0422\u0438\u043F: ${walletType}
\u0410\u0434\u0440\u0435\u0441/UID: ${shortMid(walletValue)} \u2705`
          )
        );
      } catch {
      }
      await writeJsonKV("buyOffers", buyOffers);
      return json({ ok: true });
    }
    if (url.pathname === "/api/public/cancel_reserve" && request.method === "POST") {
      await cleanupExpiredReserves();
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "");
      const reserveId = String(body.reserveId || body.reservedId || "");
      const cancelReason = String(body.cancelReason || body.reason || "").trim();
      if (!id || !reserveId) return bad("Missing id or reserveId");
      const reserves = await readJsonKV("reserves", {});
      const r = reserves[id];
      if (r && (r.locked === true || r.paidAt)) return bad("Cannot cancel after payment marked", 409);
      const reserveAgeMs = r ? Math.max(0, now() - Number(r.ts || r.lastSeenAt || 0)) : 0;
      if (r) {
        delete reserves[id];
        await writeJsonKV("reserves", reserves);
      }
      try {
        if (env.RESERVATIONS_DO) {
          const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-offer-locks"));
          ctx.waitUntil(
            stub.fetch("https://do/release_buy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ offerId: id, reserveId })
            })
          );
        }
      } catch {
      }
      const buyOffers = await readJsonKV("buyOffers", []);
      const idx = buyOffers.findIndex((o) => o.id === id);
      if (idx >= 0) {
        const st = String(buyOffers[idx].status || "NEW").toUpperCase();
        if (st === "NEW" || st === "ON_PAY" || st === "HTX_WAITING" || st === "BYBIT_WAITING") {
          buyOffers[idx].frozen = false;
          buyOffers[idx].status = "NEW";
          buyOffers[idx].wallet = null;
        }
        await writeJsonKV("buyOffers", buyOffers);
      }
      try {
        if (idx >= 0 && buyOffers[idx].sourceKind === "BUY_AMOUNT_CHAT_REPLY" && reserveAgeMs > 15e3) {
          const reasonText = cancelReason ? `
\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ${cancelReason}` : "";
          ctx.waitUntil(
            tgNotifyOfferSourceChat(
              buyOffers[idx],
              `\u26AA\uFE0F \u041A\u043B\u0438\u0435\u043D\u0442 \u043E\u0442\u043C\u0435\u043D\u0438\u043B \u0437\u0430\u044F\u0432\u043A\u0443 BUY ${id}${reasonText}`
            )
          );
        }
      } catch {
      }
      try {
        const offer = idx >= 0 ? buyOffers[idx] : null;
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u26AA\uFE0F BUY: \u043A\u043B\u0438\u0435\u043D\u0442 \u043E\u0442\u043C\u0435\u043D\u0438\u043B \u043E\u0440\u0434\u0435\u0440",
            user: r && r.user || offer && offer.user || null,
            deal: "BUY " + id,
            step: "BUY_CANCEL",
            req: request,
            lines: [
              "\u0421\u0443\u043C\u043C\u0430: " + String(offer?.amountRub || "\u2014") + " RUB",
              "\u0411\u0430\u043D\u043A: " + String(offer?.payBank || "\u2014"),
              "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B: " + String(offer?.payRequisite || "\u2014"),
              cancelReason ? "\u041F\u0440\u0438\u0447\u0438\u043D\u0430: " + cancelReason : ""
            ].filter(Boolean)
          })
        );
      } catch {
      }
      const needsProof = body.needsProof === true || body.needsProof === "true";
      const cancelledOffer = idx >= 0 ? buyOffers[idx] : null;
      const cancelUser = r && r.user || cancelledOffer && cancelledOffer.user || null;
      const cancelUserId = String(cancelUser?.id || "").trim();
      if (!needsProof) {
        if (cancelUserId) {
          try {
            const uRec = await readJsonKV(userKeyById(cancelUserId), null);
            if (uRec) {
              const bs = uRec.buyStats || {};
              bs.totalCancelled = (bs.totalCancelled || 0) + 1;
              bs.consecutiveCancels = (bs.consecutiveCancels || 0) + 1;
              uRec.buyStats = bs;
              uRec.updatedAt = now();
              await writeJsonKV(userKeyById(cancelUserId), uRec);
              const bComp = bs.totalCompleted || 0;
              const bCanc = bs.totalCancelled || 0;
              const bTotal = bComp + bCanc;
              const bRate = bTotal > 0 ? bComp / bTotal : 1;
              const autoBan = bRate < 0.5 && bComp >= 8 || bComp === 0 && (bs.consecutiveCancels || 0) >= 2;
              if (autoBan && !(Number(uRec.buyBannedUntil || 0) > now())) {
                uRec.buyBannedUntil = now() + 3 * 24 * 60 * 60 * 1e3;
                uRec.buyBanReason = "AUTO_CANCEL_RATE";
                await writeJsonKV(userKeyById(cancelUserId), uRec);
                try {
                  ctx.waitUntil(tgNotifyAdmin({
                    title: "\u{1F6AB} BUY: \u0430\u0432\u0442\u043E-\u0431\u0430\u043D \u043F\u043E\u043A\u0443\u043F\u043A\u0438",
                    user: cancelUser,
                    deal: "BUY " + id,
                    step: "BUY_AUTOBAN",
                    req: request,
                    lines: [
                      "\u041F\u0440\u0438\u0447\u0438\u043D\u0430: \u043D\u0438\u0437\u043A\u0438\u0439 completion rate",
                      "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: " + bComp,
                      "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E: " + bCanc,
                      "Rate: " + Math.round(bRate * 100) + "%",
                      "\u041E\u0442\u043C\u0435\u043D \u043F\u043E\u0434\u0440\u044F\u0434: " + (bs.consecutiveCancels || 0)
                    ]
                  }));
                } catch {
                }
              }
            }
          } catch {
          }
        }
        return json({ ok: true });
      } else {
        const cancelId = id + "_" + now();
        try {
          const pendingMap = await readJsonKV("pendingCancelProofs", {});
          pendingMap[cancelId] = {
            offerId: id,
            userId: cancelUserId,
            cancelReason,
            sourceChat: cancelledOffer ? cancelledOffer.sourceChat || null : null,
            sourceMessageId: cancelledOffer ? cancelledOffer.sourceMessageId || cancelledOffer.sourceReplyToMessageId || null : null,
            offer: cancelledOffer ? { amountRub: cancelledOffer.amountRub, payBank: cancelledOffer.payBank, payRequisite: cancelledOffer.payRequisite } : null,
            user: cancelUser,
            createdAt: now()
          };
          const pkeys = Object.keys(pendingMap);
          if (pkeys.length > 500) {
            pkeys.sort((a, b) => Number(pendingMap[a].createdAt || 0) - Number(pendingMap[b].createdAt || 0));
            for (let i = 0; i < pkeys.length - 500; i++) delete pendingMap[pkeys[i]];
          }
          await writeJsonKV("pendingCancelProofs", pendingMap);
        } catch {
        }
        return json({ ok: true, cancelId });
      }
    }
    if (url.pathname === "/api/public/cancel_proof" && request.method === "POST") {
      let cancelFD;
      try {
        cancelFD = await request.formData();
      } catch {
        return bad("Invalid form data", 400);
      }
      const cancelId = String(cancelFD.get("cancelId") || "").trim();
      const orderId = String(cancelFD.get("orderId") || "").trim();
      const cancelReasonProof = String(cancelFD.get("cancelReason") || "").trim();
      const screenshotFile = cancelFD.get("screenshot");
      let pendingProof = null;
      if (cancelId) {
        try {
          const allP = await readJsonKV("pendingCancelProofs", {});
          pendingProof = allP[cancelId] || null;
          if (pendingProof) {
            delete allP[cancelId];
            await writeJsonKV("pendingCancelProofs", allP);
          }
        } catch {
        }
      }
      const proofUserId = pendingProof ? pendingProof.userId || "" : "";
      const proofCancelUser = pendingProof ? pendingProof.user || null : null;
      const proofReason = cancelReasonProof || (pendingProof ? pendingProof.cancelReason || "" : "");
      if (proofUserId) {
        try {
          const uRec = await readJsonKV(userKeyById(proofUserId), null);
          if (uRec) {
            const bs = uRec.buyStats || {};
            bs.totalCancelledExcused = (bs.totalCancelledExcused || 0) + 1;
            uRec.buyStats = bs;
            uRec.updatedAt = now();
            await writeJsonKV(userKeyById(proofUserId), uRec);
          }
        } catch {
        }
      }
      if (screenshotFile && typeof screenshotFile === "object") {
        const cap = [
          "\u{1F4F8} \u0414\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E \u043E\u0442\u043C\u0435\u043D\u044B BUY",
          "\u041E\u0440\u0434\u0435\u0440: " + (orderId || (pendingProof ? pendingProof.offerId : "\u2014") || "\u2014"),
          "\u041F\u0440\u0438\u0447\u0438\u043D\u0430: " + (proofReason || "\u2014"),
          proofCancelUser ? "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C: @" + String(proofCancelUser.username || proofCancelUser.id || "\u2014") : ""
        ].filter(Boolean).join("\n");
        try {
          ctx.waitUntil(tgSendFileToChat(env.TG_CHAT_ID, "photo", screenshotFile, screenshotFile.name || "proof.jpg", { caption: cap }));
        } catch {
        }
        if (pendingProof && pendingProof.sourceChat && pendingProof.sourceChat.id) {
          try {
            const srcX = { caption: cap + "\n\u2705 \u041E\u0442\u043C\u0435\u043D\u0430 \u043E\u043F\u0440\u0430\u0432\u0434\u0430\u043D\u0430 \u2014 \u0440\u0435\u0439\u0442\u0438\u043D\u0433 \u043D\u0435 \u0443\u043F\u0430\u0434\u0451\u0442" };
            if (pendingProof.sourceMessageId) srcX.reply_to_message_id = Number(pendingProof.sourceMessageId);
            ctx.waitUntil(tgSendFileToChat(String(pendingProof.sourceChat.id), "photo", screenshotFile, screenshotFile.name || "proof.jpg", srcX));
          } catch {
          }
        }
      }
      return json({ ok: true });
    }
    if (url.pathname === "/api/public/cancel_skip_proof" && request.method === "POST") {
      const skipBody = await request.json().catch(() => ({}));
      const skipCancelId = String(skipBody.cancelId || "").trim();
      const skipOrderId = String(skipBody.orderId || "").trim();
      let skipPending = null;
      if (skipCancelId) {
        try {
          const allP = await readJsonKV("pendingCancelProofs", {});
          skipPending = allP[skipCancelId] || null;
          if (skipPending) {
            delete allP[skipCancelId];
            await writeJsonKV("pendingCancelProofs", allP);
          }
        } catch {
        }
      }
      const skipUserId = skipPending ? skipPending.userId || "" : "";
      const skipCancelUser = skipPending ? skipPending.user || null : null;
      if (skipUserId) {
        try {
          const uRec = await readJsonKV(userKeyById(skipUserId), null);
          if (uRec) {
            const bs = uRec.buyStats || {};
            bs.totalCancelled = (bs.totalCancelled || 0) + 1;
            bs.consecutiveCancels = (bs.consecutiveCancels || 0) + 1;
            uRec.buyStats = bs;
            uRec.updatedAt = now();
            await writeJsonKV(userKeyById(skipUserId), uRec);
            const bComp = bs.totalCompleted || 0;
            const bCanc = bs.totalCancelled || 0;
            const bTotal = bComp + bCanc;
            const bRate = bTotal > 0 ? bComp / bTotal : 1;
            const autoBan = bRate < 0.5 && bComp >= 8 || bComp === 0 && (bs.consecutiveCancels || 0) >= 2;
            if (autoBan && !(Number(uRec.buyBannedUntil || 0) > now())) {
              uRec.buyBannedUntil = now() + 3 * 24 * 60 * 60 * 1e3;
              uRec.buyBanReason = "AUTO_CANCEL_RATE";
              await writeJsonKV(userKeyById(skipUserId), uRec);
              try {
                ctx.waitUntil(tgNotifyAdmin({
                  title: "\u{1F6AB} BUY: \u0430\u0432\u0442\u043E-\u0431\u0430\u043D \u043F\u043E\u043A\u0443\u043F\u043A\u0438",
                  user: skipCancelUser,
                  deal: "BUY " + (skipOrderId || (skipPending ? skipPending.offerId : "") || ""),
                  step: "BUY_AUTOBAN",
                  req: request,
                  lines: [
                    "\u041F\u0440\u0438\u0447\u0438\u043D\u0430: \u043D\u0438\u0437\u043A\u0438\u0439 rate (\u043F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u043B \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E)",
                    "\u0412\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E: " + bComp,
                    "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E: " + bCanc,
                    "Rate: " + Math.round(bRate * 100) + "%",
                    "\u041E\u0442\u043C\u0435\u043D \u043F\u043E\u0434\u0440\u044F\u0434: " + (bs.consecutiveCancels || 0)
                  ]
                }));
              } catch {
              }
            }
          }
        } catch {
        }
      }
      return json({ ok: true });
    }
    if (url.pathname === "/api/public/cancel_sell_reserve" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      const reserveId = String(body.reserveId || body.reservedId || "").trim();
      if (!id || !reserveId) return bad("Missing id or reserveId");
      const deals = await readJsonKV(SELL_DEALS_KEY, []);
      const arr = Array.isArray(deals) ? deals : [];
      const idx = arr.findIndex(
        (d) => (String(d.dealId || "") === id || String(d.offerId || "") === id) && String(d.secret || "") === reserveId
      );
      if (idx >= 0) {
        arr.splice(idx, 1);
        await writeJsonKV(SELL_DEALS_KEY, arr);
      }
      return json({ ok: true });
    }
    if (url.pathname === "/api/public/mark_paid" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      const reserveId = String(body.reserveId || body.reservedId || body.reserve_id || "").trim();
      if (!id) return bad("Missing id");
      const reserves = await readJsonKV("reserves", {});
      const r = reserves[id];
      if (!r) {
        try {
          const items = await readJsonKV("dealLog", []);
          const arr = Array.isArray(items) ? items : [];
          arr.unshift({
            ts: (/* @__PURE__ */ new Date()).toISOString(),
            kind: "STATUS",
            dealType: "BUY",
            id,
            offerId: id,
            status: "PAID_FAILED_NO_RESERVE",
            data: { step: "BUY_MARK_PAID", body }
          });
          await writeJsonKV("dealLog", arr.slice(0, 2e3));
        } catch {
        }
        return bad("Reserve not found", 404);
      }
      if (reserveId && String(r.reserveId || "") !== reserveId) {
        try {
          const items = await readJsonKV("dealLog", []);
          const arr = Array.isArray(items) ? items : [];
          arr.unshift({
            ts: (/* @__PURE__ */ new Date()).toISOString(),
            kind: "STATUS",
            dealType: "BUY",
            id,
            offerId: id,
            status: "PAID_FAILED_BAD_RESERVEID",
            data: { step: "BUY_MARK_PAID", reserveId, real: r.reserveId, body }
          });
          await writeJsonKV("dealLog", arr.slice(0, 2e3));
        } catch {
        }
        return bad("Reserve not found", 404);
      }
      r.locked = true;
      r.paidAt = now();
      r.lastSeenAt = now();
      reserves[id] = r;
      await writeJsonKV("reserves", reserves);
      const buyOffers = await readJsonKV("buyOffers", []);
      const idx = buyOffers.findIndex((o) => String(o.id || "") === id);
      if (idx < 0) return bad("Offer not found", 404);
      const prevStatus = String(buyOffers[idx].status || "NEW").toUpperCase();
      buyOffers[idx].status = "PAID";
      buyOffers[idx].frozen = true;
      buyOffers[idx].paidAt = now();
      try {
        const items = await readJsonKV("dealLog", []);
        const arr = Array.isArray(items) ? items : [];
        arr.unshift({
          ts: (/* @__PURE__ */ new Date()).toISOString(),
          kind: "STATUS",
          dealType: "BUY",
          id,
          offerId: id,
          status: "PAID",
          data: { step: "BUY_MARK_PAID", prevStatus, reserveId: r.reserveId }
        });
        await writeJsonKV("dealLog", arr.slice(0, 2e3));
      } catch {
      }
      try {
        const actor = await resolveActorUser(request, buyOffers[idx].user || r.user || null);
        const u = ensureUserShape(actor);
        if (u && (u.id || u.username) && !buyOffers[idx].user) buyOffers[idx].user = u;
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F7E1} BUY: \u043A\u043B\u0438\u0435\u043D\u0442 \u043D\u0430\u0436\u0430\u043B \xAB\u042F \u043E\u043F\u043B\u0430\u0442\u0438\u043B\xBB",
            user: buyOffers[idx].user || r.user || null,
            deal: "BUY " + id,
            step: "BUY_PAID",
            req: request,
            lines: [
              "Offer ID: " + id,
              "Reserve ID: " + String(r.reserveId || "")
            ,
                ...(r.toAddress ? ["📤 Отправить USDT на: " + r.toAddress] : []),
                ...(r.moonWalletUser?.name ? ["Moon Wallet: " + r.moonWalletUser.name] : [])]
          })
        );
      } catch {
      }
      try {
        ctx.waitUntil(
          tgNotifyUserText(
            buyOffers[idx].user || r.user || null,
            `\u{1F7E1} \u041E\u043F\u043B\u0430\u0442\u0430 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u0430 \u2705
\u041C\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 \u0438 \u0441\u043A\u043E\u0440\u043E \u043E\u0431\u043D\u043E\u0432\u0438\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u0441\u0434\u0435\u043B\u043A\u0438 \u23F3`
          )
        );
      } catch {
      }
      try {
        if (buyOffers[idx].sourceKind === "BUY_AMOUNT_CHAT_REPLY") {
          ctx.waitUntil(
            tgNotifyOfferSourceChat(
              buyOffers[idx],
              `\u{1F7E1} \u041A\u043B\u0438\u0435\u043D\u0442 \u043E\u0442\u043C\u0435\u0442\u0438\u043B \u043E\u043F\u043B\u0430\u0442\u0443 \u043F\u043E BUY ${id}`
            )
          );
        }
      } catch {
      }
      await writeJsonKV("buyOffers", buyOffers);
      return json({ ok: true, status: "PAID" });
    }
    if (url.pathname === "/api/public/submit_proof" && request.method === "POST") {
      const ct = request.headers.get("Content-Type") || "";
      if (!ct.includes("multipart/form-data")) return bad("Expected multipart/form-data");
      const fd = await request.formData();
      const id = String(fd.get("id") || "");
      const reserveId = String(fd.get("reserveId") || fd.get("reservedId") || "");
      const bankFrom = String(fd.get("bankFrom") || "");
      const proofType = String(fd.get("proofType") || "OTHER");
      const alphaLink = String(fd.get("alphaLink") || "");
      if (!id || !reserveId) return bad("Missing id or reserveId");
      const reserves = await readJsonKV("reserves", {});
      const r = reserves[id];
      if (!r || r.reserveId !== reserveId) return bad("Reserve not found", 404);
      const buyOffers = await readJsonKV("buyOffers", []);
      const idx = buyOffers.findIndex((o) => o.id === id);
      if (idx < 0) return bad("Offer not found", 404);
      const uploadedFiles = [];
      const outFiles = [];
      const collectFile = /* @__PURE__ */ __name2((kind, fileObj, fallbackName) => {
        if (!(fileObj instanceof File)) return;
        uploadedFiles.push({
          kind,
          file: fileObj,
          name: String(fileObj.name || fallbackName || `${kind}.bin`)
        });
      }, "collectFile");
      collectFile("pdf1", fd.get("pdf1"), "check.pdf");
      collectFile("pdf2", fd.get("pdf2"), "stmt.pdf");
      collectFile("photo", fd.get("photo"), "screenshot.jpg");
      collectFile("video", fd.get("video"), "video.mp4");
      const pdfVerifyResults = [];
      for (const item of uploadedFiles) {
        if ((item.kind === "pdf1" || item.kind === "pdf2") && item.file && item.file.size > 0) {
          try {
            const buf = await item.file.arrayBuffer();
            const result = analyzePdfMeta(new Uint8Array(buf), item.name);
            pdfVerifyResults.push(result);
          } catch (e) {
            pdfVerifyResults.push({ file: item.name, error: String(e?.message || e), suspicious: true, reasons: ["\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C PDF"] });
          }
        }
      }
      const hasSuspicious = pdfVerifyResults.some((r2) => r2.suspicious);
      for (const item of uploadedFiles) {
        const adminKind = item.kind === "video" ? "video" : "document";
        const tg = await tgSendFile(adminKind, item.file, item.name);
        outFiles.push({ kind: item.kind, name: item.name, tg });
      }
      buyOffers[idx].checkInfo = {
        bankFrom,
        proofType,
        alphaLink: alphaLink || "",
        files: outFiles,
        pdfVerify: pdfVerifyResults.length ? pdfVerifyResults : void 0,
        pdfSuspicious: hasSuspicious || void 0
      };
      buyOffers[idx].status = "ON_CHECK";
      buyOffers[idx].updatedAt = now();
      const hasVerifFile = uploadedFiles.some((f) => f.kind === "photo" || f.kind === "video");
      if (hasVerifFile) {
        try {
          const actor2 = await resolveActorUser(request, buyOffers[idx].user || null);
          if (actor2 && actor2.id) {
            const uRec2 = await readJsonKV(userKeyById(String(actor2.id)), null);
            if (uRec2) {
              uRec2.lastVerificationAt = now();
              await writeJsonKV(userKeyById(String(actor2.id)), uRec2);
            }
          }
        } catch {
        }
      }
      try {
        const sourceChatId = String(buyOffers[idx]?.sourceChat?.id || "").trim();
        const replyToMessageId = Number(
          buyOffers[idx]?.sourceMessageId || buyOffers[idx]?.sourceReplyToMessageId || 0
        ) || void 0;
        if (sourceChatId) {
          for (const item of uploadedFiles) {
            const sendKind = item.kind === "video" ? "video" : item.kind === "photo" ? "photo" : "document";
            await tgSendFileToChat(
              sourceChatId,
              sendKind,
              item.file,
              item.name,
              replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}
            );
          }
          const decisionText = [
            `\u{1F4B3} \u041A\u043B\u0438\u0435\u043D\u0442 \u043F\u0440\u0438\u0441\u043B\u0430\u043B \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 \u043E\u043F\u043B\u0430\u0442\u044B \u043F\u043E BUY ${id}`,
            `\u0421\u0443\u043C\u043C\u0430: ${String(buyOffers[idx].amountRub || 0)} RUB`,
            `\u0411\u0430\u043D\u043A \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u0435\u043B\u044F: ${bankFrom || "\u2014"}`,
            `\u0422\u0438\u043F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F: ${proofType || "\u2014"}`,
            alphaLink ? `AlphaLink: ${alphaLink}` : "",
            "",
            "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442:"
          ].filter(Boolean).join("\n");
          const decisionMsg = await tgSendMessageEx(sourceChatId, decisionText, {
            ...replyToMessageId ? { reply_to_message_id: replyToMessageId } : {},
            reply_markup: {
              inline_keyboard: [[
                { text: "\u2705 \u0423\u0441\u043F\u0435\u0448\u043D\u043E", callback_data: buyProofDecisionCallbackData(id, "success") },
                { text: "\u274C \u041D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u043E", callback_data: buyProofDecisionCallbackData(id, "error") }
              ]]
            }
          });
          buyOffers[idx].checkInfo.sourceChatDecisionMessage = {
            chatId: String(sourceChatId),
            messageId: Number(decisionMsg?.message_id || 0) || null,
            sentAt: now()
          };
        }
      } catch (e) {
        buyOffers[idx].checkInfo.sourceChatForwardError = String(e?.message || e || "forward_failed");
      }
      try {
        const actor = await resolveActorUser(request, buyOffers[idx].user || null);
        const u = ensureUserShape(actor);
        if (u && (u.id || u.username) && !buyOffers[idx].user) buyOffers[idx].user = u;
        const names = Array.isArray(outFiles) ? outFiles.map((x) => x.kind + ":" + x.name).join(", ") : "";
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F4CE} BUY: \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430",
            user: buyOffers[idx].user || null,
            deal: "BUY " + id,
            step: "BUY_PROOF",
            req: request,
            lines: [
              "\u0411\u0430\u043D\u043A \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u0435\u043B\u044F: " + (bankFrom || ""),
              "\u0422\u0438\u043F: " + (proofType || ""),
              alphaLink ? "AlphaLink: " + alphaLink : "",
              "\u0424\u0430\u0439\u043B\u044B: " + String(outFiles.length) + (names ? " (" + names + ")" : "")
            ].filter(Boolean)
          })
        );
      } catch {
      }
      if (pdfVerifyResults.length > 0) {
        try {
          const anyBad = pdfVerifyResults.some((r2) => r2.suspicious);
          const icon = anyBad ? "\u26A0\uFE0F\u{1F534}" : "\u2705";
          const title = anyBad ? "\u041F\u041E\u0414\u041E\u0417\u0420\u0418\u0422\u0415\u041B\u042C\u041D\u042B\u0419 \u0427\u0415\u041A" : "\u0427\u0415\u041A \u041F\u0420\u041E\u0412\u0415\u0420\u0415\u041D";
          const warnLines = [`${icon} ${title} \u2014 BUY ${id}`];
          const usr = buyOffers[idx].user;
          if (usr) warnLines.push("\u041A\u043B\u0438\u0435\u043D\u0442: " + (usr.username ? "@" + usr.username : "") + (usr.firstName ? " " + usr.firstName : "") + (usr.id ? " [" + usr.id + "]" : ""));
          warnLines.push("\u0421\u0443\u043C\u043C\u0430: " + String(buyOffers[idx].amountRub || 0) + " RUB");
          warnLines.push("");
          for (const pv of pdfVerifyResults) {
            warnLines.push("\u{1F4C4} " + (pv.file || "pdf"));
            if (pv.suspicious) {
              warnLines.push("  \u{1F6A9} \u041F\u0440\u0438\u0447\u0438\u043D\u044B:");
              for (const reason of pv.reasons || []) warnLines.push("  \u2022 " + reason);
            } else {
              warnLines.push("  \u2705 \u0427\u0438\u0441\u0442\u043E \u2014 \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440 \u0432 \u0431\u0435\u043B\u043E\u043C \u0441\u043F\u0438\u0441\u043A\u0435");
            }
            if (pv.creator) warnLines.push("  Creator: " + pv.creator);
            if (pv.producer) warnLines.push("  Producer: " + pv.producer);
            if (pv.creationDate) warnLines.push("  Created: " + pv.creationDate);
            if (pv.modDate && pv.modDate !== pv.creationDate) warnLines.push("  Modified: " + pv.modDate);
            if (pv.eofCount > 1) warnLines.push("  %%EOF: " + pv.eofCount + " \u26A0\uFE0F");
            warnLines.push("  Whitelist: " + (pv.whitelisted ? "\u2705 \u0434\u0430" : "\u274C \u043D\u0435\u0442"));
            warnLines.push("");
          }
          const warnText = warnLines.join("\n");
          ctx.waitUntil(tgSendMessageEx(env.TG_CHAT_ID, warnText, {}));
          const srcChatId = String(buyOffers[idx]?.sourceChat?.id || "").trim();
          if (srcChatId) {
            const srcReplyTo = Number(buyOffers[idx]?.sourceMessageId || buyOffers[idx]?.sourceReplyToMessageId || 0) || void 0;
            const srcLines = [anyBad ? "\u26A0\uFE0F\u{1F534} \u0427\u0415\u041A \u041D\u0415 \u041E\u0420\u0418\u0413\u0418\u041D\u0410\u041B\u0415\u041D" : "\u2705 \u0427\u0415\u041A \u041E\u0420\u0418\u0413\u0418\u041D\u0410\u041B\u0415\u041D"];
            srcLines.push("");
            srcLines.push("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 PDF:");
            for (const pv of pdfVerifyResults) {
              srcLines.push("");
              srcLines.push("\u{1F4C4} " + (pv.file || "pdf"));
              if (pv.suspicious) {
                srcLines.push("  \u{1F6A9} \u041F\u0440\u043E\u0431\u043B\u0435\u043C\u044B:");
                for (const reason of pv.reasons || []) {
                  srcLines.push("  \u2022 " + reason);
                }
              } else {
                srcLines.push("  \u2705 \u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442");
              }
            }
            const srcText = srcLines.join("\n");
            ctx.waitUntil(tgSendMessageEx(srcChatId, srcText, srcReplyTo ? { reply_to_message_id: srcReplyTo } : {}));
          }
        } catch {
        }
      }
      try {
        ctx.waitUntil(
          tgNotifyUserText(
            buyOffers[idx].user || null,
            `\u{1F9FE} \u0414\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 \u043E\u043F\u043B\u0430\u0442\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u044B \u2705
\u041C\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0447\u0435\u043A \u0438 \u0441\u043A\u043E\u0440\u043E \u043E\u0431\u043D\u043E\u0432\u0438\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u0441\u0434\u0435\u043B\u043A\u0438 \u23F3`
          )
        );
      } catch {
      }
      await writeJsonKV("buyOffers", buyOffers);
      return json({ ok: true });
    }
    async function tgNotifyOfferSourceChat(offer, text) {
      try {
        const chatId = String(offer?.sourceChat?.id || "").trim();
        if (!chatId) return false;
        const replyToMessageId = Number(
          offer?.sourceMessageId || offer?.sourceReplyToMessageId || 0
        ) || 0;
        await tgSendMessageEx(
          chatId,
          String(text || "").slice(0, 3900),
          replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}
        );
        return true;
      } catch {
        return false;
      }
    }
    __name(tgNotifyOfferSourceChat, "tgNotifyOfferSourceChat");
    __name2(tgNotifyOfferSourceChat, "tgNotifyOfferSourceChat");
    if (url.pathname === "/api/public/qr_buy_status" && request.method === "GET") {
      const id = String(url.searchParams.get("id") || "").trim();
      if (!id) return bad("Missing id");
      const buyOffers = await readJsonKV("buyOffers", []);
      const offer = (Array.isArray(buyOffers) ? buyOffers : []).find((o) => String(o.id || "") === id);
      if (!offer) return bad("Offer not found", 404);
      if (!offer.qrOrder) return bad("Not a QR offer", 400);
      let actor = null;
      try {
        actor = ensureUserShape(await resolveActorUser(request, null));
      } catch {
      }
      const actorId = String(actor?.id || "");
      const actorUn = String(actor?.username || "").replace(/^@/, "");
      const creatorId = String(offer?.qrOrder?.createdBy?.id || offer?.user?.id || "");
      const creatorUn = String(offer?.qrOrder?.createdBy?.username || offer?.user?.username || "").replace(/^@/, "");
      const executorId = String(offer?.executorUser?.id || "");
      const executorUn = String(offer?.executorUser?.username || "").replace(/^@/, "");
      const allowed2 = !actor || !actorId && !actorUn || actorId === creatorId || actorUn === creatorUn || actorId === executorId || actorUn === executorUn;
      if (!allowed2) return bad("Forbidden", 403);
      return json({
        ok: true,
        id,
        status: String(offer.status || "NEW").toUpperCase(),
        amountRub: Number(offer.amountRub || 0) || 0,
        rate: Number(offer.rate || 0) || 0,
        merchant: String(offer?.qrOrder?.merchant || offer?.payBank || ""),
        createdAt: Number(offer.createdAt || 0) || 0,
        paidAt: Number(offer.paidAt || 0) || 0,
        walletCreditedAt: Number(offer.walletCreditedAt || 0) || 0
      });
    }
    if (url.pathname === "/api/public/offer_info" && request.method === "GET") {
      const oid = String(url.searchParams.get("id") || "").trim();
      if (!oid) return bad("Missing id");
      const buyOffers = await readJsonKV("buyOffers", []);
      const offer = (Array.isArray(buyOffers) ? buyOffers : []).find((o) => String(o.id || "") === oid);
      if (!offer) return bad("Offer not found", 404);
      return json({
        ok: true,
        id: offer.id,
        amountRub: Number(offer.amountRub || offer.rub || 0),
        rate: Number(offer.rate || 0),
        amountUsdt: Number(offer.amountUsdt || offer.usdt || 0),
        status: String(offer.status || "NEW").toUpperCase(),
        wallet: offer.wallet || null,
        method: offer.method || ""
      });
    }
    if (url.pathname === "/api/public/order_info" && request.method === "GET") {
      const type = String(url.searchParams.get("type") || url.searchParams.get("dealType") || "BUY").toUpperCase();
      const id = url.searchParams.get("id") || "";
      const reserveId = url.searchParams.get("reserveId") || "";
      if (!id) return bad("Missing id");
      if (type === "SELL") {
        if (!reserveId) return bad("Missing reserveId");
        const deals = await readJsonKV(SELL_DEALS_KEY, []);
        const arr = Array.isArray(deals) ? deals : [];
        const d = arr.find((x) => String(x.dealId || "") === String(id) && String(x.secret || "") === String(reserveId)) || arr.find((x) => String(x.offerId || "") === String(id) && String(x.secret || "") === String(reserveId));
        if (!d) return bad("Deal not found", 404);
        const st = normalizeSellStatus(d.status);
        return json({ ok: true, status: st, txHash: d.txHash || null });
      }
      if (!reserveId) return bad("Missing reserveId");
      const reserves = await readJsonKV("reserves", {});
      const r = reserves[id];
      if (!r || r.reserveId !== reserveId) return bad("Reserve not found", 404);
      const buyOffers = await readJsonKV("buyOffers", []);
      const offer = buyOffers.find((o) => o.id === id);
      if (!offer) return bad("Offer not found", 404);
      return json({
        ok: true,
        status: String(offer.status || "NEW").toUpperCase(),
        txHash: offer.txHash || null,
        wallet: offer.wallet || null
      });
    }
    if (url.pathname === "/api/public/order_status" && request.method === "GET") {
      const id = url.searchParams.get("id") || "";
      const reserveId = url.searchParams.get("reserveId") || "";
      if (!id || !reserveId) return bad("Missing id or reserveId");
      const reserves = await readJsonKV("reserves", {});
      const r = reserves[id];
      if (!r || r.reserveId !== reserveId) return bad("Reserve not found", 404);
      const buyOffers = await readJsonKV("buyOffers", []);
      const offer = buyOffers.find((o) => o.id === id);
      if (!offer) return bad("Offer not found", 404);
      return json({ ok: true, status: String(offer.status || "NEW").toUpperCase() });
    }
    if (url.pathname === "/api/public/sell_submit" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const offerId = String(body.offerId || body.id || body.orderId || "").trim();
      const amountRub = Number(body.amountRub ?? body.rub ?? body.amount ?? 0);
      const rate = Number(body.rate ?? body.sellRate ?? 0);
      if (!offerId) return bad("Missing offerId");
      if (!Number.isFinite(amountRub) || amountRub <= 0) return bad("Invalid amountRub");
      if (!Number.isFinite(rate) || rate <= 0) return bad("Invalid rate");
      const pay = body.pay || {
        method: String(body.payMethod || body.method || "SBP").toUpperCase(),
        number: String(body.payNumber || body.number || "").trim(),
        bank: String(body.payBank || body.bank || "").trim(),
        fio: String(body.payFio || body.fio || "").trim()
      };
      const useWalletBalance = body.useWalletBalance === true || String(body.fundingSource || body.source || "").trim().toUpperCase() === "WALLET";
      const cryptoDest = useWalletBalance ? {
        type: "INTERNAL_WALLET",
        label: "Crossflag Wallet",
        value: "INTERNAL_BALANCE"
      } : body.cryptoDest || {
        type: String(body.cryptoType || body.type || "").toUpperCase(),
        label: String(body.cryptoLabel || body.label || "").trim(),
        value: String(body.cryptoValue || body.value || "").trim()
      };
      if (!pay || !String(pay.number || "").trim() || !String(pay.bank || "").trim() || !String(pay.fio || "").trim()) {
        return bad("Missing pay requisites");
      }
      if (!useWalletBalance && (!cryptoDest || !String(cryptoDest.value || "").trim())) {
        return bad("Missing crypto destination");
      }
      const amountUsdt = amountRub / rate;
      const amountE6 = Math.trunc(amountUsdt * 1e6);
      if (!(amountE6 > 0)) return bad("Invalid amountUsdt");
      const sellOffers = await readJsonKV("sellOffers", []);
      const selectedOffer = (Array.isArray(sellOffers) ? sellOffers : []).find((o) => String(o?.id || "") === offerId);
      if (!selectedOffer) return bad("Offer not found", 404);
      if (selectedOffer.frozen || String(selectedOffer.status || "NEW").toUpperCase() !== "NEW") {
        return bad("Offer is no longer available", 409);
      }
      const dealId = "sd_" + randId(14);
      const secret = randId(36) + randId(36);
      const tgUser = String(body.tgUser || body.tg || body.username || "").trim();
      let actorUser = null;
      try {
        actorUser = await resolveActorUser(request, null);
      } catch {
      }
      const actorShape = ensureUserShape(actorUser) || null;
      if (useWalletBalance && !String(actorShape?.id || "").trim()) {
        return bad("Unauthorized", 401);
      }
      const deal = {
        dealId,
        secret,
        offerId,
        amountRub,
        rate,
        amountUsdt,
        pay: {
          method: String(pay.method || "SBP").toUpperCase(),
          number: String(pay.number || "").trim(),
          bank: String(pay.bank || "").trim(),
          fio: String(pay.fio || "").trim()
        },
        requisitesHistory: [],
        cryptoDest: {
          type: String(cryptoDest.type || "").toUpperCase(),
          label: String(cryptoDest.label || cryptoDest.type || "").trim(),
          value: String(cryptoDest.value || "").trim()
        },
        txHash: useWalletBalance ? "INTERNAL_WALLET_DEBIT" : null,
        fundingSource: useWalletBalance ? "WALLET" : "EXTERNAL",
        walletDebitedAt: 0,
        walletDebitedE6: 0,
        walletRefundedAt: 0,
        walletRefundedE6: 0,
        status: useWalletBalance ? "CRYPTO_RECEIVED" : "WAIT_CRYPTO",
        payouts: [],
        log: [],
        tgUser: tgUser || null,
        user: actorShape || (tgUser ? { id: "", username: String(tgUser).replace(/^@/, "") } : null),
        createdAt: now(),
        updatedAt: now()
      };
      pushSellLog(deal, "CREATE", "Deal created", { fundingSource: deal.fundingSource });
      try {
        if (useWalletBalance) {
          pushSellLog(deal, "WALLET_DEFERRED", "USDT will be deducted proportionally per payout", { totalE6: amountE6, userId: String(actorShape?.id || "") });
        }
        const deals = await readJsonKV(SELL_DEALS_KEY, []);
        const arr = Array.isArray(deals) ? deals : [];
        arr.unshift(deal);
        await writeJsonKV(SELL_DEALS_KEY, arr.slice(0, 5e3));
      } catch (e) {
        throw e;
      }
      try {
        ctx.waitUntil(
          tgNotifyAdmin({
            title: useWalletBalance ? "\u{1F7E3} SELL: \u0441\u0434\u0435\u043B\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430 \u0438\u0437 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430" : "\u{1F7E3} SELL: \u0441\u0434\u0435\u043B\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430",
            user: deal.user || null,
            deal: "SELL " + dealId,
            step: "SELL_CREATE",
            req: request,
            lines: [
              "Offer: " + offerId,
              "\u0421\u0443\u043C\u043C\u0430: " + String(amountRub) + " RUB",
              "\u041A\u0443\u0440\u0441: " + String(rate),
              "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A USDT: " + (useWalletBalance ? "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A" : "\u0412\u043D\u0435\u0448\u043D\u0438\u0439 \u043F\u0435\u0440\u0435\u0432\u043E\u0434"),
              "\u041C\u0435\u0442\u043E\u0434: " + String(deal.pay.method),
              "\u041D\u043E\u043C\u0435\u0440: " + String(deal.pay.number),
              "\u0411\u0430\u043D\u043A: " + String(deal.pay.bank),
              "\u0424\u0418\u041E: " + String(deal.pay.fio),
              "\u0421\u0435\u0442\u044C: " + String(deal.cryptoDest.label || deal.cryptoDest.type),
              "\u0410\u0434\u0440\u0435\u0441/UID: " + String(deal.cryptoDest.value)
            ]
          })
        );
      } catch {
      }
      try {
        const msg = useWalletBalance ? `\u{1F7E3} \u0421\u0434\u0435\u043B\u043A\u0430 \u043E\u0442\u043A\u0440\u044B\u0442\u0430!
\u041C\u044B \u0441\u0440\u0430\u0437\u0443 \u0441\u043F\u0438\u0441\u0430\u043B\u0438 ${fmtUsdtE6(amountE6)} \u0441 \u0431\u0430\u043B\u0430\u043D\u0441\u0430 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u0438 \u043F\u0435\u0440\u0435\u0434\u0430\u043B\u0438 \u0441\u0434\u0435\u043B\u043A\u0443 \u043D\u0430 \u0432\u044B\u043F\u043B\u0430\u0442\u0443 \u20BD.
\u041E\u0436\u0438\u0434\u0430\u0439 \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 \u0441\u0440\u0435\u0434\u0441\u0442\u0432 \u043F\u043E \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u043C \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u0430\u043C \u{1F4B3}` : `\u{1F7E3} \u0421\u0434\u0435\u043B\u043A\u0430 \u043E\u0442\u043A\u0440\u044B\u0442\u0430!
\u0412\u044B \u043F\u0440\u043E\u0434\u0430\u0451\u0442\u0435 USDT \u043D\u0430 \u0441\u0443\u043C\u043C\u0443 ${money(amountRub, 0)} \u20BD.
\u0428\u0430\u0433 1: \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 USDT \u043D\u0430 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441/UID.
\u041F\u043E\u0441\u043B\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 TX Hash/\u0441\u0441\u044B\u043B\u043A\u0443 \u{1F517}`;
        ctx.waitUntil(tgNotifyUserText(deal.user || null, msg));
      } catch {
      }
      return json({ ok: true, dealId, secret, status: deal.status, fundingSource: deal.fundingSource });
    }
    if (url.pathname === "/api/public/sell_status" && request.method === "GET") {
      const dealId = String(url.searchParams.get("dealId") || "").trim();
      const secret = String(url.searchParams.get("secret") || "").trim();
      if (!dealId || !secret) return bad("Missing dealId or secret");
      const deals = await readJsonKV(SELL_DEALS_KEY, []);
      const idx = (Array.isArray(deals) ? deals : []).findIndex((d) => String(d.dealId || "") === dealId);
      if (idx < 0) return bad("Deal not found", 404);
      const deal = deals[idx];
      if (String(deal.secret || "") !== secret) return bad("Forbidden", 403);
      const st = normalizeSellStatus(deal.status);
      deal.status = st;
      deals[idx] = deal;
      await writeJsonKV(SELL_DEALS_KEY, deals);
      const safeDeal = { ...deal };
      delete safeDeal.secret;
      return json({ ok: true, ...withSellDerivedFields(safeDeal) });
    }
    const USER_WITHDRAWALS_KEY = "userWithdrawals";
    const REF_WITHDRAW_KEY_ADMIN = "refWithdrawRequests";
    ;
    function normalizeWithdrawalStatus(s) {
      const x = String(s || "").toUpperCase().trim();
      const ok = /* @__PURE__ */ new Set(["PENDING", "APPROVED", "REJECTED", "PROCESSING", "SENT", "DONE", "CANCELED", "FAILED"]);
      return ok.has(x) ? x : "PENDING";
    }
    __name(normalizeWithdrawalStatus, "normalizeWithdrawalStatus");
    __name2(normalizeWithdrawalStatus, "normalizeWithdrawalStatus");
    function pickId(x) {
      return String(x && (x.id || x.requestId || x.reqId) || "").trim();
    }
    __name(pickId, "pickId");
    __name2(pickId, "pickId");
    function unifyWithdrawal(w, sourceTag) {
      const id = pickId(w);
      const createdAt = Number(w.createdAt || w.created_at || w.ts || w.time || 0) || 0;
      const updatedAt = Number(w.updatedAt || w.updated_at || 0) || 0;
      const userId = String(w.user_id || w.user && w.user.id || w.userId || "");
      const username = String(w.username || w.user && w.user.username || "").replace(/^@/, "");
      let amtE6 = w.amountUsdtE6 ?? w.amountE6 ?? w.amount_dec6 ?? w.amountDec6 ?? w.amount_dec ?? null;
      if (amtE6 == null && w.amountUsdt != null) {
        const a = Number(w.amountUsdt);
        if (Number.isFinite(a) && a > 0) amtE6 = Math.trunc(a * 1e6);
      }
      amtE6 = amtE6 == null ? null : Math.trunc(Number(amtE6) || 0);
      const network = String(w.network || w.chain || w.walletType || "TRON");
      const asset = String(w.asset || w.token || "USDT");
      const toAddress = String(w.to_address || w.toAddress || w.address || w.wallet || w.dest || "");
      const txid = w.txid || w.txHash || w.hash || null;
      return {
        ...w,
        id,
        source: w.source || sourceTag,
        kind: w.kind || (sourceTag === "ref" ? "REF" : "WALLET"),
        status: normalizeWithdrawalStatus(w.status),
        createdAt,
        updatedAt,
        // то, что ждёт admin-withdrawals.html
        user_id: userId || void 0,
        username: username || void 0,
        amountUsdtE6: amtE6 != null ? amtE6 : void 0,
        network,
        asset,
        to_address: toAddress || void 0,
        txid: txid || void 0
      };
    }
    __name(unifyWithdrawal, "unifyWithdrawal");
    __name2(unifyWithdrawal, "unifyWithdrawal");
    if (url.pathname === "/api/admin/user_withdrawals" && request.method === "GET") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const a1 = await readJsonKV(USER_WITHDRAWALS_KEY, []);
      const a2 = await readJsonKV(REF_WITHDRAW_KEY_ADMIN, []);
      const list1 = Array.isArray(a1) ? a1 : [];
      const list2 = Array.isArray(a2) ? a2 : [];
      const map = /* @__PURE__ */ new Map();
      for (const w of list1) {
        const u = unifyWithdrawal(w, "wallet");
        if (u.id) map.set(u.id, u);
      }
      for (const w of list2) {
        const u = unifyWithdrawal(w, "ref");
        if (!u.id) continue;
        const prev = map.get(u.id);
        if (!prev) map.set(u.id, u);
        else {
          const p = Number(prev.updatedAt || prev.createdAt || 0);
          const n = Number(u.updatedAt || u.createdAt || 0);
          if (n >= p) map.set(u.id, u);
        }
      }
      const out = Array.from(map.values());
      out.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      return json({ ok: true, items: out, withdrawals: out });
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/user_withdrawals\/([^/]+)$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        if (request.method !== "PATCH") return bad("Method not allowed", 405);
        const id = decodeURIComponent(m[1] || "");
        if (!id) return bad("Missing id", 400);
        const body = await request.json().catch(() => ({}));
        const applyPatch = /* @__PURE__ */ __name2((obj) => {
          if (body.status != null) obj.status = normalizeWithdrawalStatus(body.status);
          if (body.txHash !== void 0) {
            const v = body.txHash == null ? "" : String(body.txHash).trim();
            obj.txHash = v ? v : null;
          }
          if (body.note !== void 0) obj.note = body.note == null ? "" : String(body.note);
          if (body.meta !== void 0) obj.meta = body.meta;
          obj.updatedAt = now();
          return obj;
        }, "applyPatch");
        const a1 = await readJsonKV(USER_WITHDRAWALS_KEY, []);
        const a2 = await readJsonKV(REF_WITHDRAW_KEY_ADMIN, []);
        const list1 = Array.isArray(a1) ? a1 : [];
        const list2 = Array.isArray(a2) ? a2 : [];
        let found = null;
        const i1 = list1.findIndex((x) => pickId(x) === id);
        if (i1 >= 0) {
          list1[i1] = applyPatch(list1[i1] || {});
          await writeJsonKV(USER_WITHDRAWALS_KEY, list1);
          found = unifyWithdrawal(list1[i1], "wallet");
        }
        const i2 = list2.findIndex((x) => pickId(x) === id);
        if (i2 >= 0) {
          list2[i2] = applyPatch(list2[i2] || {});
          await writeJsonKV(REF_WITHDRAW_KEY_ADMIN, list2);
          found = unifyWithdrawal(list2[i2], "ref");
        }
        if (!found) return bad("Not found", 404);
        return json({ ok: true, item: found });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/user_withdrawals\/([^/]+)\/(approve|reject)$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        if (request.method !== "POST") return bad("Method not allowed", 405);
        const id = decodeURIComponent(m[1] || "");
        const action = String(m[2] || "");
        const WKEY = "userWithdrawals";
        const items = await readJsonKV(WKEY, []);
        const arr = Array.isArray(items) ? items : [];
        const idx = arr.findIndex((x) => String(x.id || "") === String(id));
        if (idx < 0) return bad("Not found", 404);
        const w = arr[idx];
        const prev = String(w.status || "PENDING").toUpperCase();
                if (action === "approve") {
          if (prev === "APPROVED" || prev === "PROCESSING" || prev === "DONE" || prev === "SENT") {
            return json({
              ok: true,
              status: prev,
              rapiraWithdrawId: w.rapiraWithdrawId || null
            });
          }

          if (prev !== "PENDING") {
            return bad("Cannot approve from status: " + prev, 409);
          }

          const amountE6 = Number(w.amountUsdtE6 || w.amountDec6 || 0);
          const userId = String(w.user && w.user.id || w.user_id || "");
          const network = String(w.network || "TRON");
          const toAddress = String(w.to_address || w.toAddress || w.address || "").trim();

          if (!toAddress) return bad("Withdrawal address missing", 400);
          if (!(amountE6 > 0)) return bad("Invalid withdrawal amount", 400);

          // Only debit balance if it wasn't already frozen at request creation
          if (userId && !w.balanceFrozen) {
            await d1.prepare(
              "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
            ).bind(userId, now()).run();

            const debit = await d1.prepare(
              "UPDATE user_balances SET usdt_trc20_balance = usdt_trc20_balance - ?, updated_at=? WHERE user_id=? AND usdt_trc20_balance >= ?"
            ).bind(amountE6, now(), userId, amountE6).run();

            if (!debit?.meta?.changes) {
              return bad("Not enough balance to approve withdrawal", 409);
            }
          }

          // Rapira не настроена — просто одобряем вручную и списываем баланс
          w.status = "DONE";
          w.updatedAt = now();
          w.manualApprove = true;
          arr[idx] = w;
          await writeJsonKV(WKEY, arr);

          try {
            const wUser = await resolveUserByIdShape(w.user && w.user.id || w.user_id || "");

            ctx.waitUntil(
              tgNotifyWallet({
                kind: "WITHDRAW_APPROVED",
                user: wUser,
                req: request,
                refId: id,
                step: "WITHDRAW_APPROVE_MANUAL",
                lines: [
                  "Amount: " + fmtUsdtE6(amountE6),
                  "Network: " + network,
                  "To: " + toAddress,
                  "Ручное одобрение (без Rapira)"
                ]
              })
            );

            ctx.waitUntil(
              tgNotifyUserText(
                wUser,
                `✅ Вывод одобрен.\n💸 ${fmtUsdtE6(amountE6)}\nСеть: ${network}\nАдрес: ${toAddress}`
              )
            );
          } catch {}

          return json({
            ok: true,
            status: w.status
          });
        }
        if (action === "reject") {
          if (prev === "REJECTED") return json({ ok: true, status: prev });
          if (prev !== "PENDING") return bad("Cannot reject from status: " + prev, 409);
          w.status = "REJECTED";
          w.updatedAt = now();
          // Refund frozen balance back to user
          if (w.balanceFrozen && !w.walletRefundedAt) {
            const refundE6 = Number(w.amountUsdtE6 || w.amountDec6 || 0);
            const refundUserId = String(w.user_id || w.user?.id || "");
            if (refundE6 > 0 && refundUserId) {
              await d1.prepare(
                "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
              ).bind(refundUserId, now()).run();
              await d1.prepare(
                "UPDATE user_balances SET usdt_trc20_balance = usdt_trc20_balance + ?, updated_at=? WHERE user_id=?"
              ).bind(refundE6, now(), refundUserId).run();
              w.walletRefundedAt = now();
              w.walletRefundedE6 = refundE6;
            }
          }
          arr[idx] = w;
          await writeJsonKV(WKEY, arr);
          try {
            const wUser = await resolveUserByIdShape(w.user && w.user.id || w.user_id || "");
            ctx.waitUntil(
              tgNotifyWallet({
                kind: "WITHDRAW_REJECTED",
                user: wUser,
                req: request,
                refId: id,
                step: "WITHDRAW_REJECT",
                lines: [
                  "Amount: " + fmtUsdtE6(Number(w.amountUsdtE6 || w.amountDec6 || 0)),
                  "Network: " + String(w.network || "TRON"),
                  "To: " + String(w.to_address || w.toAddress || "")
                ]
              })
            );
            ctx.waitUntil(
              tgNotifyUserText(wUser, `\u274C \u0412\u044B\u0432\u043E\u0434 \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D.
\u{1F4B0} ${fmtUsdtE6(Number(w.amountUsdtE6 || w.amountDec6 || 0))} \u043E\u0441\u0442\u0430\u043B\u0438\u0441\u044C \u043D\u0430 \u0432\u0430\u0448\u0435\u043C \u0431\u0430\u043B\u0430\u043D\u0441\u0435.
\u0415\u0441\u043B\u0438 \u0435\u0441\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u2014 \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443.`)
            );
          } catch {
          }
          return json({ ok: true, status: w.status });
        }
      }
    }
    if (url.pathname === "/api/public/sell_submit_hash" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const dealId = String(body.dealId || "").trim();
      const secret = String(body.secret || "").trim();
      const txHash = String(body.txHash || body.hash || body.link || "").trim();
      if (!dealId || !secret) return bad("Missing dealId or secret");
      if (!txHash) return bad("Missing txHash");
      const deals = await readJsonKV(SELL_DEALS_KEY, []);
      const idx = (Array.isArray(deals) ? deals : []).findIndex((d) => String(d.dealId || "") === dealId);
      if (idx < 0) return bad("Deal not found", 404);
      const deal = deals[idx];
      if (String(deal.secret || "") !== secret) return bad("Forbidden", 403);
      deal.txHash = txHash;
      deal.updatedAt = now();
      pushSellLog(deal, "TX", "TX hash submitted", { txHash });
      deals[idx] = deal;
      await writeJsonKV(SELL_DEALS_KEY, deals);
      try {
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F517} SELL: \u0443\u043A\u0430\u0437\u0430\u043D TX Hash/Link",
            user: deal.user || null,
            deal: "SELL " + dealId,
            step: "SELL_TX",
            req: request,
            lines: ["TX: " + txHash]
          })
        );
      } catch {
      }
      try {
        ctx.waitUntil(
          tgNotifyUserText(
            deal.user || null,
            `\u{1F517} TX Hash/\u0441\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B \u2705
\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u044E \u0432 \u0441\u0435\u0442\u0438. \u041E\u0431\u044B\u0447\u043D\u043E \u044D\u0442\u043E \u0431\u044B\u0441\u0442\u0440\u043E \u23F3`
          )
        );
      } catch {
      }
      return json({ ok: true });
    }
    if (url.pathname === "/api/public/sell_submit_extra_check" && request.method === "POST") {
      const ct = request.headers.get("Content-Type") || "";
      if (!ct.includes("multipart/form-data")) return bad("Expected multipart/form-data");
      const fd = await request.formData();
      const dealId = String(fd.get("dealId") || "").trim();
      const secret = String(fd.get("secret") || "").trim();
      if (!dealId || !secret) return bad("Missing dealId or secret");
      const photo = fd.get("photo");
      const video = fd.get("video");
      if (!(photo instanceof File) && !(video instanceof File)) {
        return bad("Attach photo or video");
      }
      const deals = await readJsonKV(SELL_DEALS_KEY, []);
      const arr = Array.isArray(deals) ? deals : [];
      const idx = arr.findIndex((d) => String(d.dealId || "") === dealId);
      if (idx < 0) return bad("Deal not found", 404);
      const deal = arr[idx];
      if (String(deal.secret || "") !== secret) return bad("Forbidden", 403);
      const outFiles = [];
      const pushTg = /* @__PURE__ */ __name2(async (kind, fileObj, nameFallback) => {
        if (!(fileObj instanceof File)) return;
        const name = String(fileObj.name || nameFallback || `${kind}.bin`);
        const isVideo = kind === "video";
        const tg = await tgSendFile(isVideo ? "video" : "document", fileObj, name);
        outFiles.push({ kind, name, tg });
      }, "pushTg");
      await pushTg("photo", photo, "photo.jpg");
      await pushTg("video", video, "video.mp4");
      deal.extraCheck = {
        files: outFiles,
        submittedAt: now()
      };
      deal.status = "CHECK_SUBMITTED";
      deal.updatedAt = now();
      pushSellLog(deal, "EXTRA_CHECK", "Extra check submitted", {
        files: outFiles.map((x) => x.name)
      });
      arr[idx] = deal;
      await writeJsonKV(SELL_DEALS_KEY, arr);
      try {
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F575}\uFE0F SELL: \u0434\u043E\u043F. \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430",
            deal: "SELL " + dealId,
            step: "SELL_EXTRA_CHECK",
            req: request,
            lines: ["\u0424\u0430\u0439\u043B\u043E\u0432: " + outFiles.length]
          })
        );
      } catch {
      }
      try {
        ctx.waitUntil(
          tgNotifyUserText(
            deal.user || null,
            `\u{1F575}\uFE0F \u0414\u043E\u043F. \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430 \u2705
\u0421\u043F\u0430\u0441\u0438\u0431\u043E! \u041C\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B \u0438 \u0441\u043A\u043E\u0440\u043E \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u043C \u0441\u0434\u0435\u043B\u043A\u0443 \u23F3`
          )
        );
      } catch {
      }
      return json({ ok: true });
    }
    if (url.pathname === "/api/public/sell_update_requisites" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const dealId = String(body.dealId || "").trim();
      const secret = String(body.secret || "").trim();
      const pay = body.pay || null;
      if (!dealId || !secret) return bad("Missing dealId or secret");
      if (!pay) return bad("Missing pay");
      const deals = await readJsonKV(SELL_DEALS_KEY, []);
      const idx = (Array.isArray(deals) ? deals : []).findIndex((d) => String(d.dealId || "") === dealId);
      if (idx < 0) return bad("Deal not found", 404);
      const deal = deals[idx];
      if (String(deal.secret || "") !== secret) return bad("Forbidden", 403);
      const nextPay = {
        method: String(pay.method || deal.pay?.method || "SBP").toUpperCase(),
        number: String(pay.number || "").trim(),
        bank: String(pay.bank || "").trim(),
        fio: String(pay.fio || "").trim()
      };
      if (!nextPay.number || !nextPay.bank || !nextPay.fio) return bad("Missing pay fields");
      const hist = Array.isArray(deal.requisitesHistory) ? deal.requisitesHistory : [];
      if (deal.pay) hist.push({ ts: now(), pay: deal.pay });
      deal.requisitesHistory = hist.slice(-100);
      deal.pay = nextPay;
      deal.updatedAt = now();
      pushSellLog(deal, "PAY", "Requisites updated");
      deals[idx] = deal;
      await writeJsonKV(SELL_DEALS_KEY, deals);
      try {
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u270F\uFE0F SELL: \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B",
            user: deal.user || null,
            deal: "SELL " + dealId,
            step: "SELL_UPDATE_REQUISITES",
            req: request,
            lines: [
              "\u041C\u0435\u0442\u043E\u0434: " + String(nextPay.method),
              "\u041D\u043E\u043C\u0435\u0440: " + String(nextPay.number),
              "\u0411\u0430\u043D\u043A: " + String(nextPay.bank),
              "\u0424\u0418\u041E: " + String(nextPay.fio)
            ]
          })
        );
      } catch {
      }
      try {
        ctx.waitUntil(
          tgNotifyUserText(
            deal.user || null,
            `\u270F\uFE0F \u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B \u0434\u043B\u044F \u0432\u044B\u043F\u043B\u0430\u0442\u044B \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B \u2705
\u041C\u044B \u0431\u0443\u0434\u0435\u043C \u043F\u0435\u0440\u0435\u0432\u043E\u0434\u0438\u0442\u044C \u20BD \u043F\u043E \u043D\u043E\u0432\u044B\u043C \u0434\u0430\u043D\u043D\u044B\u043C.`
          )
        );
      } catch {
      }
      return json({ ok: true });
    }
    if (url.pathname === "/api/public/sell_payout_add" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const dealId = String(body.dealId || "").trim();
      const secret = String(body.secret || "").trim();
      const amountRub = Number(body.amountRub ?? body.amount ?? 0);
      if (!dealId || !secret) return bad("Missing dealId or secret");
      if (!Number.isFinite(amountRub) || amountRub <= 0) return bad("Invalid amountRub");
      const deals = await readJsonKV(SELL_DEALS_KEY, []);
      const idx = (Array.isArray(deals) ? deals : []).findIndex((d) => String(d.dealId || "") === dealId);
      if (idx < 0) return bad("Deal not found", 404);
      const deal = deals[idx];
      if (String(deal.secret || "") !== secret) return bad("Forbidden", 403);
      const st = normalizeSellStatus(deal.status);
      if (!(st === "CRYPTO_RECEIVED" || st === "PAYOUT_PROGRESS" || st === "COMPLETED")) {
        return bad("Payout is not allowed in current status: " + st, 409);
      }
      const payouts = Array.isArray(deal.payouts) ? deal.payouts : [];
      payouts.push({ amountRub, ts: now() });
      deal.payouts = payouts.slice(-500);
      const dealRate = Number(deal.rate || 0);
      if (dealRate > 0 && String(deal.fundingSource || "").toUpperCase() === "WALLET") {
        const deductUsdt = amountRub / dealRate;
        const deductE6 = Math.trunc(deductUsdt * 1e6);
        const userId = String(deal.user && deal.user.id || "");
        if (userId && deductE6 > 0) {
          try {
            await d1.prepare(
              "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
            ).bind(userId, now()).run();
            await d1.prepare(
              "UPDATE user_balances SET usdt_trc20_balance = usdt_trc20_balance - ?, updated_at=? WHERE user_id=?"
            ).bind(deductE6, now(), userId).run();
            deal.walletDebitedE6 = (Number(deal.walletDebitedE6) || 0) + deductE6;
            deal.walletDebitedAt = now();
            pushSellLog(deal, "PAYOUT_DEBIT", "USDT debited proportionally for payout", { amountRub, deductE6, userId });
            await appendWalletLedgerEntries([
              {
                id: `sell-payout-debit-${dealId}-${Date.now()}`,
                userId,
                kind: "sell_debit",
                direction: "out",
                amountUsdt: -(deductE6 / 1e6),
                amountDec6: -deductE6,
                title: "\u041F\u0440\u043E\u0434\u0430\u0436\u0430 USDT (\u0432\u044B\u043F\u043B\u0430\u0442\u0430)",
                subtitle: `SELL ${dealId}`,
                ts: now(),
                meta: { dealId, amountRub, rate: dealRate, source: "wallet" }
              }
            ]);
          } catch (e) {
            pushSellLog(deal, "PAYOUT_DEBIT_ERROR", String(e?.message || e), { amountRub, deductE6 });
          }
        }
      }
      const { total, paid } = sellCompute(deal);
      if (paid >= Math.max(0, total - 1e-4)) {
        deal.status = "COMPLETED";
        pushSellLog(deal, "DONE", "Deal completed", { amountRub });
      } else {
        deal.status = "PAYOUT_PROGRESS";
        pushSellLog(deal, "PAYOUT", "Partial payout added", { amountRub });
      }
      if (isSellCompletedStatus(deal.status)) {
        await tryAwardBonusForSellDeal(deal);
        try {
          const hidden = await hideSellOfferAfterCompletedDeal(deal.offerId, dealId);
          if (hidden) {
            pushSellLog(deal, "OFFER_HIDDEN", "Sell offer hidden after completed payout", {
              offerId: String(deal.offerId || "")
            });
          }
        } catch (e) {
          pushSellLog(deal, "OFFER_HIDE_ERROR", String(e?.message || e || "Failed to hide sell offer"), {
            offerId: String(deal.offerId || "")
          });
        }
      }
      deal.updatedAt = now();
      deals[idx] = deal;
      await writeJsonKV(SELL_DEALS_KEY, deals);
      try {
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u2705 SELL: \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 \u043F\u043B\u0430\u0442\u0435\u0436\u0430",
            user: deal.user || null,
            deal: "SELL " + dealId,
            step: "SELL_PAYOUT_ADD",
            req: request,
            lines: ["\u0421\u0443\u043C\u043C\u0430: " + String(amountRub) + " RUB", "\u0421\u0442\u0430\u0442\u0443\u0441: " + String(deal.status)]
          })
        );
      } catch {
      }
      try {
        const { total: total2, paid: paid2 } = sellCompute(deal);
        const done = String(deal.status || "").toUpperCase() === "COMPLETED";
        const msg = done ? `\u2705 \u0412\u044B\u043F\u043B\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430!
\u041C\u044B \u043F\u0435\u0440\u0435\u0432\u0435\u043B\u0438 ${money(paid2, 0)} \u20BD. \u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u043E\u0431\u043C\u0435\u043D \u{1F91D}\u{1F389}` : `\u{1F4B3} \u0417\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043B\u0438 \u0432\u044B\u043F\u043B\u0430\u0442\u0443: ${money(amountRub, 0)} \u20BD \u2705
\u0412\u044B\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u0432\u0441\u0435\u0433\u043E: ${money(paid2, 0)} \u20BD \u0438\u0437 ${money(total2, 0)} \u20BD.`;
        ctx.waitUntil(tgNotifyUserText(deal.user || null, msg));
      } catch {
      }
      return json({ ok: true });
    }
    if (url.pathname === "/api/public/log_attempt" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const items = await readJsonKV("dealLog", []);
      const arr = Array.isArray(items) ? items : [];
      const rec = {
        user: null,
        kind: String(body.kind || "EVENT"),
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        dealType: String(body.dealType || body.type || body.flow || "").toUpperCase() || null,
        status: body.status != null ? String(body.status) : null,
        id: body.id || body.offerId || body.dealId || null,
        offerId: body.offerId || null,
        dealId: body.dealId || null,
        tgUser: body.tgUser || body.tg || body.username || null,
        data: body.data || body.payload || body || {}
      };
      arr.unshift(rec);
      await writeJsonKV("dealLog", arr.slice(0, 2e3));
      return json({ ok: true });
    }
    if (url.pathname === "/api/admin/deal_log" && request.method === "GET") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const items = await readJsonKV("dealLog", []);
      return json({ ok: true, items: Array.isArray(items) ? items : [] });
    }
    if (url.pathname === "/api/admin/stats" && request.method === "GET") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const [buyOffers, sellDeals, sellOffers, dealLog, userIndex, config] = await Promise.all([
        readJsonKV("buyOffers", []),
        readJsonKV("sellDeals", []),
        readJsonKV("sellOffers", []),
        readJsonKV("dealLog", []),
        readJsonKV("users:index", []),
        readJsonKV("config", {})
      ]);
      const todayStart = /* @__PURE__ */ new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayMs = todayStart.getTime();
      const BUY_TERMINAL_OK = /* @__PURE__ */ new Set(["SUCCESS", "DONE", "COMPLETED", "BYBIT_DONE"]);
      const BUY_TERMINAL_BAD = /* @__PURE__ */ new Set(["FAILED", "CANCELED", "CANCELLED", "ERROR", "BYBIT_CANCELED"]);
      const SELL_TERMINAL_OK = /* @__PURE__ */ new Set(["COMPLETED", "DONE", "SUCCESS"]);
      const SELL_TERMINAL_BAD = /* @__PURE__ */ new Set(["CANCELED", "CANCELLED", "FAILED", "CRYPTO_NOT_RECEIVED"]);
      const buyStats = { total: 0, byStatus: {}, totalRub: 0, todayRub: 0, completedAll: 0, completedToday: 0, activeNow: 0, qrTotalRub: 0, qrTodayRub: 0, qrCompletedAll: 0, qrCompletedToday: 0 };
      for (const o of Array.isArray(buyOffers) ? buyOffers : []) {
        buyStats.total++;
        const st = String(o.status || "NEW").toUpperCase();
        buyStats.byStatus[st] = (buyStats.byStatus[st] || 0) + 1;
        const rub = Number(o.amountRub || 0);
        const ts = Number(o.createdAt || 0);
        const isQR = !!(o.qrOrder || o.method && String(o.method).toUpperCase() === "QR");
        if (BUY_TERMINAL_OK.has(st)) {
          buyStats.totalRub += rub;
          buyStats.completedAll++;
          if (ts >= todayMs) {
            buyStats.todayRub += rub;
            buyStats.completedToday++;
          }
          if (isQR) {
            buyStats.qrTotalRub += rub;
            buyStats.qrCompletedAll++;
            if (ts >= todayMs) {
              buyStats.qrTodayRub += rub;
              buyStats.qrCompletedToday++;
            }
          }
        }
        if (!BUY_TERMINAL_OK.has(st) && !BUY_TERMINAL_BAD.has(st)) buyStats.activeNow++;
      }
      const sellStats = { total: 0, byStatus: {}, totalRub: 0, todayRub: 0, completedAll: 0, completedToday: 0, activeNow: 0 };
      for (const d of Array.isArray(sellDeals) ? sellDeals : []) {
        sellStats.total++;
        const st = String(d.status || "").toUpperCase();
        sellStats.byStatus[st] = (sellStats.byStatus[st] || 0) + 1;
        const rub = Number(d.amountRub || 0);
        const ts = Number(d.createdAt || 0);
        const payoutsRub = Array.isArray(d.payouts) ? d.payouts.reduce((s, p) => s + Number(p.amountRub || 0), 0) : 0;
        if (SELL_TERMINAL_OK.has(st)) {
          sellStats.totalRub += payoutsRub || rub;
          sellStats.completedAll++;
          if (ts >= todayMs) {
            sellStats.todayRub += payoutsRub || rub;
            sellStats.completedToday++;
          }
        }
        if (!SELL_TERMINAL_OK.has(st) && !SELL_TERMINAL_BAD.has(st)) sellStats.activeNow++;
      }
      const sellOfferStats = {
        total: Array.isArray(sellOffers) ? sellOffers.length : 0,
        active: Array.isArray(sellOffers) ? sellOffers.filter((o) => !o.frozen && String(o.status || "").toUpperCase() === "NEW").length : 0
      };
      const logArr = Array.isArray(dealLog) ? dealLog : [];
      const logToday = logArr.filter((e) => Number(e.ts || e.createdAt || 0) >= todayMs).length;
      const totalUsers = Array.isArray(userIndex) ? userIndex.length : 0;
      return json({
        ok: true,
        stats: {
          totalUsers,
          activeDeals: buyStats.activeNow + sellStats.activeNow,
          buy: buyStats,
          sell: sellStats,
          sellOffers: sellOfferStats,
          qr: {
            totalRub: buyStats.qrTotalRub,
            todayRub: buyStats.qrTodayRub,
            completedAll: buyStats.qrCompletedAll,
            completedToday: buyStats.qrCompletedToday
          },
          dealLog: { total: logArr.length, today: logToday },
          config: {
            buyPercent: config.buyPercent || null,
            sellPercent: config.sellPercent || null
          },
          generatedAt: Date.now()
        }
      });
    }
    if (url.pathname === "/api/public/buy_amount_enabled" && request.method === "GET") {
      const raw = await readJsonKV("config", {});
      return json({
        ok: true,
        enabled: raw.buyAmountEnabled !== false
      });
    }
    if (url.pathname === "/api/admin/config") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      if (request.method === "GET") {
        const raw = await readJsonKV("config", {});
        const config = {
          ...raw,
          buyPercent: Number.isFinite(Number(raw.buyPercent)) ? Number(raw.buyPercent) : 0,
          sellPercent: Number.isFinite(Number(raw.sellPercent)) ? Number(raw.sellPercent) : 0,
          buyAmountEnabled: raw.buyAmountEnabled !== false
        };
        return json({ ok: true, config });
      }
      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const raw = await readJsonKV("config", {});
        const buyPercent = Number(body.buyPercent ?? raw.buyPercent ?? 0);
        const sellPercent = Number(body.sellPercent ?? raw.sellPercent ?? 0);
        const config = {
          ...raw,
          buyPercent: Number.isFinite(buyPercent) ? buyPercent : 0,
          sellPercent: Number.isFinite(sellPercent) ? sellPercent : 0,
          buyAmountEnabled: body.buyAmountEnabled !== false
        };
        await writeJsonKV("config", config);
        return json({ ok: true, config });
      }
      return bad("Method not allowed", 405);
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/offers\/([^/]+)\/bybit\/(start|confirm|matched|done|canceled|error)$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        const id = decodeURIComponent(m[1] || "");
        const action = String(m[2] || "");
        const offers = await readJsonKV("buyOffers", []);
        const idx = offers.findIndex((o) => o.id === id);
        if (idx < 0) return bad("Not found", 404);
        const offer = offers[idx];
        ensureBybitObj(offer);
        const body = await request.json().catch(() => ({}));
        const ts = now();
        const actor = String(body.actor || body.workerId || body.host || "").slice(0, 80);
        const st = String(offer.status || "NEW").toUpperCase();
        if (action === "start") {
          if (st !== "NEW") return bad(`Cannot start Bybit from status=${st}`, 409);
          offer.status = "BYBIT_CREATING";
          offer.bybit.status = "BYBIT_CREATING";
          offer.bybit.updatedAt = ts;
          offer.bybit.error = null;
          offer.bybit.note = actor ? "lockedBy=" + actor : null;
          offers[idx] = offer;
          await writeJsonKV("buyOffers", offers);
          return json({
            ok: true,
            offer: {
              id: offer.id,
              amountRub: offer.amountRub,
              rate: offer.rate,
              method: offer.method,
              payBank: offer.payBank || "",
              payRequisite: offer.payRequisite || "",
              status: offer.status
            }
          });
        }
        if (action === "confirm") {
          if (st !== "BYBIT_CREATING") return bad(`Cannot confirm Bybit from status=${st}`, 409);
          const adId = String(body.adId || "").trim();
          const cryptoAmount = Number(body.cryptoAmount);
          const minFiat = Number(body.minFiat);
          const maxFiat = Number(body.maxFiat);
          if (!adId) return bad("Missing adId");
          if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) return bad("Invalid cryptoAmount");
          if (!Number.isFinite(minFiat) || minFiat <= 0) return bad("Invalid minFiat");
          if (!Number.isFinite(maxFiat) || maxFiat <= 0) return bad("Invalid maxFiat");
          offer.status = "BYBIT";
          offer.bybit.status = "BYBIT";
          offer.bybit.adId = adId;
          offer.bybit.cryptoAmount = cryptoAmount;
          offer.bybit.minFiat = minFiat;
          offer.bybit.maxFiat = maxFiat;
          offer.bybit.updatedAt = ts;
          offer.bybit.error = null;
          offers[idx] = offer;
          await writeJsonKV("buyOffers", offers);
          try {
            ctx.waitUntil(tgNotifyUserText(offer.user || null, `\u{1F7E6} \u041E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u043D\u0430 BYBIT \u0441\u043E\u0437\u0434\u0430\u043D\u043E.
\u0416\u0434\u0451\u043C \u043C\u0430\u0442\u0447 \u0441 \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u043E\u043C \u{1F91D}`));
          } catch {
          }
          return json({ ok: true });
        }
        if (action === "matched") {
          if (st !== "BYBIT") return bad(`Cannot set matched from status=${st}`, 409);
          const orderId = String(body.orderId || "").trim();
          if (!orderId) return bad("Missing orderId");
          offer.status = "BYBIT_MATCHED";
          offer.bybit.status = "BYBIT_MATCHED";
          offer.bybit.orderId = orderId;
          offer.bybit.updatedAt = ts;
          offers[idx] = offer;
          await writeJsonKV("buyOffers", offers);
          try {
            ctx.waitUntil(tgNotifyUserText(offer.user || null, `\u{1F91D} \u041D\u0430\u0439\u0434\u0435\u043D \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442 \u043D\u0430 BYBIT!
\u041E\u0436\u0438\u0434\u0430\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0441\u0434\u0435\u043B\u043A\u0438 \u2014 \u043C\u044B \u0441\u043E\u043E\u0431\u0449\u0438\u043C, \u043A\u043E\u0433\u0434\u0430 USDT \u0431\u0443\u0434\u0443\u0442 \u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u044B \u2705`));
          } catch {
          }
          return json({ ok: true });
        }
        if (action === "done") {
          if (st !== "BYBIT_MATCHED") return bad(`Cannot set done from status=${st}`, 409);
          offer.status = "BYBIT_DONE";
          offer.bybit.status = "BYBIT_DONE";
          offer.bybit.updatedAt = ts;
          offers[idx] = offer;
          await writeJsonKV("buyOffers", offers);
          return json({ ok: true });
        }
        if (action === "canceled") {
          if (st === "BYBIT_MATCHED") {
            offer.status = "BYBIT";
            offer.bybit.status = "BYBIT";
            offer.bybit.orderId = null;
            offer.bybit.updatedAt = ts;
            offers[idx] = offer;
            await writeJsonKV("buyOffers", offers);
            return json({ ok: true, revertedTo: "BYBIT" });
          }
          if (st === "BYBIT") {
            offer.status = "BYBIT";
            offer.bybit.status = "BYBIT";
            offer.bybit.updatedAt = ts;
            offers[idx] = offer;
            await writeJsonKV("buyOffers", offers);
            return json({ ok: true, kept: "BYBIT" });
          }
          if (st === "BYBIT_CREATING") {
            offer.status = "NEW";
            offer.bybit.status = "NEW";
            offer.bybit.note = null;
            offer.bybit.error = null;
            offer.bybit.updatedAt = ts;
            offers[idx] = offer;
            await writeJsonKV("buyOffers", offers);
            return json({ ok: true, revertedTo: "NEW" });
          }
          return bad(`Cannot cancel from status=${st}`, 409);
        }
        if (action === "error") {
          const err = String(body.error || body.message || "unknown").slice(0, 1e3);
          offer.status = "ERROR";
          offer.bybit.status = "ERROR";
          offer.bybit.updatedAt = ts;
          offer.bybit.error = err;
          offers[idx] = offer;
          await writeJsonKV("buyOffers", offers);
          try {
            ctx.waitUntil(tgNotifyUserText(offer.user || null, `\u26A0\uFE0F \u041F\u043E \u0441\u0434\u0435\u043B\u043A\u0435 \u043D\u0430 BYBIT \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430.
\u041C\u044B \u0443\u0436\u0435 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0435\u043C\u0441\u044F. \u0415\u0441\u043B\u0438 \u043D\u0443\u0436\u043D\u043E \u2014 \u043D\u0430\u043F\u0438\u0448\u0438 \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 \u{1F91D}`));
          } catch {
          }
          return json({ ok: true });
        }
        return bad("Method not allowed", 405);
      }
    }
    if (url.pathname === "/api/admin/offers") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      if (request.method === "GET") {
        const offers = await readJsonKV("buyOffers", []);
        return json({ ok: true, offers });
      }
      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const amountRub = Number(body.amountRub);
        const method = String(body.method || "SBP").toUpperCase();
        const rate = Number(body.rate);
        const payBank = String(body.payBank || "");
        const payRequisite = String(body.payRequisite || "");
        if (!Number.isFinite(amountRub) || amountRub <= 0) return bad("Invalid amountRub");
        if (!Number.isFinite(rate) || rate <= 0) return bad("Invalid rate");
        if (!["SBP", "CARD"].includes(method)) return bad("Invalid method");
        const offers = await readJsonKV("buyOffers", []);
        const id = randId(10);
        const checkOnly = !!body.checkOnly;
        offers.unshift({
          id,
          amountRub,
          method,
          rate,
          payBank,
          payRequisite,
          checkOnly,
          frozen: false,
          status: "NEW",
          checkInfo: null,
          wallet: null,
          txHash: null,
          createdAt: now()
        });
        await writeJsonKV("buyOffers", offers);
        try {
          ctx.waitUntil(
            tgNotifyAdmin({
              title: "BUY: \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430 \u0437\u0430\u044F\u0432\u043A\u0430",
              deal: `BUY ${id}`,
              step: "ADMIN_BUY_CREATE",
              req: request,
              lines: [
                `Amount: ${amountRub} RUB`,
                `Method: ${method}`,
                `Rate: ${rate}`,
                `Bank: ${payBank}`,
                `Requisite: ${payRequisite}`
              ]
            })
          );
        } catch {
        }
        try {
          if (env.RESERVATIONS_DO) {
            const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-amount-watch"));
            ctx.waitUntil(
              stub.fetch("https://do/match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  offer: { id, amountRub, rate, method, payBank, payRequisite }
                })
              })
            );
          }
        } catch {
        }
        return json({ ok: true, id });
      }
      return bad("Method not allowed", 405);
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/offers\/([^/]+)$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        const id = m[1];
        if (request.method === "PATCH") {
          const body = await request.json().catch(() => ({}));
          const offers = await readJsonKV("buyOffers", []);
          const idx = offers.findIndex((o) => o.id === id);
          if (idx < 0) return bad("Not found", 404);
          const prevStatus = String(offers[idx].status || "").toUpperCase();
          if (typeof body.frozen === "boolean") offers[idx].frozen = body.frozen;
          if (body.status) {
            offers[idx].status = String(body.status).toUpperCase();
          }
          if (body.txHash !== void 0) {
            const v = body.txHash == null ? "" : String(body.txHash).trim();
            offers[idx].txHash = v ? v : null;
          }
          const nextStatus = String(offers[idx].status || "").toUpperCase();
          if (nextStatus === "SUCCESS" && prevStatus !== "SUCCESS") {
            try {
              if (offers[idx].qrOrder) {
                const settled = await settleQrBuyOfferTransfer(offers[idx]);
                if (!settled?.ok) {
                  offers[idx].status = prevStatus || "ON_CHECK";
                  return bad(
                    settled?.error === "INSUFFICIENT_BALANCE" ? "\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u0441\u0440\u0435\u0434\u0441\u0442\u0432: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0442\u0440\u0430\u0442\u0438\u0442\u0441\u044F \u043A\u0435\u0448\u0431\u044D\u043A, \u0437\u0430\u0442\u0435\u043C \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u043A\u043E\u0448\u0435\u043B\u0451\u043A" : settled?.error || "QR settle failed",
                    409
                  );
                }
                offers[idx].walletCreditedAt = offers[idx].walletCreditedAt || Date.now();
                offers[idx].qrOrder = offers[idx].qrOrder || {};
                offers[idx].qrOrder.cashbackUsedE6 = Number(settled?.cashbackUsedDec6 || offers[idx].qrOrder.cashbackUsedE6 || 0) || 0;
                offers[idx].qrOrder.walletUsedE6 = Number(settled?.walletUsedDec6 || offers[idx].qrOrder.walletUsedE6 || 0) || 0;
                offers[idx].qrOrder.cashbackAwardedE6 = Number(offers[idx].qrOrder.cashbackAwardedE6 || 0) || 0;
              } else {
                await tryAwardBonusForBuyOffer(offers[idx]);
                await creditBuyOfferToWalletBalance(offers[idx]);
                offers[idx].walletCreditedAt = offers[idx].walletCreditedAt || Date.now();
                offers[idx].cashbackAwardedE6 = 0;
                offers[idx].cashbackAwardedAt = 0;
              }
            } catch (e) {
              offers[idx].status = prevStatus || "ON_CHECK";
              return bad(e?.message || "Settlement failed", 409);
            }
          }
          try {
            if (nextStatus === "SUCCESS" && offers[idx].qrOrder) {
              const amountE6 = Number(offers[idx]?.qrOrder?.settledAmountE6 || 0) || Math.trunc(Number(offers[idx].amountRub || 0) / Number(offers[idx].rate || 0) * 1e6);
              const creatorUser = await resolveUserByIdShape(String(offers[idx]?.qrOrder?.createdBy?.id || offers[idx]?.user?.id || ""));
              const executorUser = await resolveUserByIdShape(String(offers[idx]?.executorUser?.id || ""));
              ctx.waitUntil(tgNotifyWallet({
                kind: "QRPAY_CREATOR_DEBIT",
                user: creatorUser,
                req: request,
                refId: String(offers[idx].id || id),
                step: "BUY_QR_SUCCESS",
                lines: [
                  "\u0421\u0434\u0435\u043B\u043A\u0430: BUY / QR",
                  "\u0421\u0442\u0430\u0442\u0443\u0441: SUCCESS",
                  `\u0421\u043F\u0438\u0441\u0430\u043D\u043E \u0443 \u0441\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044F: ${fmtUsdtE6(amountE6)}`,
                  `\u0418\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C: ${executorUser?.username ? "@" + executorUser.username : executorUser?.id || "\u2014"}`,
                  `\u0421\u0443\u043C\u043C\u0430 \u0432 \u20BD: ${Number(offers[idx].amountRub || 0) || 0}`,
                  `\u041A\u0443\u0440\u0441: ${Number(offers[idx].rate || 0) || 0}`
                ]
              }));
              ctx.waitUntil(tgNotifyWallet({
                kind: "QRPAY_EXECUTOR_CREDIT",
                user: executorUser,
                req: request,
                refId: String(offers[idx].id || id),
                step: "BUY_QR_SUCCESS",
                lines: [
                  "\u0421\u0434\u0435\u043B\u043A\u0430: BUY / QR",
                  "\u0421\u0442\u0430\u0442\u0443\u0441: SUCCESS",
                  `\u0417\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E: ${fmtUsdtE6(amountE6)}`,
                  `\u0421\u043E\u0437\u0434\u0430\u0442\u0435\u043B\u044C QR: ${creatorUser?.username ? "@" + creatorUser.username : creatorUser?.id || "\u2014"}`,
                  `\u0421\u0443\u043C\u043C\u0430 \u0432 \u20BD: ${Number(offers[idx].amountRub || 0) || 0}`,
                  `\u041A\u0443\u0440\u0441: ${Number(offers[idx].rate || 0) || 0}`
                ]
              }));
            } else if (nextStatus === "SUCCESS") {
              const amountE6 = Number(offers[idx].walletCreditedE6 || 0) || Math.trunc(Number(offers[idx].amountRub || 0) / Number(offers[idx].rate || 0) * 1e6);
              const buyerUser = await resolveUserByIdShape(String(offers[idx]?.user?.id || ""));
              ctx.waitUntil(tgNotifyWallet({
                kind: "P2P_BUY_CREDIT",
                user: buyerUser,
                req: request,
                refId: String(offers[idx].id || id),
                step: "BUY_SUCCESS",
                lines: [
                  "\u0421\u0434\u0435\u043B\u043A\u0430: BUY",
                  "\u0421\u0442\u0430\u0442\u0443\u0441: SUCCESS",
                  `\u041D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E: ${fmtUsdtE6(amountE6)}`,
                  `\u0421\u0443\u043C\u043C\u0430 \u0432 \u20BD: ${Number(offers[idx].amountRub || 0) || 0}`,
                  `\u041A\u0443\u0440\u0441: ${Number(offers[idx].rate || 0) || 0}`,
                  `\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B/\u0431\u0430\u043D\u043A: ${String(offers[idx].payBank || offers[idx].method || "\u2014")}`
                ]
              }));
              ctx.waitUntil(tgNotifyAdmin({
                title: "\u{1F91D} P2P BUY: \u0441\u0434\u0435\u043B\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430",
                user: buyerUser,
                deal: String(offers[idx].id || id),
                step: "BUY_SUCCESS",
                req: request,
                lines: [
                  `\u0421\u0442\u0430\u0442\u0443\u0441: ${nextStatus}`,
                  `\u0421\u0443\u043C\u043C\u0430 \u0432 \u20BD: ${Number(offers[idx].amountRub || 0) || 0}`,
                  `\u041A\u0443\u0440\u0441: ${Number(offers[idx].rate || 0) || 0}`,
                  `\u041D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E: ${fmtUsdtE6(amountE6)}`,
                  `\u041C\u0435\u0442\u043E\u0434: ${String(offers[idx].payBank || offers[idx].method || "\u2014")}`
                ]
              }));
            }
          } catch {
          }
          try {
            if (nextStatus && nextStatus !== prevStatus) {
              let msg = `\u2139\uFE0F \u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E \u0441\u0434\u0435\u043B\u043A\u0435 BUY ${id}: ${statusRu("BUY", nextStatus)}`;
              if (nextStatus === "ON_CHECK") msg = "\u{1F50E} \u041C\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u0438 \u0447\u0435\u043A \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043E\u043F\u043B\u0430\u0442\u0443. \u0421\u043A\u043E\u0440\u043E \u0432\u0435\u0440\u043D\u0451\u043C\u0441\u044F \u0441 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435\u043C \u23F3";
              if (nextStatus === "SUCCESS") msg = "\u2705 \u0421\u0434\u0435\u043B\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430!\nUSDT \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u044B \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u{1F4B0}\u{1F389}";
              if (nextStatus === "ERROR") msg = "\u26A0\uFE0F \u041F\u043E \u0441\u0434\u0435\u043B\u043A\u0435 \u0432\u043E\u0437\u043D\u0438\u043A\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430. \u041C\u044B \u0443\u0436\u0435 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0435\u043C\u0441\u044F \u2014 \u043F\u0440\u0438 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u0438 \u043D\u0430\u043F\u0438\u0448\u0435\u043C \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 \u{1F91D}";
              if (nextStatus === "CANCELED" || nextStatus === "CANCELLED") msg = "\u274C \u0421\u0434\u0435\u043B\u043A\u0430 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430. \u0415\u0441\u043B\u0438 \u044D\u0442\u043E \u043D\u0435\u043E\u0436\u0438\u0434\u0430\u043D\u043D\u043E \u2014 \u043D\u0430\u043F\u0438\u0448\u0438 \u0432 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0443 \u{1F447}";
              ctx.waitUntil(tgNotifyUserText(offers[idx].user || null, msg));
            }
          } catch {
          }
          try {
            if (nextStatus === "SUCCESS" && offers[idx].qrOrder) {
              ctx.waitUntil(tgNotifyUserText(
                offers[idx].executorUser || null,
                "\u2705 QR-\u0437\u0430\u044F\u0432\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430! \u0412\u043E\u0437\u043D\u0430\u0433\u0440\u0430\u0436\u0434\u0435\u043D\u0438\u0435 \u0432 USDT \u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E \u043D\u0430 \u0432\u0430\u0448 \u043A\u043E\u0448\u0435\u043B\u0451\u043A."
              ));
            }
          } catch {
          }
          try {
            if (nextStatus !== prevStatus && offers[idx].sourceKind === "BUY_AMOUNT_CHAT_REPLY") {
              let sourceMsg = "";
              if (nextStatus === "SUCCESS") {
                sourceMsg = `\u2705 \u0421\u0434\u0435\u043B\u043A\u0430 BUY ${id} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E`;
              } else if (nextStatus === "FAILED" || nextStatus === "ERROR") {
                sourceMsg = `\u274C \u0421\u0434\u0435\u043B\u043A\u0430 BUY ${id} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u043D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u043E`;
              } else if (nextStatus === "PAID") {
                sourceMsg = `\u{1F7E1} \u041A\u043B\u0438\u0435\u043D\u0442 \u043E\u0442\u043C\u0435\u0442\u0438\u043B \u043E\u043F\u043B\u0430\u0442\u0443 \u043F\u043E BUY ${id}`;
              } else if (nextStatus === "ON_CHECK") {
                sourceMsg = `\u{1F4CE} \u041A\u043B\u0438\u0435\u043D\u0442 \u043F\u0440\u0438\u0441\u043B\u0430\u043B \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 \u043E\u043F\u043B\u0430\u0442\u044B \u043F\u043E BUY ${id}`;
              } else if (nextStatus === "CANCELED" || nextStatus === "CANCELLED") {
                sourceMsg = `\u26AA\uFE0F \u0421\u0434\u0435\u043B\u043A\u0430 BUY ${id} \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430`;
              }
              if (sourceMsg) {
                ctx.waitUntil(tgNotifyOfferSourceChat(offers[idx], sourceMsg));
              }
              if (nextStatus === "SUCCESS") {
                const offer = offers[idx];
                const sourceChatId = String(offer?.sourceChat?.id || "").trim();
                if (sourceChatId) {
                  try {
                    const debtKey = `chatDebt:${sourceChatId}`;
                    const prev = await readJsonKV(debtKey, { totalE6: 0, deals: [] });
                    const chatRate = Number(offer.sourceCustomRate || 0) > 0 ? Number(offer.sourceCustomRate) : Number(offer.rate || 1);
                    const dealUsdtE6 = Math.trunc(Number(offer.amountRub || 0) / chatRate * 1e6);
                    const newTotalE6 = (Number(prev.totalE6) || 0) + dealUsdtE6;
                    const deals = Array.isArray(prev.deals) ? prev.deals : [];
                    deals.push({ offerId: id, amountRub: Number(offer.amountRub || 0), rate: chatRate, usdtE6: dealUsdtE6, ts: now() });
                    await writeJsonKV(debtKey, { totalE6: newTotalE6, deals: deals.slice(-500) });
                    const debtUsdt = (newTotalE6 / 1e6).toFixed(2);
                    ctx.waitUntil(
                      tgSendMessageEx(
                        sourceChatId,
                        `\u{1F4B0} \u0414\u043E\u043B\u0433 \u043F\u043E \u0447\u0430\u0442\u0443: ${debtUsdt} USDT
(+${(dealUsdtE6 / 1e6).toFixed(2)} USDT \u0437\u0430 \u0441\u0434\u0435\u043B\u043A\u0443 ${id})`,
                        {
                          reply_markup: JSON.stringify({
                            inline_keyboard: [
                              [{ text: "\u041E\u0431\u043D\u0443\u043B\u0438\u0442\u044C", callback_data: `chatdebt_reset:${sourceChatId}` }],
                              [{ text: "\u2795 \u041D\u0430\u0447\u0438\u0441\u043B\u0438\u0442\u044C", callback_data: `chatdebt_add:${sourceChatId}` }, { text: "\u2796 \u0421\u043F\u0438\u0441\u0430\u0442\u044C", callback_data: `chatdebt_sub:${sourceChatId}` }]
                            ]
                          })
                        }
                      ).catch(() => {
                      })
                    );
                  } catch {
                  }
                }
              }
            }
          } catch {
          }
          await writeJsonKV("buyOffers", offers);
          return json({ ok: true });
        }
        if (request.method === "DELETE") {
          const offers = await readJsonKV("buyOffers", []);
          await writeJsonKV(
            "buyOffers",
            offers.filter((o) => o.id !== id)
          );
          const reserves = await readJsonKV("reserves", {});
          if (reserves[id]) {
            delete reserves[id];
            await writeJsonKV("reserves", reserves);
          }
          return json({ ok: true });
        }
        return bad("Method not allowed", 405);
      }
    }
    if (url.pathname === "/api/admin/sell_offers") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      if (request.method === "GET") {
        const offers = await readJsonKV("sellOffers", []);
        const arr = Array.isArray(offers) ? offers : [];
        let rapiraAsk = null;
        try {
          const rates = await fetchRapiraRate("USDT/RUB");
          rapiraAsk = Number(rates.ask);
        } catch (_) {
        }
        const out = arr.map((o) => {
          const mode = String(o.rateMode || "ABS").toUpperCase();
          if (mode === "PERCENT" && Number.isFinite(rapiraAsk) && rapiraAsk > 0) {
            const pct = Number(o.ratePercent || 0);
            const dynamicRate = rapiraAsk * (1 + pct / 100);
            return {
              ...o,
              rate: Number(dynamicRate.toFixed(2))
            };
          }
          return {
            ...o,
            rate: Number(o.rate || 0)
          };
        });
        return json({ ok: true, offers: out });
      }
      if (request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const method = String(body.method || "CROSSFLAG").toUpperCase();
        const rateMode = String(body.rateMode || "ABS").toUpperCase();
        const rate = Number(body.rate);
        const ratePercent = Number(body.ratePercent);
        const minCheckRub = Number(body.minCheckRub ?? body.minCheck ?? 0);
        const avgTimeMin = Number(body.avgTimeMin ?? body.avgTime ?? 0);
        if (!["ABS", "PERCENT"].includes(rateMode)) return bad("Invalid rateMode");
        if (rateMode === "ABS" && (!Number.isFinite(rate) || rate <= 0)) return bad("Invalid rate");
        if (rateMode === "PERCENT" && !Number.isFinite(ratePercent)) return bad("Invalid ratePercent");
        if (!Number.isFinite(minCheckRub) || minCheckRub < 0) return bad("Invalid minCheckRub");
        if (!Number.isFinite(avgTimeMin) || avgTimeMin < 0) return bad("Invalid avgTimeMin");
        const offers = await readJsonKV("sellOffers", []);
        const id = "so_" + randId(10);
        offers.unshift({
          id,
          method,
          rateMode,
          rate: rateMode === "ABS" ? Number(rate.toFixed(2)) : null,
          ratePercent: rateMode === "PERCENT" ? ratePercent : null,
          minCheckRub,
          avgTimeMin,
          frozen: false,
          status: "NEW",
          createdAt: now()
        });
        await writeJsonKV("sellOffers", offers);
        return json({ ok: true, id });
      }
      return bad("Method not allowed", 405);
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/sell_offers\/([^/]+)$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        const id = m[1];
        if (request.method === "PATCH") {
          const body = await request.json().catch(() => ({}));
          const offers = await readJsonKV("sellOffers", []);
          const idx = offers.findIndex((o) => o.id === id);
          if (idx < 0) return bad("Not found", 404);
          if (typeof body.frozen === "boolean") offers[idx].frozen = body.frozen;
          if (body.status) offers[idx].status = String(body.status).toUpperCase();
          await writeJsonKV("sellOffers", offers);
          return json({ ok: true });
        }
        if (request.method === "DELETE") {
          const offers = await readJsonKV("sellOffers", []);
          await writeJsonKV(
            "sellOffers",
            offers.filter((o) => o.id !== id)
          );
          return json({ ok: true });
        }
        return bad("Method not allowed", 405);
      }
    }
    if (url.pathname === "/api/admin/sell_deals" && request.method === "GET") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const deals = await readJsonKV(SELL_DEALS_KEY, []);
      const arr = Array.isArray(deals) ? deals : [];
      const out = arr.map((d) => {
        const safeDeal = { ...d };
        delete safeDeal.secret;
        safeDeal.status = normalizeSellStatus(safeDeal.status);
        return withSellDerivedFields(safeDeal);
      });
      return json({ ok: true, deals: out });
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/sell_deals\/([^/]+)$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        const dealId = decodeURIComponent(m[1] || "");
        if (request.method !== "PATCH") return bad("Method not allowed", 405);
        const body = await request.json().catch(() => ({}));
        const nextStatus = normalizeSellStatus(body.status);
        const deals = await readJsonKV(SELL_DEALS_KEY, []);
        const idx = (Array.isArray(deals) ? deals : []).findIndex((d) => String(d.dealId || "") === dealId);
        if (idx < 0) return bad("Deal not found", 404);
        const deal = deals[idx];
        const prev = normalizeSellStatus(deal.status);
        deal.status = nextStatus || prev;
        const needsWalletRefund = String(deal.fundingSource || "").toUpperCase() === "WALLET" && Number(deal.walletDebitedE6 || 0) > 0 && !Number(deal.walletRefundedAt || 0) && ["CANCELED", "CRYPTO_NOT_RECEIVED", "ERROR", "FAILED"].includes(String(deal.status || "").toUpperCase());
        if (needsWalletRefund) {
          const refundTs = now();
          const refundUserId = String(deal?.user?.id || "").trim();
          if (refundUserId) {
            await d1.prepare(
              "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET usdt_trc20_balance = usdt_trc20_balance + excluded.usdt_trc20_balance, updated_at=excluded.updated_at"
            ).bind(refundUserId, Number(deal.walletDebitedE6 || 0), refundTs).run();
            deal.walletRefundedAt = refundTs;
            deal.walletRefundedE6 = Number(deal.walletDebitedE6 || 0);
            await appendWalletLedgerEntries([
              {
                id: `sell-refund-${dealId}`,
                userId: refundUserId,
                kind: "sell_refund",
                direction: "in",
                amountUsdt: Number(deal.walletDebitedE6 || 0) / 1e6,
                amountDec6: Number(deal.walletDebitedE6 || 0),
                title: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442 USDT",
                subtitle: `SELL ${dealId}`,
                ts: refundTs,
                meta: { dealId, status: deal.status, reason: "admin_status" }
              }
            ]);
            pushSellLog(deal, "WALLET_REFUND", "USDT returned to internal wallet", {
              amountE6: Number(deal.walletDebitedE6 || 0),
              status: deal.status
            });
          }
        }
        if (isSellCompletedStatus(deal.status)) {
          await tryAwardBonusForSellDeal(deal);
          try {
            const hidden = await hideSellOfferAfterCompletedDeal(deal.offerId, dealId);
            if (hidden) {
              pushSellLog(deal, "OFFER_HIDDEN", "Sell offer hidden after completed payment", {
                offerId: String(deal.offerId || "")
              });
            }
          } catch (e) {
            pushSellLog(deal, "OFFER_HIDE_ERROR", String(e?.message || e || "Failed to hide sell offer"), {
              offerId: String(deal.offerId || "")
            });
          }
        }
        deal.updatedAt = now();
        pushSellLog(deal, "ADMIN_STATUS", `Status changed ${prev} -> ${deal.status}`, { status: deal.status });
        try {
          if (prev !== deal.status && isSellCompletedStatus(deal.status)) {
            const sellerUser = await resolveUserByIdShape(String(deal?.user?.id || ""));
            ctx.waitUntil(tgNotifyAdmin({
              title: "\u{1F91D} P2P SELL: \u0441\u0434\u0435\u043B\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430",
              user: sellerUser,
              deal: String(deal.dealId || dealId),
              step: "SELL_COMPLETED",
              req: request,
              lines: [
                `\u0421\u0442\u0430\u0442\u0443\u0441: ${String(deal.status || "")}`,
                `\u0421\u0443\u043C\u043C\u0430 USDT: ${Number(deal.amountUsdt || 0) || 0}`,
                `\u0421\u0443\u043C\u043C\u0430 \u0432 \u20BD: ${Number(deal.amountRub || deal.rubAmount || 0) || 0}`,
                `\u041A\u0443\u0440\u0441: ${Number(deal.rate || 0) || 0}`,
                `\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B: ${String(deal.bankName || deal.bank || deal.cardNumberMasked || deal.requisitesMasked || "\u2014")}`
              ]
            }));
          }
        } catch {
        }
        try {
          if (prev && deal.status && prev !== deal.status) {
            const ns = String(deal.status || "").toUpperCase();
            let msg = `\u2139\uFE0F \u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u043E \u0441\u0434\u0435\u043B\u043A\u0435 SELL ${dealId}: ${statusRu("SELL", ns)}`;
            if (ns === "WAIT_CRYPTO") msg = "\u23F3 \u041E\u0436\u0438\u0434\u0430\u0435\u043C \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u0435 USDT. \u041F\u043E\u0441\u043B\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0435 \u0437\u0430\u0431\u0443\u0434\u044C \u0443\u043A\u0430\u0437\u0430\u0442\u044C TX Hash \u{1F517}";
            if (ns === "CRYPTO_RECEIVED") msg = "\u2705 USDT \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u044B!\n\u041D\u0430\u0447\u0438\u043D\u0430\u0435\u043C \u0432\u044B\u043F\u043B\u0430\u0442\u0443 \u20BD \u043F\u043E \u0442\u0432\u043E\u0438\u043C \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u0430\u043C \u{1F4B3}";
            if (ns === "CHECK_SUBMITTED") msg = "\u{1F575}\uFE0F \u0414\u043E\u043F. \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0430. \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u0438 \u0441\u043A\u043E\u0440\u043E \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u043C \u23F3";
            if (ns === "PAYOUT_PROGRESS") msg = "\u{1F4B3} \u0412\u044B\u043F\u043B\u0430\u0442\u0430 \u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435. \u0421\u043C\u043E\u0442\u0440\u0438\u043C \u043F\u043E\u0441\u0442\u0443\u043F\u043B\u0435\u043D\u0438\u044F \u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u043C \u0441\u0442\u0430\u0442\u0443\u0441 \u2705";
            if (ns === "COMPLETED") msg = "\u{1F389} \u0421\u0434\u0435\u043B\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430! \u0412\u044B\u043F\u043B\u0430\u0442\u0430 \u20BD \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0430. \u0421\u043F\u0430\u0441\u0438\u0431\u043E \u{1F91D}";
            ctx.waitUntil(tgNotifyUserText(deal.user || null, msg));
          }
        } catch {
        }
        deals[idx] = deal;
        await writeJsonKV(SELL_DEALS_KEY, deals);
        return json({ ok: true });
      }
    }
    if (url.pathname === "/tg/webhook" && request.method === "POST") {
      try {
        const upd = await request.json().catch(() => null);
        if (!upd) return json({ ok: true });
        const cb = upd.callback_query || null;
        if (cb && cb.data) {
          const m = String(cb.data).match(/^buyproof:([^:]+):(success|error)$/i);
          if (m) {
            const offerId = String(m[1] || "");
            const action = String(m[2] || "").toLowerCase();
            const cbChatId = String(cb?.message?.chat?.id || "");
            const cbMessageId = Number(cb?.message?.message_id || 0) || 0;
            const cbUserId = String(cb?.from?.id || "");
            const cbUsername = String(cb?.from?.username || "").replace(/^@/, "");
            if (!cbChatId || !cbUserId) {
              await tgAnswerCallbackQuery(cb.id, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0447\u0430\u0442", true);
              return json({ ok: true });
            }
            const res = await setBuyOfferStatusFromChat({
              offerId,
              nextStatus: action === "success" ? "SUCCESS" : "ERROR",
              actor: { id: cbUserId, username: cbUsername },
              req: request
            });
            if (!res?.ok) {
              await tgAnswerCallbackQuery(cb.id, String(res?.error || "\u041E\u0448\u0438\u0431\u043A\u0430"), true);
              return json({ ok: true });
            }
            await tgClearInlineButtons(cbChatId, cbMessageId);
            await tgAnswerCallbackQuery(
              cb.id,
              action === "success" ? "\u041E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u043A\u0430\u043A \u0443\u0441\u043F\u0435\u0448\u043D\u043E" : "\u041E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u043A\u0430\u043A \u043D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u043E",
              false
            );
            await tgSendMessageEx(
              cbChatId,
              action === "success" ? `\u2705 \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E BUY ${offerId} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430: \u0443\u0441\u043F\u0435\u0448\u043D\u043E.` : `\u274C \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E BUY ${offerId} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430: \u043D\u0435\u0443\u0441\u043F\u0435\u0448\u043D\u043E.`,
              cbMessageId ? { reply_to_message_id: cbMessageId } : {}
            ).catch(() => {
            });
            return json({ ok: true });
          }
          const debtMatch = String(cb.data).match(/^chatdebt_reset:(.+)$/);
          if (debtMatch) {
            const targetChatId = String(debtMatch[1] || "");
            if (targetChatId) {
              const debtKey = `chatDebt:${targetChatId}`;
              const prev = await readJsonKV(debtKey, { totalE6: 0, deals: [] });
              const oldTotal = (Number(prev.totalE6) || 0) / 1e6;
              await writeJsonKV(debtKey, { totalE6: 0, deals: [] });
              const cbChatId2 = String(cb?.message?.chat?.id || "");
              const cbMessageId2 = Number(cb?.message?.message_id || 0) || 0;
              const whoReset = cb?.from?.username ? "@" + cb.from.username : "userId:" + String(cb?.from?.id || "");
              if (cbChatId2 && cbMessageId2) {
                await tgClearInlineButtons(cbChatId2, cbMessageId2);
              }
              await tgAnswerCallbackQuery(cb.id, "\u0414\u043E\u043B\u0433 \u043E\u0431\u043D\u0443\u043B\u0451\u043D", false);
              await tgSendMessageEx(
                targetChatId,
                `\u{1F504} \u0414\u043E\u043B\u0433 \u043E\u0431\u043D\u0443\u043B\u0451\u043D (\u0431\u044B\u043B ${oldTotal.toFixed(2)} USDT).
\u041E\u0431\u043D\u0443\u043B\u0438\u043B: ${whoReset}`
              ).catch(() => {
              });
            } else {
              await tgAnswerCallbackQuery(cb.id, "\u041E\u0448\u0438\u0431\u043A\u0430", true);
            }
            return json({ ok: true });
          }
          const debtAdjMatch = String(cb.data).match(/^chatdebt_(add|sub):(.+)$/);
          if (debtAdjMatch) {
            const action = debtAdjMatch[1];
            const targetChatId = String(debtAdjMatch[2] || "");
            if (targetChatId) {
              const label = action === "add" ? "\u043D\u0430\u0447\u0438\u0441\u043B\u0438\u0442\u044C" : "\u0441\u043F\u0438\u0441\u0430\u0442\u044C";
              const promptMsg = await tgSendMessageEx(
                targetChatId,
                `\u270F\uFE0F \u041E\u0442\u0432\u0435\u0442\u044C\u0442\u0435 \u043D\u0430 \u044D\u0442\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0441\u0443\u043C\u043C\u043E\u0439 \u0432 USDT, \u0447\u0442\u043E\u0431\u044B ${label}.
\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: 12.5`
              ).catch(() => null);
              if (promptMsg && promptMsg.message_id) {
                const linkKey = `chatDebtPrompt:${targetChatId}:${promptMsg.message_id}`;
                await env.DB.put(linkKey, JSON.stringify({ action, chatId: targetChatId }), { expirationTtl: 600 });
              }
              await tgAnswerCallbackQuery(cb.id, `\u041E\u0442\u0432\u0435\u0442\u044C\u0442\u0435 \u0441\u0443\u043C\u043C\u043E\u0439 \u043D\u0430 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0432 \u0447\u0430\u0442\u0435`, false);
            } else {
              await tgAnswerCallbackQuery(cb.id, "\u041E\u0448\u0438\u0431\u043A\u0430", true);
            }
            return json({ ok: true });
          }
        }
        const memberUpd = upd.my_chat_member || upd.chat_member || null;
        if (memberUpd && memberUpd.chat) {
          const chType = String(memberUpd.chat.type || "");
          const newStatus = String(memberUpd.new_chat_member?.status || "").toLowerCase();
          if ((chType === "group" || chType === "supergroup") && (newStatus === "left" || newStatus === "kicked")) {
            await removeBuyAmountNotifyChat(String(memberUpd.chat.id || ""));
          }
        }
        const msg = upd.message || upd.edited_message || null;
        if (!msg || !msg.from) return json({ ok: true });
        const from = msg.from;
        const tgId = String(from.id || "");
        const username = normUsername(from.username || "");
        const chatId = String(msg.chat && msg.chat.id ? msg.chat.id : "");
        const chatType = String(msg.chat?.type || "");
        const isPrivateChat = chatType === "private";
        const text = String(msg.text || "").trim();
        const cmd = normalizeTgCommand(text);
        if (msg.reply_to_message && chatId) {
          const replyToId = Number(msg.reply_to_message.message_id || 0);
          if (replyToId) {
            const linkKey = `chatDebtPrompt:${chatId}:${replyToId}`;
            const promptRaw = await env.DB.get(linkKey);
            if (promptRaw) {
              try {
                const prompt = JSON.parse(promptRaw);
                const action = prompt.action;
                const amountUsdt = Number(String(text).replace(",", ".").replace(/[^\d.]/g, ""));
                if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) {
                  await tgSendMessage(chatId, "\u274C \u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u0441\u0443\u043C\u043C\u0430. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0447\u0438\u0441\u043B\u043E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: 12.5").catch(() => {
                  });
                  return json({ ok: true });
                }
                const adjustE6 = Math.trunc(amountUsdt * 1e6);
                const debtKey = `chatDebt:${chatId}`;
                const prev = await readJsonKV(debtKey, { totalE6: 0, deals: [] });
                const sign = action === "add" ? 1 : -1;
                const newTotalE6 = Math.max(0, (Number(prev.totalE6) || 0) + sign * adjustE6);
                const deals = Array.isArray(prev.deals) ? prev.deals : [];
                const who = from.username ? "@" + from.username : "userId:" + tgId;
                deals.push({ manual: true, action, amountUsdt, by: who, ts: now() });
                await writeJsonKV(debtKey, { totalE6: newTotalE6, deals: deals.slice(-500) });
                await env.DB.delete(linkKey);
                const label = action === "add" ? "\u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u043E" : "\u0441\u043F\u0438\u0441\u0430\u043D\u043E";
                const newDebt = (newTotalE6 / 1e6).toFixed(2);
                await tgSendMessageEx(
                  chatId,
                  `\u2705 ${amountUsdt.toFixed(2)} USDT ${label}.
\u{1F4B0} \u0414\u043E\u043B\u0433 \u043F\u043E \u0447\u0430\u0442\u0443: ${newDebt} USDT
\u041A\u0435\u043C: ${who}`,
                  {
                    reply_markup: JSON.stringify({
                      inline_keyboard: [
                        [{ text: "\u041E\u0431\u043D\u0443\u043B\u0438\u0442\u044C", callback_data: `chatdebt_reset:${chatId}` }],
                        [{ text: "\u2795 \u041D\u0430\u0447\u0438\u0441\u043B\u0438\u0442\u044C", callback_data: `chatdebt_add:${chatId}` }, { text: "\u2796 \u0421\u043F\u0438\u0441\u0430\u0442\u044C", callback_data: `chatdebt_sub:${chatId}` }]
                      ]
                    })
                  }
                ).catch(() => {
                });
                return json({ ok: true });
              } catch {
              }
            }
          }
        }
        if (chatId && (chatType === "group" || chatType === "supergroup")) {
          if (cmd === "/bal") {
            const debtKey = `chatDebt:${chatId}`;
            const prev = await readJsonKV(debtKey, { totalE6: 0, deals: [] });
            const debtUsdt = ((Number(prev.totalE6) || 0) / 1e6).toFixed(2);
            await tgSendMessageEx(
              chatId,
              `\u{1F4B0} \u0414\u043E\u043B\u0433 \u043F\u043E \u0447\u0430\u0442\u0443: ${debtUsdt} USDT`,
              {
                reply_markup: JSON.stringify({
                  inline_keyboard: [
                    [{ text: "\u041E\u0431\u043D\u0443\u043B\u0438\u0442\u044C", callback_data: `chatdebt_reset:${chatId}` }],
                    [{ text: "\u2795 \u041D\u0430\u0447\u0438\u0441\u043B\u0438\u0442\u044C", callback_data: `chatdebt_add:${chatId}` }, { text: "\u2796 \u0421\u043F\u0438\u0441\u0430\u0442\u044C", callback_data: `chatdebt_sub:${chatId}` }]
                  ]
                })
              }
            ).catch(() => {
            });
            return json({ ok: true });
          }
          if (cmd === "/buyamount_on") {
            const isAdmin = await tgIsChatAdmin(chatId, tgId);
            if (!isAdmin) {
              await tgSendMessage(chatId, "\u26D4\uFE0F \u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0447\u0430\u0442\u0430 \u043C\u043E\u0436\u0435\u0442 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u0445 \u0441\u0443\u043C\u043C\u044B.").catch(() => {
              });
              return json({ ok: true });
            }
            await addBuyAmountNotifyChat(msg.chat, from);
            await tgSendMessage(chatId, "\u2705 \u042D\u0442\u043E\u0442 \u0447\u0430\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D. \u0422\u0435\u043F\u0435\u0440\u044C \u0441\u044E\u0434\u0430 \u0431\u0443\u0434\u0443\u0442 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u0441\u0443\u043C\u043C\u044B.").catch(() => {
            });
            return json({ ok: true });
          }
          if (cmd === "/buyamount_off") {
            const isAdmin = await tgIsChatAdmin(chatId, tgId);
            if (!isAdmin) {
              await tgSendMessage(chatId, "\u26D4\uFE0F \u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0447\u0430\u0442\u0430 \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u0445 \u0441\u0443\u043C\u043C\u044B.").catch(() => {
              });
              return json({ ok: true });
            }
            await removeBuyAmountNotifyChat(chatId);
            await tgSendMessage(chatId, "\u2705 \u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0447\u0430\u0442\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u0445 \u0441\u0443\u043C\u043C\u044B \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u044B.").catch(() => {
            });
            return json({ ok: true });
          }
          if (cmd === "/buyamount_status") {
            const chats = await getBuyAmountNotifyChats();
            const enabled = chats.some((x) => String(x?.chatId || "") === chatId);
            await tgSendMessage(
              chatId,
              enabled ? "\u2705 \u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0447\u0430\u0442\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u0445 \u0441\u0443\u043C\u043C\u044B \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B." : "\u2139\uFE0F \u0414\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u0447\u0430\u0442\u0430 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u0445 \u0441\u0443\u043C\u043C\u044B \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u044B."
            ).catch(() => {
            });
            return json({ ok: true });
          }
          const enabledChats = await getBuyAmountNotifyChats();
          const enabledHere = enabledChats.some((x) => String(x?.chatId || "") === chatId);
          const replyToMessageId = String(msg?.reply_to_message?.message_id || "").trim();
          const ownMessageId = String(msg?.message_id || "").trim();
          if (enabledHere && replyToMessageId && text) {
            const processed = await env.DB.get(buyAmountReplyProcessedKey(chatId, ownMessageId));
            if (processed) return json({ ok: true });
            const link = await getBuyAmountBroadcastLink(chatId, replyToMessageId);
            if (link) {
              const created = await createBuyOfferFromBuyAmountReply({
                link,
                chat: msg.chat,
                from,
                text,
                req: request,
                messageId: msg.message_id,
                replyToMessageId: msg?.reply_to_message?.message_id || null
              });
              if (!created?.ok) {
                await tgSendMessageEx(
                  chatId,
                  `\u26D4\uFE0F \u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443.
${String(created?.error || "\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430")}

\u041E\u0442\u0432\u0435\u0442 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0440\u043E\u0432\u043D\u043E \u0432 4 \u0441\u0442\u0440\u043E\u043A\u0438:
\u0421\u0443\u043C\u043C\u0430
\u0431\u0430\u043D\u043A
\u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442
\u043A\u0443\u0440\u0441`,
                  { reply_to_message_id: Number(msg.message_id || 0) }
                ).catch(() => {
                });
                return json({ ok: true });
              }
              await env.DB.put(
                buyAmountReplyProcessedKey(chatId, ownMessageId),
                JSON.stringify({ offerId: String(created.offer.id || "") }),
                { expirationTtl: 3600 * 24 * 30 }
              );
              await tgSendMessageEx(
                chatId,
                `\u2705 \u0417\u0430\u044F\u0432\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0430.
\u0421\u0443\u043C\u043C\u0430: ${String(created.offer.amountRub)} RUB
\u0411\u0430\u043D\u043A: ${String(created.offer.payBank)}
\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442: ${String(created.offer.payRequisite)}
\u041A\u0443\u0440\u0441: ${String(created.offer.rate)}`,
                { reply_to_message_id: Number(msg.message_id || 0) }
              ).catch(() => {
              });
              return json({ ok: true });
            }
          }
        }
        if (chatId && !username) {
          const t = String(msg.text || "");
          if (t.startsWith("/start")) {
            await tgSendMessage(
              chatId,
              "\u2757\uFE0F\u0423 \u0442\u0435\u0431\u044F \u043D\u0435 \u0437\u0430\u0434\u0430\u043D username \u0432 Telegram.\n\u0417\u0430\u0439\u0434\u0438 \u0432 Telegram \u2192 \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u2192 \u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438 \u0435\u0433\u043E, \u043F\u043E\u0442\u043E\u043C \u0441\u043D\u043E\u0432\u0430 \u043D\u0430\u0436\u043C\u0438 /start."
            ).catch(() => {
            });
          }
          return json({ ok: true });
        }
        if (tgId && username) {
          const existing = await readJsonKV(userKeyById(tgId), null);
          const user = existing || {
            id: tgId,
            username,
            chatId: "",
            dmChatId: "",
            chatType: "",
            createdAt: now(),
            lastSeenAt: now(),
            banned: false,
            note: "",
            deals: { buy: [], sell: [] }
          };
          user.username = username || user.username;
          user.lastSeenAt = now();
          user.updatedAt = now();
          if (isPrivateChat && chatId) {
            user.chatId = chatId;
            user.dmChatId = chatId;
            user.chatType = "private";
          }
          await writeJsonKV(userKeyById(tgId), user);
          await writeJsonKV(userKeyByUsername(username), { userId: tgId });
          await addUserToIndex(tgId);
          try {
            const isNew = !existing;
            ctx.waitUntil(
              tgNotifyAdmin({
                title: isNew ? "\u{1F195} \u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F" : "\u{1F504} /start \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E",
                user: { id: tgId, username },
                step: "TG_WEBHOOK",
                req: request,
                lines: [
                  "Username: @" + username,
                  "tgId: " + tgId,
                  "chatId: " + chatId,
                  "chatType: " + chatType
                ]
              })
            );
          } catch {
          }
          const t = String(msg.text || "");
          if (isPrivateChat && t.startsWith("/start")) {
             const START_IMAGE = env.START_IMAGE_URL || "https://postimg.cc/G4pFyTGM";
            const caption = "\u041D\u0430\u0434\u0451\u0436\u043D\u044B\u0439 \u043E\u0431\u043C\u0435\u043D \u043A\u0440\u0438\u043F\u0442\u043E\u0432\u0430\u043B\u044E\u0442 \u0441 \u0440\u0443\u0447\u043D\u043E\u0439 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u043E\u0439 \u0441\u0434\u0435\u043B\u043E\u043A\n\u0438 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0439 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u043E\u0439 \u043D\u0430 \u043A\u0430\u0436\u0434\u043E\u043C \u044D\u0442\u0430\u043F\u0435.\n\n<b>\u2014 \u041F\u043E\u043A\u0443\u043F\u043A\u0430 \u0438 \u043F\u0440\u043E\u0434\u0430\u0436\u0430 USDT</b>\n<b>\u2014 \u041F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u044B\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0431\u0435\u0437 \u0441\u043A\u0440\u044B\u0442\u044B\u0445 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0439</b>\n<b>\u2014 \u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0432\u0441\u0435\u0445 \u0441\u0434\u0435\u043B\u043E\u043A \u0432 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435</b>\n<b>\u2014 \u0411\u044B\u0441\u0442\u0440\u0430\u044F \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u043A\u0430 \u043F\u0440\u0438 \u043B\u044E\u0431\u044B\u0445 \u0432\u043E\u043F\u0440\u043E\u0441\u0430\u0445</b>\n\n";
            const kb = {
              inline_keyboard: [
                [{ text: "Сайт обменника", url: env.WEBSITE_URL || "https://zalupinenko.github.io/45675756756/" }],
                [
                  { text: "Мини-приложение", web_app: { url: env.WEBSITE_URL || "https://zalupinenko.github.io/45675756756/" } },
                  { text: "Поддержка", url: env.SUPPORT_TG_URL || "https://t.me/ferandoEx" }
                ]
              ]
            };
            const res = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendPhoto`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                photo: START_IMAGE,
                caption,
                parse_mode: "HTML",
                reply_markup: kb
              })
            });
            const j = await res.json().catch(() => null);
            if (!j || !j.ok) {
              await tgSendMessage(chatId, caption).catch(() => {
              });
            }
          }
        }
        return json({ ok: true });
      } catch {
        return json({ ok: true });
      }
    }
    if (url.pathname === "/api/public/auth/request_code" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const u = normUsername(body.username || body.tg || body.tgUsername || "");
        if (!u) return bad("Invalid username");
        const refCodeRaw = body.refCode ?? body.ref ?? body.code ?? "";
        const refCode = normRefCode(refCodeRaw);
        const map = await readJsonKV(userKeyByUsername(u), null);
        if (!map || !map.userId) {
          return bad("User not found. Ask user to open the bot and press /start first.", 404);
        }
        const user = await readJsonKV(userKeyById(map.userId), null);
        if (!user || !user.chatId) return bad("Chat not linked. Ask user to /start bot.", 404);
        if (user.banned) return bad("Banned", 403);
        const prev = await readJsonKV(regCodeKey(u), null);
        if (prev && prev.expiresAt && now() < Number(prev.expiresAt) - 2 * 60 * 1e3) {
          return json({ ok: true, sent: true, note: "recent" });
        }
        const code = code6();
        const codeHash = await sha256Hex(code + ":" + u.toLowerCase());
        const rec = {
          username: u,
          userId: map.userId,
          codeHash,
          attempts: 0,
          createdAt: now(),
          expiresAt: now() + 10 * 60 * 1e3,
          refCode: refCode || null
        };
        await writeJsonKV(regCodeKey(u), rec, { expirationTtl: 10 * 60 });
        await tgSendMessage(user.chatId, `\u{1F510} \u041A\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F Crossflag: ${code}
\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 10 \u043C\u0438\u043D\u0443\u0442.`).catch(() => {
        });
        try {
          ctx.waitUntil(
            tgNotifyAdmin({
              title: "\u{1F510} \u0417\u0430\u043F\u0440\u043E\u0441 \u043A\u043E\u0434\u0430 \u0432\u0445\u043E\u0434\u0430",
              user: { id: user.id, username: u },
              step: "AUTH_REQUEST_CODE",
              req: request,
              lines: ["Username: @" + u]
            })
          );
        } catch {
        }
        return json({ ok: true, sent: true, expiresAt: rec.expiresAt });
      } catch (e) {
        return bad(String(e.message || e), 500);
      }
    }
    if (url.pathname === "/api/public/auth/verify_code" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const u = normUsername(body.username || "");
        const code = String(body.code || "").trim();
        if (!u) return bad("Invalid username");
        if (!/^\d{6}$/.test(code)) return bad("Invalid code");
        const rec = await readJsonKV(regCodeKey(u), null);
        if (!rec) return bad("Code not found", 404);
        if (now() > Number(rec.expiresAt || 0)) return bad("Code expired", 410);
        rec.attempts = Number(rec.attempts || 0) + 1;
        if (rec.attempts > 6) {
          await env.DB.delete(regCodeKey(u));
          return bad("Too many attempts", 429);
        }
        await writeJsonKV(regCodeKey(u), rec);
        const wantHash = await sha256Hex(code + ":" + u.toLowerCase());
        if (wantHash !== rec.codeHash) return bad("Wrong code", 401);
        const user = await readJsonKV(userKeyById(rec.userId), null);
        if (!user) return bad("User not found", 404);
        if (user.banned) return bad("Banned", 403);
        try {
          await ensureUserRefV2(user);
          if (rec.refCode && !(user.ref && user.ref.referrerUserId)) {
            const code2 = normRefCode(rec.refCode);
            const mapRef = await readJsonKV(`ref:code:${code2}`, null);
            const referrerId = mapRef && mapRef.userId ? String(mapRef.userId) : "";
            if (referrerId && referrerId !== String(user.id)) {
              user.ref.referrerUserId = referrerId;
              user.ref.referrerCode = code2;
              user.ref.refSetAt = now();
              user.updatedAt = now();
              await writeJsonKV(userKeyById(user.id), user);
              try {
                const r = await readJsonKV(userKeyById(referrerId), null);
                if (r) {
                  await ensureUserRefV2(r);
                  r.ref.referredCount = Number(r.ref.referredCount || 0) + 1;
                  await writeJsonKV(userKeyById(r.id), r);
                }
              } catch (_) {
              }
              try {
                ctx.waitUntil(
                  tgNotifyAdmin({
                    title: "\u{1F381} REF: \u043F\u0440\u0438\u043C\u0435\u043D\u0451\u043D \u043A\u043E\u0434 \u043F\u0440\u0438 \u0432\u0445\u043E\u0434\u0435",
                    user: { id: user.id, username: user.username },
                    step: "REF_APPLY_ON_LOGIN",
                    req: request,
                    lines: ["Code: " + code2, "ReferrerId: " + referrerId]
                  })
                );
              } catch (_) {
              }
            }
          }
        } catch (_) {
        }
        const tok = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        await writeJsonKV(
          userSessionKey(tok),
          { userId: user.id, createdAt: now(), expiresAt: now() + USER_TOKEN_TTL_SEC * 1e3 },
          { expirationTtl: USER_TOKEN_TTL_SEC }
        );
        await env.DB.delete(regCodeKey(u));
        try {
          ctx.waitUntil(
            tgNotifyAdmin({
              title: "\u2705 \u0412\u0445\u043E\u0434 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D",
              user: { id: user.id, username: user.username },
              step: "AUTH_VERIFY_OK",
              req: request,
              lines: ["Username: @" + user.username, "tgId: " + user.id]
            })
          );
        } catch {
        }
        return json({ ok: true, userToken: tok, user: { id: user.id, username: user.username } });
      } catch (e) {
        return bad(String(e.message || e), 500);
      }
    }
    if (url.pathname === "/api/public/auth/me" && request.method === "GET") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      await ensureUserRef(au.user);
      await writeJsonKV(userKeyById(au.user.id), au.user);
      return json({ ok: true, user: au.user });
    }
    if (url.pathname === "/api/public/wallet/deposit_address" && request.method === "GET") {
  try {
    const au = await readUserToken(request);
    if (!au) return bad("Unauthorized", 401);
    if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);

    const dep = await createRapiraDepositAddressViaRapiraOnly(au.user.id, env, d1);

    return json({
      ok: true,
      provider: "RAPIRA",
      network: "TRON",
      asset: "USDT",
      address: dep.address || "",
      creating: false
    });
  } catch (e) {
    return bad(String(e.message || e), 500);
  }
}

if (url.pathname === "/api/public/deposit_request" && request.method === "POST") {
  try {
    const au = await readUserToken(request);
    if (!au) return bad("Unauthorized", 401);
    if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);

    const dep = await createRapiraDepositAddressViaRapiraOnly(au.user.id, env, d1);

    return json({
      ok: true,
      provider: "RAPIRA",
      network: "TRON",
      asset: "USDT",
      address: dep.address || "",
      creating: false,
      existing: false,
      amountUsdt: null,
      amountDec6: null,
      expiresIn: 0
    });
  } catch (e) {
    return bad(String(e.message || e), 500);
  }
}

if (url.pathname === "/api/public/deposit_status" && request.method === "GET") {
  try {
    const au = await readUserToken(request);
    if (!au) return bad("Unauthorized", 401);
    if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);

    const user = await readJsonKV(userKeyById(String(au.user.id)), null);
    const address = String(user?.rapiraDepositAddress || "").trim();

    if (!address) {
      return json({
        ok: true,
        provider: "RAPIRA",
        network: "TRON",
        asset: "USDT",
        address: "",
        status: "NONE"
      });
    }

    const sync = await syncRapiraDepositsForUser(env, d1, au.user.id, address);

    return json({
      ok: true,
      provider: "RAPIRA",
      network: "TRON",
      asset: "USDT",
      address,
      ...sync
    });
  } catch (e) {
    return bad(String(e.message || e), 500);
  }
}

  
    if (url.pathname === "/api/public/wallet/balance" && request.method === "GET") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const dec6 = await getBalanceDec6(au.user.id);
      return json({
        ok: true,
        usdt_trc20: formatDec6(dec6),
        dec6,
        cashback_usdt: formatDec6(0),
        cashback_dec6: 0,
        spendable_qr_usdt: formatDec6(dec6),
        spendable_qr_dec6: dec6
      });
    }
    if (url.pathname === "/api/public/withdraw_request" && request.method === "POST") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const body = await request.json().catch(() => ({}));
      const toAddress = String(body.toAddress || body.to || body.address || "").trim();
      const rawNetwork = String(body.network || "TRON").trim().toUpperCase();
      const amountUsdt = Number(body.amountUsdt ?? body.amount ?? 0);
      if (!toAddress) return bad("Missing toAddress");
      if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) return bad("Invalid amountUsdt");
      const networkAliases = {
  TRON: "TRON",
  TRC20: "TRON"
};
      const network = networkAliases[rawNetwork] || "";
      if (!network) return bad("Unsupported network", 400);
      const amountE6 = Math.trunc(amountUsdt * 1e6);
      if (amountE6 <= 0) return bad("Too small amount");
      const bal = await getBalanceDec6(au.user.id);
      if (amountE6 > bal) return bad("Not enough balance", 409);
      // Freeze balance immediately so multiple pending withdrawals can't exceed real balance
      await d1.prepare(
        "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
      ).bind(String(au.user.id), now()).run();
      const frozenOk = await d1.prepare(
        "UPDATE user_balances SET usdt_trc20_balance = usdt_trc20_balance - ?, updated_at=? WHERE user_id=? AND usdt_trc20_balance >= ?"
      ).bind(amountE6, now(), String(au.user.id), amountE6).run();
      if (!frozenOk?.meta?.changes) return bad("Not enough balance", 409);
      const id = "wd_" + randId(14);
      let videoRequired = false;
      let videoDeal = null;
      try {
        const BUY_OK = /* @__PURE__ */ new Set(["SUCCESS", "DONE", "COMPLETED", "BYBIT_DONE"]);
        const allBuy = await readJsonKV("buyOffers", []);
        const userId = String(au.user.id);
        const userDeals = (Array.isArray(allBuy) ? allBuy : []).filter((o) => {
          if (!o || !o.user) return false;
          if (String(o.user.id || o.user_id || "") !== userId) return false;
          return BUY_OK.has(String(o.status || "").toUpperCase());
        });
        if (userDeals.length > 0) {
          userDeals.sort((a, b) => Number(b.amountRub || 0) - Number(a.amountRub || 0));
          const biggest = userDeals[0];
          videoRequired = true;
          videoDeal = {
            id: biggest.id || "",
            amountRub: Number(biggest.amountRub || 0),
            rate: Number(biggest.rate || 0),
            payBank: String(biggest.payBank || ""),
            createdAt: Number(biggest.createdAt || 0)
          };
        }
      } catch {
      }
      const rec = {
        id,
        user: ensureUserShape(au.user),
        user_id: String(au.user.id),
        username: String(au.user.username || ""),
        network,
        asset: "USDT",
        to_address: toAddress,
        amountUsdtE6: amountE6,
        status: "PENDING",
        createdAt: now(),
        updatedAt: now(),
        note: "",
        videoRequired,
        videoUploaded: false,
        videoDeal,
        balanceFrozen: true,
        balanceFrozenAt: now()
      };
      const WKEY = "userWithdrawals";
      const arr = await readJsonKV(WKEY, []);
      const list = Array.isArray(arr) ? arr : [];
      list.unshift(rec);
      await writeJsonKV(WKEY, list.slice(0, 5e3));
      try {
        const vLines = [
          "Amount: " + fmtUsdtE6(amountE6),
          "Network: " + network,
          "To: " + toAddress,
          "Balance action: \u0431\u0443\u0434\u0435\u0442 \u0441\u043F\u0438\u0441\u0430\u043D\u043E \u043F\u0440\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0438"
        ];
        if (videoRequired && videoDeal) {
          vLines.push("\u{1F3A5} \u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0432\u0438\u0434\u0435\u043E \u043F\u043E \u0441\u0434\u0435\u043B\u043A\u0435 BUY " + videoDeal.id + " (" + videoDeal.amountRub + " RUB)");
        }
        ctx.waitUntil(
          tgNotifyWallet({
            kind: "WITHDRAW_REQUEST",
            user: rec.user || null,
            req: request,
            refId: id,
            step: "WITHDRAW_REQUEST",
            lines: vLines
          })
        );
      } catch {
      }
      return json({ ok: true, id, status: "PENDING", network, videoRequired, videoDeal });
    }
    if (url.pathname === "/api/public/withdraw_video" && request.method === "POST") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", 401);
      const ct = request.headers.get("content-type") || "";
      if (!ct.includes("multipart/form-data")) return bad("Expected multipart/form-data", 400);
      const fd = await request.formData().catch(() => null);
      if (!fd) return bad("Invalid form data", 400);
      const wdId = String(fd.get("id") || "").trim();
      if (!wdId) return bad("Missing withdrawal id", 400);
      const videoFile = fd.get("video");
      if (!videoFile || typeof videoFile === "string") return bad("Missing video file", 400);
      if (videoFile.size > 200 * 1024 * 1024) return bad("\u0412\u0438\u0434\u0435\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 (\u043C\u0430\u043A\u0441. 200 \u041C\u0411)", 400);
      const WKEY = "userWithdrawals";
      const arr = await readJsonKV(WKEY, []);
      const list = Array.isArray(arr) ? arr : [];
      const idx = list.findIndex((w) => w && w.id === wdId && String(w.user_id || "") === String(au.user.id));
      if (idx < 0) return bad("Withdrawal not found", 404);
      const wd = list[idx];
      let tgResult = null;
      try {
        const caption = [
          "\u{1F3A5} \u0412\u0418\u0414\u0415\u041E \u0412\u0415\u0420\u0418\u0424\u0418\u041A\u0410\u0426\u0418\u042F \u2014 \u0412\u042B\u0412\u041E\u0414",
          "",
          "\u0412\u044B\u0432\u043E\u0434: " + wdId,
          "\u0421\u0443\u043C\u043C\u0430: " + fmtUsdtE6(wd.amountUsdtE6 || 0),
          "\u0421\u0435\u0442\u044C: " + (wd.network || ""),
          "\u0410\u0434\u0440\u0435\u0441: " + (wd.to_address || ""),
          "",
          "\u041A\u043B\u0438\u0435\u043D\u0442: " + (wd.username ? "@" + wd.username : "") + " [" + (wd.user_id || "") + "]"
        ];
        if (wd.videoDeal) {
          caption.push("\u0421\u0434\u0435\u043B\u043A\u0430 BUY: " + (wd.videoDeal.id || "") + " (" + (wd.videoDeal.amountRub || 0) + " RUB)");
        }
        const tgFd = new FormData();
        tgFd.set("chat_id", env.TG_CHAT_ID);
        tgFd.set("video", videoFile, videoFile.name || "video.mp4");
        tgFd.set("caption", caption.join("\n"));
        tgFd.set("supports_streaming", "true");
        const tgRes = await fetch(
          `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendVideo`,
          { method: "POST", body: tgFd }
        );
        if (!tgRes.ok) {
          const tgFd2 = new FormData();
          tgFd2.set("chat_id", env.TG_CHAT_ID);
          tgFd2.set("document", videoFile, videoFile.name || "video.mp4");
          tgFd2.set("caption", caption.join("\n"));
          const tgRes2 = await fetch(
            `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendDocument`,
            { method: "POST", body: tgFd2 }
          );
          const j2 = await tgRes2.json().catch(() => null);
          tgResult = j2;
        } else {
          const j1 = await tgRes.json().catch(() => null);
          tgResult = j1;
        }
      } catch (e) {
      }
      list[idx].videoUploaded = true;
      list[idx].videoUploadedAt = now();
      list[idx].videoFileName = videoFile.name || "video.mp4";
      list[idx].videoSize = videoFile.size || 0;
      list[idx].videoTgSent = !!(tgResult && tgResult.ok);
      list[idx].updatedAt = now();
      await writeJsonKV(WKEY, list.slice(0, 5e3));
      return json({ ok: true, videoUploaded: true, tgSent: !!(tgResult && tgResult.ok) });
    }
    if (url.pathname === "/api/admin/users" && request.method === "GET") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const idx = await readJsonKV(userIndexKey, []);
      const ids = Array.isArray(idx) ? idx.slice(0, 1e3) : [];
      const users = [];
      for (const id of ids) {
        const u = await readJsonKV(userKeyById(id), null);
        if (!u) continue;
        users.push({
          id: String(u.id || ""),
          username: String(u.username || ""),
          banned: !!u.banned,
          note: String(u.note || ""),
          createdAt: Number(u.createdAt || 0) || 0,
          updatedAt: Number(u.updatedAt || 0) || 0,
          lastSeenAt: Number(u.lastSeenAt || 0) || 0,
          walletBalanceUsdtE6: 0,
          buyBannedUntil: Number(u.buyBannedUntil || 0) || 0,
          buyBanReason: String(u.buyBanReason || ""),
          trustScore: Number(u.trustScore || 0),
          trustTier: computeTrustTier(u),
          lastDealAt: Number(u.lastDealAt || 0) || 0,
          lastVerificationAt: Number(u.lastVerificationAt || 0) || 0,
          buyStats: u.buyStats ? {
            totalCompleted: Number(u.buyStats.totalCompleted || 0),
            totalCancelled: Number(u.buyStats.totalCancelled || 0),
            totalCancelledExcused: Number(u.buyStats.totalCancelledExcused || 0),
            consecutiveCancels: Number(u.buyStats.consecutiveCancels || 0)
          } : { totalCompleted: 0, totalCancelled: 0, totalCancelledExcused: 0, consecutiveCancels: 0 },
          ref: u.ref || void 0
        });
      }
      const balanceMap = /* @__PURE__ */ new Map();
      for (let i = 0; i < users.length; i += 100) {
        const chunk = users.slice(i, i + 100);
        if (!chunk.length) continue;
        const placeholders = chunk.map(() => "?").join(",");
        const stmt = d1.prepare(
          `SELECT user_id, usdt_trc20_balance FROM user_balances WHERE user_id IN (${placeholders})`
        );
        const res = await stmt.bind(...chunk.map((x) => String(x.id))).all();
        for (const r of res?.results || []) {
          balanceMap.set(String(r.user_id), Number(r.usdt_trc20_balance || 0));
        }
      }
      for (const u of users) {
        u.walletBalanceUsdtE6 = balanceMap.get(String(u.id)) || 0;
      }
      users.sort((a, b) => (b.updatedAt || b.lastSeenAt || 0) - (a.updatedAt || a.lastSeenAt || 0));
      return json({ ok: true, users });
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        const uname = normUsername(decodeURIComponent(m[1] || ""));
        if (!uname) return bad("Bad username", 400);
        if (request.method === "PATCH") {
          const body = await request.json().catch(() => ({}));
          const banned = !!body.banned;
          const note = body.note != null ? String(body.note) : void 0;
          const map = await readJsonKV(userKeyByUsername(uname), null);
          if (!map || !map.userId) return bad("User not found", 404);
          const user = await readJsonKV(userKeyById(map.userId), null);
          if (!user) return bad("User not found", 404);
          user.banned = banned;
          if (note !== void 0) user.note = note;
          if (body.buyBannedUntil !== void 0) {
            user.buyBannedUntil = Number(body.buyBannedUntil) || 0;
          }
          if (body.buyBanReason !== void 0) {
            user.buyBanReason = String(body.buyBanReason || "");
          }
          user.updatedAt = now();
          await writeJsonKV(userKeyById(user.id), user);
          return json({ ok: true, user });
        }
        return bad("Method not allowed", 405);
      }
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/balance\/adjust$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        if (request.method !== "POST") return bad("Method not allowed", 405);
        const uname = normUsername(decodeURIComponent(m[1] || ""));
        if (!uname) return bad("Bad username", 400);
        const body = await request.json().catch(() => ({}));
        const delta = Number(body.deltaUsdtE6 ?? body.delta ?? body.amountE6 ?? 0);
        if (!Number.isFinite(delta) || !Number.isInteger(delta) || delta === 0) {
          return bad("Invalid deltaUsdtE6 (must be non-zero integer)", 400);
        }
        const map = await readJsonKV(userKeyByUsername(uname), null);
        const userId = map && map.userId ? String(map.userId) : "";
        if (!userId) return bad("User not found", 404);
        await d1.prepare(
          "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
        ).bind(userId, now()).run();
        const curRow = await d1.prepare("SELECT usdt_trc20_balance FROM user_balances WHERE user_id=?").bind(userId).first();
        const cur = Number(curRow?.usdt_trc20_balance || 0) || 0;
        const next = cur + delta;
        if (next < 0) {
          return bad("Not enough balance", 409);
        }
        await d1.prepare("UPDATE user_balances SET usdt_trc20_balance=?, updated_at=? WHERE user_id=?").bind(next, now(), userId).run();
        try {
          const actor = await resolveActorUser(request, { id: userId, username: uname });
          const adminActor = actor ? ensureUserShape(actor) : null;
          const items = await readJsonKV("dealLog", []);
          const arr = Array.isArray(items) ? items : [];
          arr.unshift({
            ts: (/* @__PURE__ */ new Date()).toISOString(),
            kind: "ADMIN_BALANCE",
            dealType: "WALLET",
            id: userId,
            offerId: null,
            dealId: null,
            status: delta > 0 ? "CREDIT" : "DEBIT",
            user: adminActor,
            data: {
              username: uname,
              userId,
              deltaUsdtE6: delta,
              prevUsdtE6: cur,
              nextUsdtE6: next
            }
          });
          await writeJsonKV("dealLog", arr.slice(0, 2e3));
        } catch {
        }
        try {
          const targetUser = await resolveUserByIdShape(userId);
          ctx.waitUntil(
            tgNotifyWallet({
              kind: delta > 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
              user: targetUser,
              req: request,
              refId: `ADMIN_BAL_${userId}_${Date.now()}`,
              step: "ADMIN_BALANCE_ADJUST",
              lines: [
                "Delta: " + fmtUsdtE6(delta),
                "Previous balance: " + fmtUsdtE6(cur),
                "New balance: " + fmtUsdtE6(next),
                "Admin target: @" + uname
              ]
            })
          );
          ctx.waitUntil(
            tgNotifyUserText(
              targetUser,
              delta > 0 ? `\u{1F4B0} \u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u043D\u0430\u0447\u0438\u0441\u043B\u0438\u043B \u0432\u0430\u043C ${fmtUsdtE6(delta)}.
\u041D\u043E\u0432\u044B\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: ${fmtUsdtE6(next)}.` : `\u{1F4B8} \u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440 \u0441\u043F\u0438\u0441\u0430\u043B \u0443 \u0432\u0430\u0441 ${fmtUsdtE6(Math.abs(delta))}.
\u041D\u043E\u0432\u044B\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: ${fmtUsdtE6(next)}.`
            )
          );
        } catch {
        }
        return json({
          ok: true,
          userId,
          username: uname,
          prevUsdtE6: cur,
          nextUsdtE6: next,
          deltaUsdtE6: delta
        });
      }
    }
    if (url.pathname === "/api/public/ref/set" && request.method === "POST") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const body = await request.json().catch(() => ({}));
      const code = String(body.code || body.ref || "").trim().toUpperCase();
      if (!code) return bad("Invalid referral code");
      const me = au.user;
      await ensureUserRef(me);
      if (me.ref && me.ref.referrerUserId) return bad("Referrer already set", 409);
      const map = await readJsonKV(`ref:code:${code}`, null);
      if (!map || !map.userId) return bad("Referral code not found", 404);
      const referrerId = String(map.userId);
      if (referrerId === String(me.id)) return bad("Cannot use own code", 409);
      me.ref.referrerUserId = referrerId;
      me.ref.referrerCode = code;
      me.ref.refSetAt = Date.now();
      me.updatedAt = Date.now();
      await writeJsonKV(userKeyById(me.id), me);
      return json({ ok: true });
    }
    function normalizeAmountReqStatus(s) {
      const x = String(s || "").toUpperCase().trim();
      if (x === "APPROVED" || x === "REJECTED" || x === "PENDING" || x === "CANCELED" || x === "CANCELLED") return x === "CANCELLED" ? "CANCELED" : x;
      return "PENDING";
    }
    __name(normalizeAmountReqStatus, "normalizeAmountReqStatus");
    __name2(normalizeAmountReqStatus, "normalizeAmountReqStatus");
    if (url.pathname === "/api/public/buy_amount_request" && request.method === "POST") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const cfg = await readJsonKV("config", {});
      if (cfg.buyAmountEnabled === false) {
        return bad("\u0417\u0430\u043F\u0440\u043E\u0441 \u0441\u0443\u043C\u043C\u044B \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D", 403);
      }
      const body = await request.json().catch(() => ({}));
      const minRub = Math.floor(Number(body.minRub ?? body.min ?? 0));
      const maxRub = Math.floor(Number(body.maxRub ?? body.max ?? 0));
      const count = Math.max(1, Math.min(10, Math.floor(Number(body.count ?? body.qty ?? 1))));
      if (!Number.isFinite(minRub) || minRub <= 0) return bad("Invalid minRub");
      if (!Number.isFinite(maxRub) || maxRub <= 0) return bad("Invalid maxRub");
      if (minRub > maxRub) return bad("minRub cannot be greater than maxRub", 400);
      const actor = au.user;
      await ensureUserRef(actor);
      await writeJsonKV(userKeyById(actor.id), actor);
      const id = "bar_" + randId(14);
      let approxRate = Number(body.approxRate ?? body.rate ?? 0);
      if (!Number.isFinite(approxRate) || approxRate <= 0) {
        approxRate = await calcCurrentBuyRate();
      }
      approxRate = Number(approxRate.toFixed(2));
      const rec = {
        id,
        user: ensureUserShape(actor) || null,
        minRub,
        maxRub,
        count,
        approxRate,
        status: "PENDING",
        matchedOffersCount: 0,
        matchedOfferIds: [],
        createdAt: now(),
        updatedAt: now()
      };
      const items = await readJsonKV(BUY_AMOUNT_REQ_KEY, []);
      const arr = Array.isArray(items) ? items : [];
      arr.unshift(rec);
      await writeJsonKV(BUY_AMOUNT_REQ_KEY, arr.slice(0, 5e3));
      try {
        ctx.waitUntil(tgBroadcastBuyAmountRequest(rec, request));
      } catch {
      }
      try {
        if (env.RESERVATIONS_DO) {
          const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-amount-watch"));
          ctx.waitUntil(
            stub.fetch("https://do/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, user: rec.user || null, minRub, maxRub, createdAt: rec.createdAt })
            })
          );
        }
      } catch {
      }
      return json({ ok: true, id, status: rec.status, count });
    }
    if (url.pathname === "/api/public/mw_buy_request" && request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const minRub = Math.floor(Number(body.minRub ?? body.amountRub ?? body.amount ?? 0));
        const maxRub = Math.floor(Number(body.maxRub ?? body.amountRub ?? body.amount ?? minRub));
        const moonWalletUser = body.moonWalletUser || null;
        const toAddress = String(body.toAddress || "").trim();
        if (!Number.isFinite(minRub) || minRub <= 0) return bad("Invalid amount");

        const cfg = await readJsonKV("config", {});
        if (cfg.buyAmountEnabled === false) return bad("Запросы временно отключены", 403);

        let approxRate = Number(body.approxRate ?? 0);
        if (!Number.isFinite(approxRate) || approxRate <= 0) approxRate = await calcCurrentBuyRate();
        approxRate = Number(approxRate.toFixed(2));

        const id = "mwr_" + randId(14);
        const mwTgId = String(moonWalletUser?.tgId || "").trim();
        const mwReqId = String(body.mwReqId || "").trim(); // MW local request ID for webhook
        const mwWebhookBase = env.MW_WEBHOOK_BASE || "https://client-qr-pay.kireeshka73.workers.dev";
        const userShape = moonWalletUser ? {
          id: mwTgId || "mw_" + id,
          username: String(moonWalletUser.name || "MoonWallet"),
          firstName: String(moonWalletUser.name || "Moon Wallet User"),
          source: "moon_wallet",
          toAddress: toAddress || "",
          mwTgId, mwReqId, mwWebhookBase
        } : { id: "mw_anon_" + id, username: "moon_wallet", firstName: "Moon Wallet", source: "moon_wallet" };

        const rec = {
          id, user: userShape, minRub, maxRub: Math.max(minRub, maxRub),
          count: 1, approxRate, status: "PENDING",
          matchedOffersCount: 0, matchedOfferIds: [],
          source: "moon_wallet", toAddress,
          mwTgId, mwReqId, mwWebhookBase,
          createdAt: now(), updatedAt: now()
        };

        // MW requests are managed by Moon Wallet — do not add to CF buy requests list

        ctx.waitUntil((async () => {
          try {
            await tgNotifyAdmin({
              title: "🌙 Moon Wallet: запрос на покупку",
              user: userShape, deal: "MW_BUY " + id,
              step: "MW_BUY_REQUEST", req: request,
              lines: [
                "Сумма: " + minRub + (maxRub !== minRub ? "–" + maxRub : "") + " RUB",
                "Курс: " + approxRate,
                "Источник: Moon Wallet",
                ...(toAddress ? ["📥 USDT addr: " + toAddress] : []),
                ...(moonWalletUser?.name ? ["👤 " + moonWalletUser.name] : [])
              ]
            });
          } catch {}
        })());

        try {
          if (env.RESERVATIONS_DO) {
            const stub = env.RESERVATIONS_DO.get(env.RESERVATIONS_DO.idFromName("buy-amount-watch"));
            ctx.waitUntil(stub.fetch("https://do/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id, user: rec.user, minRub, maxRub: rec.maxRub, createdAt: rec.createdAt,
                mwTgId, mwReqId, mwWebhookBase
              })
            }));
          }
        } catch {}

        return json({ ok: true, id, status: "PENDING", approxRate });
      } catch (e) {
        return bad(String(e.message || e), 500);
      }
    }
    
    if (url.pathname === "/api/admin/buyamount_traffic" && request.method === "POST") {
  if (!requireAdmin()) return bad("Unauthorized", 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
  }

  const action = String(body.action || "").toLowerCase();
  if (action !== "on" && action !== "off") {
    return bad("action must be 'on' or 'off'", 400);
  }

  const enabledChats = await getBuyAmountNotifyChats();
  let allChats = await getAllBuyAmountChats();

  if (!allChats.length && enabledChats.length) {
    await saveAllBuyAmountChats(enabledChats);
    allChats = enabledChats;
  }

  const targets = action === "on" ? allChats : enabledChats;

  if (!targets.length) {
    return json({
      ok: true,
      action,
      changed: 0,
      enabledNow: enabledChats.length,
      message: action === "on" ? "No known chats to enable" : "No enabled chats to disable"
    });
  }

  if (action === "on") {
    await saveBuyAmountNotifyChats(targets);
  } else {
    await saveBuyAmountNotifyChats([]);
  }

  const results = [];
  for (const chat of targets) {
    try {
      await tgSendMessage(
        String(chat.chatId),
        action === "on"
          ? "✅ Уведомления о запросах суммы включены для этого чата."
          : "⛔️ Уведомления о запросах суммы отключены для этого чата."
      );
      results.push({
        chatId: chat.chatId,
        title: chat.title || "",
        ok: true
      });
    } catch (e) {
      results.push({
        chatId: chat.chatId,
        title: chat.title || "",
        ok: false,
        error: String(e.message || e)
      });
    }
  }

  return json({
    ok: true,
    action,
    changed: targets.length,
    enabledNow: action === "on" ? targets.length : 0,
    results
  });
}
    if (url.pathname === "/api/admin/broadcast" && request.method === "POST") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      let broadcastText = "";
      let parseMode = "HTML";
      let imageFile = null;
      let testOnly = false;
      const ctype = request.headers.get("content-type") || "";
      if (ctype.includes("multipart/form-data")) {
        let fd;
        try {
          fd = await request.formData();
        } catch {
          return bad("Invalid form data", 400);
        }
        broadcastText = String(fd.get("text") || "").trim();
        parseMode = String(fd.get("parseMode") || "HTML");
        imageFile = fd.get("image") || null;
        testOnly = String(fd.get("testOnly") || "false") === "true";
      } else {
        let bd = {};
        try {
          bd = await request.json();
        } catch {
        }
        broadcastText = String(bd.text || "").trim();
        parseMode = String(bd.parseMode || "HTML");
        testOnly = Boolean(bd.testOnly);
      }
      if (!broadcastText) return bad("Missing text", 400);

      // Тестовая отправка только для @inkosssator
      if (testOnly) {
        const testChatId = "8450993629"; // Ваш Telegram ID
        try {
          if (imageFile && typeof imageFile === "object") {
            await tgSendFileToChat(testChatId, "photo", imageFile, imageFile.name || "image.jpg", {
              caption: broadcastText.slice(0, 1024),
              parse_mode: parseMode
            });
          } else {
            await tgSendMessageEx(testChatId, broadcastText, { parse_mode: parseMode });
          }
          return json({ ok: true, testOnly: true, sent: 1, failed: 0, skipped: 0, note: "Test sent to @inkosssator" });
        } catch (e) {
          return json({ ok: false, error: e.message, testOnly: true });
        }
      }

      // Массовая рассылка всем пользователям
      const idx = await readJsonKV(userIndexKey, []);
      const ids = Array.isArray(idx) ? idx.slice(0, 5e4) : [];
      let bSent = 0, bFailed = 0, bSkipped = 0;
      for (const uid of ids) {
        try {
          const user = await readJsonKV(userKeyById(uid), null);
          if (!user || user.banned) {
            bSkipped++;
            continue;
          }
          const chatId = String(user.chatId || user.id || "");
          if (!chatId) {
            bSkipped++;
            continue;
          }
          if (imageFile && typeof imageFile === "object") {
            await tgSendFileToChat(chatId, "photo", imageFile, imageFile.name || "image.jpg", {
              caption: broadcastText.slice(0, 1024),
              parse_mode: parseMode
            });
          } else {
            await tgSendMessageEx(chatId, broadcastText, { parse_mode: parseMode });
          }
          bSent++;
          if (bSent % 25 === 0) await new Promise((r) => setTimeout(r, 1e3));
        } catch {
          bFailed++;
        }
      }
      return json({ ok: true, testOnly: false, total: ids.length, sent: bSent, failed: bFailed, skipped: bSkipped });
    }
    if (url.pathname === "/api/admin/buy_amount_requests" && request.method === "GET") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const items = await readJsonKV(BUY_AMOUNT_REQ_KEY, []);
      const arr = (Array.isArray(items) ? items : []).map((x) => {
        let st = normalizeAmountReqStatus(x.status);
        if (st === "PENDING" && now() - Number(x.createdAt || 0) > BUY_AMOUNT_REQ_TTL) st = "EXPIRED";
        return { ...x, status: st };
      });
      arr.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      return json({ ok: true, items: arr });
    }
    {
      const m = url.pathname.match(/^\/api\/admin\/buy_amount_requests\/([^/]+)$/);
      if (m) {
        if (!requireAdmin()) return bad("Unauthorized", 401);
        if (request.method !== "PATCH") return bad("Method not allowed", 405);
        const id = decodeURIComponent(m[1] || "");
        const body = await request.json().catch(() => ({}));
        const nextStatus = normalizeAmountReqStatus(body.status);
        if (!["APPROVED", "REJECTED"].includes(nextStatus)) {
          return bad("Invalid status", 400);
        }
        const items = await readJsonKV(BUY_AMOUNT_REQ_KEY, []);
        const arr = Array.isArray(items) ? items : [];
        const idx = arr.findIndex((x) => String(x.id || "") === String(id));
        if (idx < 0) return bad("Not found", 404);
        arr[idx].status = nextStatus;
        arr[idx].updatedAt = now();
        await writeJsonKV(BUY_AMOUNT_REQ_KEY, arr);
        await refreshBuyAmountBroadcastMessages(id);
        try {
          ctx.waitUntil(
            tgNotifyAdmin({
              title: nextStatus === "APPROVED" ? "\u2705 BUY: \u0437\u0430\u043F\u0440\u043E\u0441 \u0441\u0443\u043C\u043C\u044B \u043E\u0434\u043E\u0431\u0440\u0435\u043D" : "\u274C BUY: \u0437\u0430\u043F\u0440\u043E\u0441 \u0441\u0443\u043C\u043C\u044B \u043E\u0442\u043A\u043B\u043E\u043D\u0451\u043D",
              user: arr[idx].user || null,
              deal: "BUY_AMOUNT " + id,
              step: "BUY_AMOUNT_DECISION",
              req: request,
              lines: [
                "\u0421\u0442\u0430\u0442\u0443\u0441: " + nextStatus,
                "\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D: " + String(arr[idx].minRub) + " \u2014 " + String(arr[idx].maxRub) + " RUB"
              ]
            })
          );
        } catch {
        }
        return json({ ok: true });
      }
    }
    if (url.pathname === "/api/public/buy_amount_request_status" && request.method === "GET") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const id = String(url.searchParams.get("id") || "").trim();
      if (!id) return bad("Missing id");
      const items = await readJsonKV(BUY_AMOUNT_REQ_KEY, []);
      const arr = Array.isArray(items) ? items : [];
      const rec = arr.find((x) => String(x.id || "") === id);
      if (!rec) return bad("Not found", 404);
      const ownerId = rec.user && rec.user.id ? String(rec.user.id) : "";
      if (!ownerId || ownerId !== String(au.user.id)) return bad("Forbidden", 403);
      const st = normalizeAmountReqStatus(rec.status);
      return json({
        ok: true,
        id: rec.id,
        status: st,
        minRub: rec.minRub,
        maxRub: rec.maxRub,
        count: rec.count ?? 1,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt
      });
    }
    if (url.pathname === "/api/public/buy_amount_requests" && request.method === "GET") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const meId = String(au.user?.id || "");
      const items = await readJsonKV(BUY_AMOUNT_REQ_KEY, []);
      const arr = Array.isArray(items) ? items : [];
      const buyOffers = await readJsonKV("buyOffers", []);
      const liveOfferIds = new Set((Array.isArray(buyOffers) ? buyOffers : []).filter((o) => o && String(o.status || "").toUpperCase() === "NEW").map((o) => String(o.id || "")));
      const mine = arr.filter((x) => {
        const uid = x?.user?.id != null ? String(x.user.id) : "";
        return uid === meId;
      }).map((x) => {
        let st = normalizeAmountReqStatus(x.status);
        if (st === "PENDING" && now() - Number(x.createdAt || 0) > BUY_AMOUNT_REQ_TTL) st = "EXPIRED";
        const allIds = Array.isArray(x.matchedOfferIds) ? x.matchedOfferIds : [];
        const activeOfferIds = allIds.filter((oid) => liveOfferIds.has(String(oid)));
        return {
          id: x.id,
          minRub: x.minRub,
          maxRub: x.maxRub,
          count: x.count ?? 1,
          matchedOffersCount: x.matchedOffersCount || 0,
          matchedOfferIds: activeOfferIds,
          status: st,
          createdAt: x.createdAt,
          updatedAt: x.updatedAt,
          approxRate: x.approxRate || 0
        };
      });
      return json({ ok: true, items: mine.slice(0, 100) });
    }
    if (url.pathname === "/api/public/buy_amount_request/cancel" && request.method === "POST") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const body = await request.json().catch(() => ({}));
      const id = String(body.id || "").trim();
      if (!id) return bad("Missing id");
      const items = await readJsonKV(BUY_AMOUNT_REQ_KEY, []);
      const arr = Array.isArray(items) ? items : [];
      const idx = arr.findIndex((x) => String(x.id || "") === id);
      if (idx < 0) return bad("Not found", 404);
      const rec = arr[idx];
      const ownerId = rec.user?.id != null ? String(rec.user.id) : "";
      if (!ownerId || ownerId !== String(au.user.id)) return bad("Forbidden", 403);
      rec.status = "CANCELED";
      rec.updatedAt = now();
      arr[idx] = rec;
      await writeJsonKV(BUY_AMOUNT_REQ_KEY, arr);
      try {
        ctx.waitUntil(refreshBuyAmountBroadcastMessages(rec, request));
      } catch {
      }
      return json({ ok: true, id, status: "CANCELED" });
    }
    async function ensureUserRefV2(user) {
      if (!user) return user;
      await ensureUserRef(user);
      if (!user.ref || typeof user.ref !== "object") user.ref = {};
      if (user.ref.balanceUsdt == null) user.ref.balanceUsdt = 0;
      if (user.ref.totalEarnedUsdt == null) user.ref.totalEarnedUsdt = 0;
      if (user.ref.pendingUsdt == null) user.ref.pendingUsdt = 0;
      if (user.ref.referredCount == null) user.ref.referredCount = 0;
      if (!Array.isArray(user.ref.earnLog)) user.ref.earnLog = [];
      return user;
    }
    __name(ensureUserRefV2, "ensureUserRefV2");
    __name2(ensureUserRefV2, "ensureUserRefV2");
    async function ensureUserCashback(user) {
      if (!user) return user;
      user.cashback = {
        balanceDec6: 0,
        totalEarnedDec6: 0,
        earnLog: [],
        spendLog: []
      };
      return user;
    }
    __name(ensureUserCashback, "ensureUserCashback");
    __name2(ensureUserCashback, "ensureUserCashback");
    async function getUserCashbackState(userId) {
      const u = await readJsonKV(userKeyById(String(userId || "")), null);
      if (!u) return null;
      await ensureUserCashback(u);
      return u;
    }
    __name(getUserCashbackState, "getUserCashbackState");
    __name2(getUserCashbackState, "getUserCashbackState");
    async function spendQrCashbackAndWallet({ userId, amountDec6, offerId }) {
      try {
        const uid = String(userId || "").trim();
        const need = Math.trunc(Number(amountDec6 || 0));
        if (!uid) return { ok: false, error: "USER_NOT_FOUND" };
        if (!(need > 0)) return { ok: false, error: "BAD_AMOUNT" };
        const ts = now();
        await d1.prepare(
          "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING"
        ).bind(uid, ts).run();
        const debit = await d1.prepare(
          "UPDATE user_balances SET usdt_trc20_balance = usdt_trc20_balance - ?, updated_at=? WHERE user_id=? AND usdt_trc20_balance >= ?"
        ).bind(need, ts, uid, need).run();
        if (!debit?.meta?.changes) {
          return { ok: false, error: "INSUFFICIENT_BALANCE", cashbackUsedDec6: 0, walletUsedDec6: 0 };
        }
        return { ok: true, cashbackUsedDec6: 0, walletUsedDec6: need, user: null };
      } catch (e) {
        return { ok: false, error: e?.message || "QR_SPEND_FAILED" };
      }
    }
    __name(spendQrCashbackAndWallet, "spendQrCashbackAndWallet");
    __name2(spendQrCashbackAndWallet, "spendQrCashbackAndWallet");
    async function awardBuyCashback({ userId, amountDec6, offerId }) {
      return { ok: true, cashbackDec6: 0, disabled: true };
    }
    __name(awardBuyCashback, "awardBuyCashback");
    __name2(awardBuyCashback, "awardBuyCashback");
    async function addRefBonus({ referrerId, referredId, dealType, dealId, baseUsdt, percent }) {
      baseUsdt = Number(baseUsdt || 0);
      percent = Number(percent || 0);
      if (!referrerId || !referredId) return null;
      if (!Number.isFinite(baseUsdt) || baseUsdt <= 0) return null;
      if (!Number.isFinite(percent) || percent <= 0) return null;
      const bonus = baseUsdt * (percent / 100);
      if (!Number.isFinite(bonus) || bonus <= 0) return null;
      const refUser = await readJsonKV(userKeyById(referrerId), null);
      if (!refUser) return null;
      await ensureUserRefV2(refUser);
      refUser.ref.balanceUsdt = Number(refUser.ref.balanceUsdt || 0) + bonus;
      refUser.ref.totalEarnedUsdt = Number(refUser.ref.totalEarnedUsdt || 0) + bonus;
      const log = Array.isArray(refUser.ref.earnLog) ? refUser.ref.earnLog : [];
      log.unshift({
        ts: now(),
        dealType,
        dealId,
        percent,
        baseUsdt,
        bonusUsdt: bonus,
        referredUserId: String(referredId)
      });
      refUser.ref.earnLog = log.slice(0, 200);
      await writeJsonKV(userKeyById(refUser.id), refUser);
      return { bonusUsdt: bonus };
    }
    __name(addRefBonus, "addRefBonus");
    __name2(addRefBonus, "addRefBonus");
    function isBuyCompletedStatus(st) {
      st = String(st || "").toUpperCase();
      return st === "BYBIT_DONE" || st === "DONE" || st === "COMPLETED";
    }
    __name(isBuyCompletedStatus, "isBuyCompletedStatus");
    __name2(isBuyCompletedStatus, "isBuyCompletedStatus");
    function isSellCompletedStatus(st) {
      st = normalizeSellStatus(st);
      return st === "COMPLETED";
    }
    __name(isSellCompletedStatus, "isSellCompletedStatus");
    __name2(isSellCompletedStatus, "isSellCompletedStatus");
    async function tryAwardBonusForBuyOffer(offer) {
      try {
        if (!offer || offer.refBonusApplied) return;
        const buyerId = offer.user && offer.user.id ? String(offer.user.id) : "";
        if (!buyerId) return;
        const buyer = await readJsonKV(userKeyById(buyerId), null);
        if (!buyer) return;
        await ensureUserRefV2(buyer);
        const referrerId = buyer.ref && buyer.ref.referrerUserId ? String(buyer.ref.referrerUserId) : "";
        if (!referrerId) return;
        const amountRub = Number(offer.amountRub || 0);
        const rate = Number(offer.rate || 0);
        if (!Number.isFinite(amountRub) || amountRub <= 0) return;
        if (!Number.isFinite(rate) || rate <= 0) return;
        const baseUsdt = amountRub / rate;
        const res = await addRefBonus({
          referrerId,
          referredId: buyerId,
          dealType: "BUY",
          dealId: String(offer.id || ""),
          baseUsdt,
          percent: 0.1
        });
        if (res && res.bonusUsdt) {
          offer.refBonusApplied = { ts: now(), referrerId, bonusUsdt: res.bonusUsdt, baseUsdt, percent: 0.1 };
        }
      } catch (_) {
      }
    }
    __name(tryAwardBonusForBuyOffer, "tryAwardBonusForBuyOffer");
    __name2(tryAwardBonusForBuyOffer, "tryAwardBonusForBuyOffer");
    async function tryAwardBonusForSellDeal(deal) {
      try {
        if (!deal || deal.refBonusApplied) return;
        const sellerId = deal.user && deal.user.id ? String(deal.user.id) : "";
        if (!sellerId) return;
        const seller = await readJsonKV(userKeyById(sellerId), null);
        if (!seller) return;
        await ensureUserRefV2(seller);
        const referrerId = seller.ref && seller.ref.referrerUserId ? String(seller.ref.referrerUserId) : "";
        if (!referrerId) return;
        const baseUsdt = Number(deal.amountUsdt || 0);
        if (!Number.isFinite(baseUsdt) || baseUsdt <= 0) return;
        const res = await addRefBonus({
          referrerId,
          referredId: sellerId,
          dealType: "SELL",
          dealId: String(deal.dealId || ""),
          baseUsdt,
          percent: 0.5
        });
        if (res && res.bonusUsdt) {
          deal.refBonusApplied = { ts: now(), referrerId, bonusUsdt: res.bonusUsdt, baseUsdt, percent: 0.5 };
        }
      } catch (_) {
      }
    }
    __name(tryAwardBonusForSellDeal, "tryAwardBonusForSellDeal");
    __name2(tryAwardBonusForSellDeal, "tryAwardBonusForSellDeal");
    if (url.pathname === "/api/public/ref/me" && request.method === "GET") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      await ensureUserRefV2(au.user);
      await writeJsonKV(userKeyById(au.user.id), au.user);
      return json({
        ok: true,
        ref: au.user.ref,
        me: { id: au.user.id, username: au.user.username }
      });
    }
    if (url.pathname === "/api/public/ref/apply" && request.method === "POST") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const body = await request.json().catch(() => ({}));
      const code = normRefCode(body.code || body.ref || "");
      if (!code) return bad("Invalid referral code");
      const me = au.user;
      await ensureUserRefV2(me);
      if (me.ref && me.ref.referrerUserId) return bad("Referrer already set", 409);
      const map = await readJsonKV(`ref:code:${code}`, null);
      if (!map || !map.userId) return bad("Referral code not found", 404);
      const referrerId = String(map.userId);
      if (referrerId === String(me.id)) return bad("Cannot use own code", 409);
      me.ref.referrerUserId = referrerId;
      me.ref.referrerCode = code;
      me.ref.refSetAt = now();
      me.updatedAt = now();
      await writeJsonKV(userKeyById(me.id), me);
      try {
        const r = await readJsonKV(userKeyById(referrerId), null);
        if (r) {
          await ensureUserRefV2(r);
          r.ref.referredCount = Number(r.ref.referredCount || 0) + 1;
          await writeJsonKV(userKeyById(r.id), r);
        }
      } catch (_) {
      }
      try {
        ctx.waitUntil(
          tgNotifyAdmin({
            title: "\u{1F381} REF: \u043F\u0440\u0438\u043C\u0435\u043D\u0451\u043D \u043A\u043E\u0434",
            user: me ? { id: me.id, username: me.username } : null,
            step: "REF_APPLY",
            req: request,
            lines: ["Code: " + code, "ReferrerId: " + referrerId]
          })
        );
      } catch (_) {
      }
      return json({ ok: true });
    }
    const REF_WITHDRAW_KEY = "refWithdrawRequests";
    if (url.pathname === "/api/public/ref/withdraw" && request.method === "POST") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const body = await request.json().catch(() => ({}));
      const amountUsdt = Number(body.amountUsdt ?? body.amount ?? 0);
      if (!Number.isFinite(amountUsdt) || amountUsdt <= 0) return bad("Invalid amountUsdt");
      const me = au.user;
      await ensureUserRefV2(me);
      const bal = Number(me.ref.balanceUsdt || 0);
      if (amountUsdt > bal + 1e-12) return bad("Not enough balance", 409);
      const reqId = "rw_" + randId(14);
      me.ref.balanceUsdt = bal - amountUsdt;
      me.updatedAt = now();
      await writeJsonKV(userKeyById(me.id), me);
      const amountDec6 = Math.trunc(amountUsdt * 1e6);
      await d1.prepare(
        "INSERT INTO user_balances (user_id, usdt_trc20_balance, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET usdt_trc20_balance = usdt_trc20_balance + excluded.usdt_trc20_balance, updated_at=excluded.updated_at"
      ).bind(String(me.id), amountDec6, now()).run();
      const rec = {
        id: reqId,
        kind: "REF_TO_WALLET",
        user: { id: String(me.id || ""), username: String(me.username || "") },
        amountUsdt,
        amountUsdtE6: amountDec6,
        type: "WALLET",
        dest: "INTERNAL_BALANCE",
        status: "DONE",
        createdAt: now(),
        updatedAt: now()
      };
      const arr = await readJsonKV(REF_WITHDRAW_KEY, []);
      const list = Array.isArray(arr) ? arr : [];
      list.unshift(rec);
      await writeJsonKV(REF_WITHDRAW_KEY, list.slice(0, 5e3));
      try {
        ctx.waitUntil(
          tgNotifyWallet({
            kind: "REF_TO_WALLET",
            user: me ? { id: me.id, username: me.username } : null,
            req: request,
            refId: reqId,
            step: "REF_WITHDRAW_TO_WALLET",
            lines: [
              "Amount: " + fmtUsdtE6(amountDec6),
              "Source: referral balance",
              "Destination: internal wallet"
            ]
          })
        );
      } catch (_) {
      }
      try {
        ctx.waitUntil(
          tgNotifyUserText(
            { id: me.id, username: me.username },
            `\u{1F381} \u0411\u043E\u043D\u0443\u0441\u044B \u0432\u044B\u0432\u0435\u0434\u0435\u043D\u044B \u2705
+${money(amountUsdt, 2)} USDT \u0437\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u044B \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441 \u043A\u043E\u0448\u0435\u043B\u044C\u043A\u0430 \u{1F4B0}`
          )
        );
      } catch {
      }
      return json({ ok: true, id: reqId, status: "DONE" });
    }
    if (url.pathname === "/api/admin/ref/backfill" && request.method === "POST") {
      if (!requireAdmin()) return bad("Unauthorized", 401);
      const idx = await readJsonKV(userIndexKey, []);
      const ids = Array.isArray(idx) ? idx.slice(0, 5e3) : [];
      let updated = 0;
      for (const id of ids) {
        const u = await readJsonKV(userKeyById(id), null);
        if (!u) continue;
        if (!u.ref || !u.ref.code) {
          await ensureUserRefV2(u);
          await writeJsonKV(userKeyById(u.id), u);
          updated++;
        }
      }
      return json({ ok: true, updated });
    }
    if (url.pathname === "/api/public/history/deals" && request.method === "GET") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const meId = String(au.user?.id || "");
      const meUsername = String(au.user?.username || "");
      const buyOffers = await readJsonKV("buyOffers", []);
      const sellDeals = await readJsonKV(SELL_DEALS_KEY, []);
      const items = [];
      if (Array.isArray(buyOffers)) {
        for (const o of buyOffers) {
          const u = o && o.user ? o.user : null;
          const uid = u && u.id != null ? String(u.id) : "";
          const un = u && u.username != null ? String(u.username) : "";
          if (meId && uid === meId || meUsername && un && un === meUsername) {
            items.push({
              ...o,
              id: String(o.id || o.offerId || ""),
              type: "BUY"
            });
          }
        }
      }
      if (Array.isArray(sellDeals)) {
        for (const d of sellDeals) {
          const u = d && d.user ? d.user : null;
          const uid = u && u.id != null ? String(u.id) : "";
          const un = u && u.username != null ? String(u.username) : "";
          if (meId && uid === meId || meUsername && un && un === meUsername) {
            items.push({
              ...withSellDerivedFields(d),
              id: String(d.dealId || d.id || ""),
              type: "SELL",
              status: normalizeSellStatus(d.status)
            });
          }
        }
      }
      items.sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
      return json({ ok: true, items: items.slice(0, 500) });
    }
    if (url.pathname === "/api/public/history/bonuses" && request.method === "GET") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const me = au.user;
      await ensureUserRefV2(me);
      await writeJsonKV(userKeyById(me.id), me);
      const earn = Array.isArray(me.ref?.earnLog) ? me.ref.earnLog : [];
      const allW = await readJsonKV("refWithdrawRequests", []);
      const withdraws = (Array.isArray(allW) ? allW : []).filter((x) => {
        const uid = x?.user?.id != null ? String(x.user.id) : "";
        const un = x?.user?.username != null ? String(x.user.username) : "";
        return String(me.id) && uid === String(me.id) || me.username && un === String(me.username);
      });
      return json({
        ok: true,
        ref: me.ref,
        cashback: { balanceDec6: 0, totalEarnedDec6: 0, earnLog: [], spendLog: [] },
        earn: earn.slice(0, 200),
        cashbackEarn: [],
        withdraws: withdraws.slice(0, 200)
      });
    }
    if (url.pathname === "/api/public/history/wallet" && request.method === "GET") {
      const au = await readUserToken(request);
      if (!au) return bad("Unauthorized", 401);
      if (!au.ok) return bad(au.error || "Unauthorized", au.error === "Banned" ? 403 : 401);
      const meId = String(au.user?.id || "");
      let balDec6 = 0;
      try {
        const b = await d1.prepare("SELECT usdt_trc20_balance FROM user_balances WHERE user_id=?").bind(meId).first();
        balDec6 = Number(b?.usdt_trc20_balance || 0) || 0;
      } catch (e) {
        balDec6 = 0;
      }
      const bal = { usdt_trc20: money(balDec6 / 1e6, 2) };
      let deposits = [];
      try {
        const depRes = await d1.prepare(
          "SELECT user_id, network, token, to_address, txid, amount_dec6, status, seen_at, confirmed_at, credited_at FROM deposits WHERE user_id=? ORDER BY COALESCE(credited_at, confirmed_at, seen_at) DESC LIMIT 50"
        ).bind(meId).all();
        deposits = Array.isArray(depRes?.results) ? depRes.results : [];
      } catch (e) {
        deposits = [];
      }
      const led = [];
      try {
        const WKEY = "userWithdrawals";
        const allW = await readJsonKV(WKEY, []);
        const myW = (Array.isArray(allW) ? allW : []).filter((x) => String(x?.user?.id || "") === meId);
        for (const w of myW.slice(0, 200)) {
          const amt = Number(w.amountDec6 || w.amount_dec6 || 0) || 0;
          led.push({
            kind: "WITHDRAW",
            dec6: -Math.abs(amt),
            ts: Number(w.updatedAt || w.createdAt || w.ts || 0) || 0,
            note: String(w.status || "PENDING")
          });
        }
      } catch (e) {
      }
      try {
        const allL = await readJsonKV("walletLedger", []);
        const myL = (Array.isArray(allL) ? allL : []).filter((x) => String(x?.userId || "") === meId);
        for (const l of myL.slice(0, 200)) {
          led.push({
            kind: String(l.kind || "WALLET"),
            dec6: Number(l.dec6 || 0) || 0,
            ts: Number(l.ts || 0) || 0,
            note: String(l.note || "")
          });
        }
      } catch (e) {
      }
      try {
        const allR = await readJsonKV("refWithdrawRequests", []);
        const myR = (Array.isArray(allR) ? allR : []).filter(
          (x) => String(x?.user?.id || "") === meId && String(x?.status || "").toUpperCase() === "DONE"
        );
        for (const r of myR.slice(0, 200)) {
          const amt = Number(r.amountUsdtE6 || r.amountDec6 || 0) || Math.trunc((Number(r.amountUsdt || 0) || 0) * 1e6);
          led.push({
            kind: "REF",
            dec6: Math.abs(amt),
            ts: Number(r.updatedAt || r.createdAt || r.ts || 0) || 0,
            note: "\u0411\u043E\u043D\u0443\u0441\u044B \u2192 \u043A\u043E\u0448\u0435\u043B\u0451\u043A"
          });
        }
      } catch (e) {
      }
      led.sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0));
      return json({ ok: true, balance: bal, deposits, ledger: led.slice(0, 200) });
    }
    return bad("Not found", 404);
  },
  // ✅ добавлено: cron handler для сканирования депозитов (ничего другого не трогаем)
  async scheduled(event, env, ctx) {
  ctx.waitUntil(expireBuyAmountBroadcasts(env));
}
};
export {
  ReservationsDO,
  index_default as default
};
