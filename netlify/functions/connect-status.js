const { stripe, json, authenticatedUser, rest } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await rest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=stripe_account_id`);
    const accountId = profiles?.[0]?.stripe_account_id;
    if (!accountId) return json(200, { connected: false });
    const account = await stripe().accounts.retrieve(accountId);
    const connected = Boolean(account.charges_enabled && account.payouts_enabled);
    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, { method: "PATCH", body: JSON.stringify({ stripe_onboarding_complete: connected }) });
    return json(200, { connected, detailsSubmitted: account.details_submitted });
  } catch (error) { return json(400, { error: error.message }); }
};

