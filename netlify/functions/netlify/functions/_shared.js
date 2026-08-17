const { getStore } = require("@netlify/blobs");

function store() {
  return getStore("tuga-store");
}

const DEFAULT_SETTINGS = {
  businessName: "Tuga WiFi",
  currency: "GHS",
  price: 10,
};

async function getSettings() {
  const s = store();
  const raw = await s.get("settings", { type: "json" });
  return raw ? { ...DEFAULT_SETTINGS, ...raw } : DEFAULT_SETTINGS;
}

async function getStock() {
  const s = store();
  const raw = await s.get("stock", { type: "json" });
  return Array.isArray(raw) ? raw : [];
}

async function setStock(list) {
  const s = store();
  await s.setJSON("stock", list);
}

async function appendSold(entry) {
  const s = store();
  const raw = await s.get("sold", { type: "json" });
  const list = Array.isArray(raw) ? raw : [];
  list.push(entry);
  await s.setJSON("sold", list);
}

async function getSold() {
  const s = store();
  const raw = await s.get("sold", { type: "json" });
  return Array.isArray(raw) ? raw : [];
}

function checkAdminPin(event) {
  const provided =
    event.headers["x-admin-pin"] || event.headers["X-Admin-Pin"] || "";
  const expected = process.env.ADMIN_PIN || "";
  return expected.length > 0 && provided === expected;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = {
  store,
  getSettings,
  getStock,
  setStock,
  appendSold,
  getSold,
  checkAdminPin,
  json,
};
