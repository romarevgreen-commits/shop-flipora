const { recipientAccount, recipientPayoutState, json, authenticatedUser, userRest, rest } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(
      `profiles?id=eq.${encodeURIComponent(user.id)}&select=stripe_account_id,membership_active`,
      event
    );
    const profile = profiles?.[0];
    const member = Boolean(profile?.membership_active);
    const accountId = profile?.stripe_account_id;

    if (!accountId) {
      return json(200, {
        member,
        accountId: null,
        connected: false,
        payoutsEnabled: false,
        transfersStatus: "not_started",
        onboardingStatus: "not_started",
        requirementsStatus: null
      });
    }

    let state;
    try {
      state = recipientPayoutState(await recipientAccount(accountId));
    } catch (error) {
      if (error?.code === "resource_missing" || error?.statusCode === 404) {
        await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            stripe_account_id: null,
            stripe_onboarding_complete: false,
            stripe_payouts_enabled: false,
            stripe_onboarding_status: "not_started",
            stripe_requirements_status: null,
            stripe_status_updated_at: new Date().toISOString()
          })
        });
        return json(200, {
          member,
          accountId: null,
          connected: false,
          payoutsEnabled: false,
          transfersStatus: "not_started",
          onboardingStatus: "not_started",
          requirementsStatus: null
        });
      }
      throw error;
    }

    const connected = Boolean(state.connected);
    const payoutsEnabled = Boolean(connected && member);
    const onboardingStatus = connected
      ? "complete"
      : state.requirementsStatus || state.transfersStatus || "pending";

    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        stripe_onboarding_complete: connected,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_onboarding_status: onboardingStatus,
        stripe_requirements_status: state.requirementsStatus,
        stripe_status_updated_at: new Date().toISOString()
      })
    });

    return json(200, {
      member,
      accountId,
      connected,
      payoutsEnabled,
      transfersStatus: state.transfersStatus,
      requirementsStatus: state.requirementsStatus,
      onboardingStatus
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return json(400, {
      error: error.message || "Could not check Stripe status",
      errorCode: error.code || null
    });
  }
};
