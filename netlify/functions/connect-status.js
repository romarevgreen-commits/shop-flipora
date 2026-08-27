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

    const account = await stripe().v2.core.accounts.retrieve(accountId, {
      include: ["configuration.recipient", "requirements"]
    });
    const transferCapability = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers;
    const transfersActive = transferCapability?.status === "active";
    const requirementEntries = Array.isArray(account.requirements?.entries) ? account.requirements.entries : [];
    const deadlineStatuses = requirementEntries.map(entry => entry.minimum_deadline?.status).filter(Boolean);
    const hasPastDue = deadlineStatuses.includes("past_due");
    const hasCurrentlyDue = deadlineStatuses.includes("currently_due");
    const requirementsStatus = hasPastDue ? "past_due" : hasCurrentlyDue ? "currently_due" : null;
    const detailsSubmitted = !hasPastDue && !hasCurrentlyDue;
    const connected = Boolean(transfersActive);

    await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ stripe_onboarding_complete: connected })
    });

    return json(200, {
      member: true,
      connected,
      detailsSubmitted,
      transfersActive,
      requirementsStatus,
      transferStatusDetails: transferCapability?.status_details || null
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return json(400, { error: error.message || "Could not check Stripe status" });
  }
};
