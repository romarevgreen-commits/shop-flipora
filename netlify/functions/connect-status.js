const { stripe, json, authenticatedUser, userRest, rest } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=stripe_account_id,membership_active`, event);
    const member = Boolean(profiles?.[0]?.membership_active);
    if (!member) return json(200, { member: false, connected: false });

    const accountId = profiles?.[0]?.stripe_account_id;
    if (!accountId) return json(200, { member: true, connected: false, detailsSubmitted: false });

    const account = await stripe().accounts.retrieve(accountId);
    const transfersActive = account.capabilities?.transfers === "active";
    const payoutsEnabled = Boolean(account.payouts_enabled);
    const detailsSubmitted = Boolean(account.details_submitted);
    const hasPastDue = Array.isArray(account.requirements?.past_due) && account.requirements.past_due.length > 0;
    const hasCurrentlyDue = Array.isArray(account.requirements?.currently_due) && account.requirements.currently_due.length > 0;
    const requirementsStatus = hasPastDue ? "past_due" : hasCurrentlyDue ? "currently_due" : null;
    const connected = Boolean(transfersActive && payoutsEnabled && detailsSubmitted);

    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ stripe_onboarding_complete: connected })
    });

    return json(200, {
      member: true,
      connected,
      detailsSubmitted,
      transfersActive,
      payoutsEnabled,
      requirementsStatus
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return json(400, { error: error.message || "Could not check Stripe status" });
  }
};
