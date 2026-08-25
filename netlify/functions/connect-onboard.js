const { stripe, json, authenticatedUser, userRest, rest, siteUrl } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,stripe_account_id,membership_active`, event);
    if (!profiles?.[0]?.membership_active) throw new Error("Pay the $9.99 lifetime membership fee before connecting seller payouts");
    let accountId = profiles?.[0]?.stripe_account_id;
    if (!accountId) {
      const account = await stripe().v2.core.accounts.create({
        contact_email: user.email,
        display_name: user.user_metadata?.display_name || user.email.split("@")[0],
        dashboard: "express",
        defaults: {
          responsibilities: {
            fees_collector: "application",
            losses_collector: "application"
          },
          profile: {
            business_url: siteUrl(),
            product_description: "Local marketplace seller receiving proceeds from Flipora sales"
          }
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true }
              }
            }
          }
        },
        metadata: { flipora_user_id: user.id }
      });
      accountId = account.id;
      await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ stripe_account_id: accountId })
      });
    } else {
      const account = await stripe().v2.core.accounts.retrieve(accountId, {
        include: ["configuration.recipient"]
      });
      const balanceCapabilities = account.configuration?.recipient?.capabilities?.stripe_balance;
      const ready = balanceCapabilities?.stripe_transfers?.status === "active" && balanceCapabilities?.payouts?.status === "active";
      if (ready) {
        const login = await stripe().accounts.createLoginLink(accountId);
        return json(200, { url: login.url, dashboard: true });
      }
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

