const { stripeV2, recipientAccount, json, authenticatedUser, userRest, rest, siteUrl, required } = require("./_shared");

function recipientConfiguration() {
  return {
    recipient: {
      capabilities: {
        stripe_balance: {
          stripe_transfers: { requested: true }
        }
      }
    }
  };
}

async function verifyPlatformAccount() {
  const response = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}` }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || "Could not verify Flipora Stripe account");
  }

  const expected = required("STRIPE_PLATFORM_ACCOUNT_ID");
  if (body.id !== expected) {
    const error = new Error(`Netlify Stripe key is connected to the wrong Stripe account (${body.id}). Flipora requires ${expected}.`);
    error.code = "stripe_platform_mismatch";
    throw error;
  }

  return body;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    await verifyPlatformAccount();

    const user = await authenticatedUser(event);
    const profiles = await userRest(
      `profiles?id=eq.${encodeURIComponent(user.id)}&select=id,display_name,stripe_account_id,membership_active`,
      event
    );
    const profile = profiles?.[0];
    if (!profile) throw new Error("Seller profile not found");

    let accountId = profile.stripe_account_id;
    let account = null;

    if (accountId) {
      try {
        account = await recipientAccount(accountId);
      } catch (error) {
        if (error?.code === "resource_missing" || error?.statusCode === 404) {
          accountId = null;
        } else {
          throw error;
        }
      }
    }

    if (accountId && !account?.configuration?.recipient) {
      account = await stripeV2(`core/accounts/${encodeURIComponent(accountId)}`, {
        method: "POST",
        body: JSON.stringify({
          dashboard: account?.dashboard || "express",
          defaults: {
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application"
            }
          },
          configuration: recipientConfiguration(),
          metadata: { flipora_user_id: user.id }
        })
      });
    }

    if (!accountId) {
      account = await stripeV2("core/accounts", {
        method: "POST",
        headers: { "Idempotency-Key": `flipora-recipient-${user.id}` },
        body: JSON.stringify({
          contact_email: user.email,
          display_name: profile.display_name || user.user_metadata?.display_name || user.email.split("@")[0],
          dashboard: "express",
          defaults: {
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application"
            }
          },
          configuration: recipientConfiguration(),
          identity: { country: "us" },
          metadata: { flipora_user_id: user.id }
        })
      });
      accountId = account.id;
    }

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

    if (!link?.url) throw new Error("Stripe did not return an onboarding link");

    return json(200, {
      url: link.url,
      accountId,
      member: Boolean(profile.membership_active)
    });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return json(400, {
      error: error.message || "Could not start Stripe seller onboarding",
      errorCode: error.code || null
    });
  }
};
