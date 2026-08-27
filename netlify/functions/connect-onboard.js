const { stripeV2, json, authenticatedUser, userRest, rest, siteUrl } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const user = await authenticatedUser(event);
    const profiles = await userRest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,stripe_account_id,membership_active`, event);
    if (!profiles?.[0]?.membership_active) throw new Error("Pay the $9.99 lifetime membership fee before connecting seller payouts");

    let accountId = profiles?.[0]?.stripe_account_id;
    if (!accountId) {
      const account = await stripeV2("core/accounts", {
        method: "POST",
        body: JSON.stringify({
          contact_email: user.email,
          display_name: user.user_metadata?.display_name || user.email.split("@")[0],
          defaults: {
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application"
            }
          },
          dashboard: "express",
          identity: { country: "us" },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: {
                  stripe_transfers: { requested: true }
                }
              }
            }
          },
          metadata: { flipora_user_id: user.id },
          include: ["configuration.recipient", "identity", "requirements"]
        })
      });
      accountId = account.id;
      await rest(`profiles?id=eq.${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ stripe_account_id: accountId, stripe_onboarding_complete: false })
      });
    }

    const link = await stripeV2("core/account_links", {
      method: "POST",
      body: JSON.stringify({
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["recipient"],
            refresh_url: `${siteUrl()}/?stripe=refresh`,
            return_url: `${siteUrl()}/?stripe=return`,
            collection_options: {
              fields: "eventually_due",
              future_requirements: "include"
            }
          }
        }
      })
    });

    return json(200, { url: link.url });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    const text = String(error.message || "");
    if (error.code === "accounts_v2_access_blocked") {
      return json(400, { error: "Stripe Connect Accounts v2 is not enabled for the Flipora Stripe account yet. Finish the Connect platform setup in Stripe, then try again." });
    }
    if (/loss|liabilit|responsibil|platform profile/i.test(text)) {
      return json(400, { error: "Stripe requires Flipora to accept the marketplace platform responsibilities and loss liability before seller payout accounts can be created. Complete the Stripe Connect platform profile, then tap Connect Stripe again." });
    }
    return json(400, { error: text || "Could not start Stripe onboarding" });
  }
};
