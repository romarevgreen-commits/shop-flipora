const { stripe, json, authenticatedUser, userRest, rest } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=stripe_account_id,membership_active`, event);
    const member = Boolean(profiles?.[0]?.membership_active);
    if (!member) return json(200, { member: false, connected: false });
    const accountId = profiles?.[0]?.stripe_account_id;
    if (!accountId) return json(200, { member: true, connected: false });
    const account = await stripe().v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient", "requirements"]
    });
    const balanceCapabilities = account.configuration?.recipient?.capabilities?.stripe_balance;
    const transfersActive = balanceCapabilities?.stripe_transfers?.status === "active";
    const payoutsActive = balanceCapabilities?.payouts?.status === "active";
    const connected = Boolean(transfersActive && payoutsActive);
    const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status || null;
    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ stripe_onboarding_complete: connected })
    });
    return json(200, {
      member: true,
      connected,
      detailsSubmitted: requirementsStatus !== "currently_due" && requirementsStatus !== "past_due",
      transfersActive,
      payoutsActive,
      requirementsStatus
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return json(400, { error: error.message || "Could not check Stripe status" });
  }
};

