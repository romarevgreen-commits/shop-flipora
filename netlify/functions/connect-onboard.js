const { stripe, stripeV2, recipientAccount, json, authenticatedUser, userRest, rest, siteUrl } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,display_name,stripe_account_id,membership_active`, event);
    const profile = profiles?.[0];
    if (!profile?.membership_active) throw new Error("Pay the $9.99 lifetime membership fee before connecting seller payouts");

    let accountId = profile.stripe_account_id;
    if (accountId) {
      try { await recipientAccount(accountId); }
      catch (error) {
        if (error?.code === "resource_missing" || error?.statusCode === 404) accountId = null;
        else throw error;
      }
    }

    if (!accountId) {
      const account = await stripeV2("core/accounts", {
        method: "POST",
        headers: { "Idempotency-Key": `flipora-connect-${user.id}` },
        body: JSON.stringify({
          contact_email: user.email,
          display_name: profile.display_name || user.user_metadata?.display_name || user.email.split("@")[0],
          dashboard: "express",
          defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
          configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
          identity: { country: "us" },
          metadata: { flipora_user_id: user.id }
        })
      });
      accountId = account.id;
      await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          stripe_account_id: accountId,
          stripe_onboarding_complete: false,
          stripe_payouts_enabled: false,
          stripe_onboarding_status: "pending",
          stripe_requirements_status: "currently_due",
          stripe_status_updated_at: new Date().toISOString()
        })
      });
    }

    const link = await stripe().accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl()}/?stripe=refresh`,
      return_url: `${siteUrl()}/?stripe=return`,
      type: "account_onboarding",
      collection_options: { fields: "eventually_due", future_requirements: "include" }
    });
    return json(200, { url: link.url, accountId });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    const text = String(error.message || "");
    if (/connect platform|signed up for connect|platform profile/i.test(text)) {
      return json(400, { error: "Finish the Stripe Connect platform setup for Flipora in Stripe, then tap Connect Stripe again." });
    }
    return json(400, { error: text || "Could not start Stripe onboarding" });
  }
};

