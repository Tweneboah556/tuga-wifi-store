const { getSettings, getStock } = require("./_shared");

exports.handler = async () => {
  try {
    const settings = await getSettings();
    const stock = await getStock();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: settings.businessName,
        currency: settings.currency,
        price: settings.price,
        inStock: stock.length,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not load store status." }),
    };
  }
};
