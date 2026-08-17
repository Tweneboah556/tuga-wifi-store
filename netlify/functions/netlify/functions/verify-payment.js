const { store, getSettings, getStock, setStock, appendSold, json } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  let reference;
  try {
    ({ reference } = JSON.parse(event.body || "{}"));
  } catch {
    return json(400, { error: "Invalid request." });
  }
  if (!reference || typeof reference !== "string") {
    return json(400, { error: "Missing payment reference." });
  }

  const s = store();

  // Idempotency: if we've already dispensed a code for this reference, return it again
  // instead of dispensing a second one (handles double-clicks / retries).
  const already = await s.get(`redeemed:${reference}`, { type: "json" });
  if (already && already.code) {
    return json(200, { code: already.code, alreadyRedeemed: true });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return json(500, { error: "Store is not configured yet. Missing Paystack key." });
  }

  // Verify the transaction directly with Paystack using the secret key.
  let paystackData;
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const payload = await res.json();
    if (!res.ok || !payload.status) {
      return json(402, { error: "Payment could not be verified." });
    }
    paystackData = payload.data;
  } catch {
    return json(502, { error: "Could not reach Paystack. Try again in a moment." });
  }

  if (!paystackData || paystackData.status !== "success") {
    return json(402, { error: "Payment was not successful." });
  }

  const settings = await getSettings();
  const expectedKobo = Math.round(settings.price * 100);
  if (
    paystackData.amount !== expectedKobo ||
    paystackData.currency !== settings.currency
  ) {
    return json(402, { error: "Payment amount did not match the current price." });
  }

  // Pop one code off the stock, atomically-ish (best effort — fine at small volume).
  const stock = await getStock();
  if (stock.length === 0) {
    return json(409, {
      error: "Payment succeeded but we're out of stock. Contact support for a refund.",
    });
  }
  const [voucher, ...rest] = stock;
  await setStock(rest);
  await s.setJSON(`redeemed:${reference}`, { code: voucher.code });
  await appendSold({
    code: voucher.code,
    reference,
    email: paystackData.customer?.email || null,
    amount: paystackData.amount,
    currency: paystackData.currency,
    soldAt: new Date().toISOString(),
  });

  return json(200, { code: voucher.code });
};
