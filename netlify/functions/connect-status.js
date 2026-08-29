const { recipientAccount, recipientPayoutState, json, authenticatedUser, userRest, rest } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=stripe_account_id,membership_active`, event);
    const profile = profiles?.[0];
    const member = Boolean(profile?.membership_active);
    const accountId = profile?.stripe_account_id;
    if (!accountId) return json(200, { member, connected: false, payoutsEnabled: false, onboardingStatus: "not_started" });

    const state = recipientPayoutState(await recipientAccount(accountId));
    const onboardingStatus = state.connected ? "complete" : state.requirementsStatus || state.transfersStatus || "pending";
    const payoutsEnabled = Boolean(state.connected && member);
    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        stripe_onboarding_complete: state.connected,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_onboarding_status: onboardingStatus,
        stripe_requirements_status: state.requirementsStatus,
        stripe_status_updated_at: new Date().toISOString()
      })
    });
    return json(200, { member, ...state, payoutsEnabled, onboardingStatus });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return json(400, { error: error.message || "Could not check Stripe status" });
  }
};
