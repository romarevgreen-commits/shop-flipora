const { stripe, json, authenticatedUser, userRest, siteUrl } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,stripe_account_id`, event);
    let accountId = profiles?.[0]?.stripe_account_id;
    if (!accountId) {
      const account = await stripe().accounts.create({
        type: "express",
        email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { url: siteUrl() },
        metadata: { flipora_user_id: user.id }
      });
      accountId = account.id;
      await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}`, event, {
        method: "PATCH",
        body: JSON.stringify({ stripe_account_id: accountId })
      });
    }
    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${siteUrl()}/?stripe=refresh`,
      return_url: `${siteUrl()}/?stripe=return`,
      collection_options: { fields: "eventually_due", future_requirements: "include" }
    });
    return json(200, { url: link.url });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return json(400, { error: error.message || "Could not start Stripe onboarding" });
  }
};
