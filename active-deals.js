/* ======================================
   Crossflag Active Deals (frontend only)
   ====================================== */

const ACTIVE_DEALS_KEY = "crossflag_active_deals";

/*
Структура:
{
  buy: [
    { id, reserveId, createdAt }
  ],
  sell: [
    { dealId, secret, createdAt }
  ]
}
*/

function loadDeals() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_DEALS_KEY)) || { buy: [], sell: [] };
  } catch {
    return { buy: [], sell: [] };
  }
}

function saveDeals(data) {
  localStorage.setItem(ACTIVE_DEALS_KEY, JSON.stringify(data));
}

/* ---------- BUY ---------- */

function addActiveBuy({ id, reserveId }) {
  if (!id || !reserveId) return;

  const data = loadDeals();
  if (!data.buy.find(x => x.id === id && x.reserveId === reserveId)) {
    data.buy.push({ id, reserveId, createdAt: Date.now() });
    saveDeals(data);
  }
}

/* 🔧 ИСПРАВЛЕНО: удаление по id + reserveId */
function removeActiveBuy(id, reserveId) {
  const data = loadDeals();
  data.buy = data.buy.filter(
    x => !(x.id === id && x.reserveId === reserveId)
  );
  saveDeals(data);
}

/* ---------- SELL ---------- */

function addActiveSell({ dealId, secret }) {
  if (!dealId || !secret) return;

  const data = loadDeals();
  if (!data.sell.find(x => x.dealId === dealId)) {
    data.sell.push({ dealId, secret, createdAt: Date.now() });
    saveDeals(data);
  }
}

function removeActiveSell(dealId) {
  const data = loadDeals();
  data.sell = data.sell.filter(x => x.dealId !== dealId);
  saveDeals(data);
}

/* ---------- helpers ---------- */

function getActiveDeals() {
  return loadDeals();
}

function hasActiveDeals() {
  const d = loadDeals();
  return (d.buy.length + d.sell.length) > 0;
}

/* ---------- export ---------- */

window.CrossflagDeals = {
  addActiveBuy,
  removeActiveBuy,
  addActiveSell,
  removeActiveSell,
  getActiveDeals,
  hasActiveDeals,
};
