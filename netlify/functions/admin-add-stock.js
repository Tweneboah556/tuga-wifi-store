const { getStock, setStock, checkAdminPin, json } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }
  if (!checkAdminPin(event)) {
    return json(401, { error: "Incorrect PIN." });
  }

  let text;
  try {
    ({ text } = JSON.parse(event.body || "{}"));
  } catch {
    return json(400, { error: "Invalid request." });
  }
  if (!text || typeof text !== "string") {
    return json(400, { error: "Paste in some codes first." });
  }

  // Pull alphanumeric tokens (4+ chars) out of pasted text, one per line or mixed in.
  const matches = text.match(/[A-Za-z0-9]{4,}/g) || [];
  const seen = new Set();
  const newCodes = [];
  for (const code of matches) {
    const upper = code.toUpperCase();
    if (!seen.has(upper)) {
      seen.add(upper);
      newCodes.push(upper);
    }
  }
  if (newCodes.length === 0) {
    return json(400, { error: "No valid codes found in that text." });
  }

  const stock = await getStock();
  const existing = new Set(stock.map((v) => v.code));
  const now = new Date().toISOString();
  let added = 0;
  for (const code of newCodes) {
    if (!existing.has(code)) {
      stock.push({ code, addedAt: now });
      existing.add(code);
      added++;
    }
  }
  await setStock(stock);

  return json(200, { added, skippedDuplicates: newCodes.length - added, inStock: stock.length });
};
