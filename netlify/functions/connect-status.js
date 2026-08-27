const { recipientAccount, recipientPayoutState, json, authenticatedUser, userRest, rest } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=stripe_account_id,membership_active`, event);
    const member = Boolean(profiles?.[0]?.membership_active);
    if (!member) return json(200, { member: false, connected: false, onboardingStatus: "membership_required" });
    const accountId = profiles?.[0]?.stripe_account_id;
    if (!accountId) return json(200, { member: true, connected: false, onboardingStatus: "not_started" });

    const state = recipientPayoutState(await recipientAccount(accountId));
    const onboardingStatus = state.connected ? "complete" : state.requirementsStatus || state.transfersStatus || "pending";
    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        stripe_onboarding_complete: state.connected,
        stripe_payouts_enabled: state.connected,
        stripe_onboarding_status: onboardingStatus,
        stripe_requirements_status: state.requirementsStatus,
        stripe_status_updated_at: new Date().toISOString()
      })
    });
    return json(200, { member: true, ...state, onboardingStatus });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return json(400, { error: error.message || "Could not check Stripe status" });
  }
};

