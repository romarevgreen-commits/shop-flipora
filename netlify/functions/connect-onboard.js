const { stripe, json, authenticatedUser, userRest, rest, siteUrl } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,stripe_account_id,membership_active`, event);
    if (!profiles?.[0]?.membership_active) throw new Error("Pay the $9.99 lifetime membership fee before connecting seller payouts");

    let accountId = profiles?.[0]?.stripe_account_id;

    if (accountId) {
      try {
        await stripe().accounts.retrieve(accountId);
      } catch (error) {
        if (error?.code === "resource_missing" || error?.statusCode === 404) {
          accountId = null;
        } else {
          throw error;
        }
      }
    }

    if (!accountId) {
      const account = await stripe().accounts.create({
        type: "express",
        country: "US",
        email: user.email,
        capabilities: {
          transfers: { requested: true }
        },
        business_profile: {
          url: siteUrl(),
          product_description: "Sell items and receive marketplace payouts through Flipora."
        },
        metadata: { flipora_user_id: user.id }
      });
      accountId = account.id;
      await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ stripe_account_id: accountId, stripe_onboarding_complete: false })
      });
    }

    const link = await stripe().accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl()}/?stripe=refresh`,
      return_url: `${siteUrl()}/?stripe=return`,
      type: "account_onboarding",
      collection_options: {
        fields: "eventually_due",
        future_requirements: "include"
      }
    });

    return json(200, { url: link.url });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    const text = String(error.message || "");
    if (/connect platform|signed up for connect|platform profile/i.test(text)) {
      return json(400, { error: "Finish the Stripe Connect platform setup for Flipora in Stripe, then tap Connect Stripe again." });
    }
    return json(400, { error: text || "Could not start Stripe onboarding" });
  }
};
