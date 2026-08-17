const { getSettings, getStock, getSold, store, checkAdminPin, json } = require("./_shared");

exports.handler = async (event) => {
  if (!checkAdminPin(event)) {
    return json(401, { error: "Incorrect PIN." });
  }

  if (event.httpMethod === "GET") {
    const [settings, stock, sold] = await Promise.all([
      getSettings(),
      getStock(),
      getSold(),
    ]);
    return json(200, { settings, stock, sold: sold.slice().reverse() });
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid request." });
    }
    const { businessName, currency, price } = body;
    if (
      typeof businessName !== "string" ||
      typeof currency !== "string" ||
      typeof price !== "number" ||
      price <= 0
    ) {
      return json(400, { error: "Fill in a valid name, currency, and price." });
    }
    const s = store();
    await s.setJSON("settings", {
      businessName: businessName.trim(),
      currency: currency.trim().toUpperCase(),
      price,
    });
    return json(200, { ok: true });
  }

  return json(405, { error: "Method not allowed." });
};
