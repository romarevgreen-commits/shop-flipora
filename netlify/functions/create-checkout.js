const { stripe, recipientAccount, recipientPayoutState, json, authenticatedUser, rest, siteUrl } = require("./_shared");

const PLATFORM_FEE_RATE = 0.12;
const INTEGRATION_IDENTIFIER = "flipora_marketplace_qkzmpvha";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const buyer = await authenticatedUser(event);
    const { listingId } = JSON.parse(event.body || "{}");
    const rows = await rest(`listings?id=eq.${encodeURIComponent(listingId)}&status=eq.active&select=id,title,price,seller_id`);
    const listing = rows?.[0];
    if (!listing) throw new Error("Listing is unavailable");
    if (listing.seller_id === buyer.id) throw new Error("You cannot buy your own listing. Sign out and use a different buyer account.");

    const sellers = await rest(`profiles?id=eq.${encodeURIComponent(listing.seller_id)}&select=stripe_account_id,membership_active,stripe_onboarding_complete,stripe_payouts_enabled`);
    const seller = sellers?.[0];
    if (!seller?.membership_active) throw new Error("Checkout is waiting for this seller to activate payments. Buyers do not need a membership.");
    if (!seller?.stripe_account_id) throw new Error("Checkout is waiting for this seller to finish Stripe payout setup.");

    const payoutState = recipientPayoutState(await recipientAccount(seller.stripe_account_id));
    await rest(`profiles?id=eq.${encodeURIComponent(listing.seller_id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        stripe_onboarding_complete: payoutState.connected,
        stripe_payouts_enabled: payoutState.connected,
        stripe_onboarding_status: payoutState.connected ? "complete" : payoutState.requirementsStatus || payoutState.transfersStatus,
        stripe_requirements_status: payoutState.requirementsStatus,
        stripe_status_updated_at: new Date().toISOString()
      })
    });
    if (!payoutState.connected) throw new Error("Seller payouts are not ready");

    const amount = Math.round(Number(listing.price) * 100);
    if (!Number.isSafeInteger(amount) || amount < 50) throw new Error("Listing price is invalid");
    const fee = Math.round(amount * PLATFORM_FEE_RATE);
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      integration_identifier: INTEGRATION_IDENTIFIER,
      customer_email: buyer.email,
      shipping_address_collection: { allowed_countries: ["US"] },
      custom_text: { shipping_address: { message: "Enter the address where you want this Flipora item delivered." } },
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: amount, product_data: { name: listing.title } } }],
      success_url: `${siteUrl()}/?payment=success`,
      cancel_url: `${siteUrl()}/?payment=cancelled`,
      payment_intent_data: {
        receipt_email: buyer.email,
        application_fee_amount: fee,
        transfer_data: { destination: seller.stripe_account_id },
        metadata: { listing_id: String(listing.id), buyer_id: buyer.id, seller_id: listing.seller_id }
      },
      metadata: { listing_id: String(listing.id), buyer_id: buyer.id, seller_id: listing.seller_id, platform_fee_percent: "12" }
    }, { idempotencyKey: `flipora-checkout-${buyer.id}-${listing.id}-${Math.floor(Date.now() / 60000)}` });

    await rest("orders", { method: "POST", body: JSON.stringify({ listing_id: listing.id, item_title: listing.title, buyer_id: buyer.id, seller_id: listing.seller_id, stripe_checkout_session_id: session.id, amount_total: amount, platform_fee: fee, status: "pending" }) });
    return json(200, { url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return json(400, { error: error.message || "Could not start checkout" });
  }
};

