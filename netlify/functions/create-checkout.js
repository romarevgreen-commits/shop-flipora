const { stripe, json, authenticatedUser, userRest, siteUrl } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  try {
    const buyer = await authenticatedUser(event);
    const { listingId } = JSON.parse(event.body || "{}");

    const rows = await userRest(
      `listings?id=eq.${encodeURIComponent(listingId)}&status=eq.active&select=id,title,price,seller_id`,
      event
    );
    const listing = rows?.[0];
    if (!listing) throw new Error("Listing is unavailable");
    if (listing.seller_id === buyer.id) throw new Error("You cannot buy your own listing");

    const sellers = await userRest(
      `profiles?id=eq.${encodeURIComponent(listing.seller_id)}&select=stripe_account_id,stripe_onboarding_complete`,
      event
    );
    const seller = sellers?.[0];
    if (!seller?.stripe_account_id || !seller.stripe_onboarding_complete) {
      throw new Error("Seller payouts are not ready");
    }

    const amount = Math.round(Number(listing.price) * 100);
    const fee = Math.round(amount * 0.10);
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: buyer.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: listing.title }
        }
      }],
      success_url: `${siteUrl()}/?payment=success`,
      cancel_url: `${siteUrl()}/?payment=cancelled`,
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: seller.stripe_account_id },
        metadata: {
          listing_id: String(listing.id),
          buyer_id: buyer.id,
          seller_id: listing.seller_id
        }
      },
      metadata: {
        listing_id: String(listing.id),
        buyer_id: buyer.id,
        seller_id: listing.seller_id
      }
    });

    await userRest("orders", event, {
      method: "POST",
      body: JSON.stringify({
        listing_id: listing.id,
        buyer_id: buyer.id,
        seller_id: listing.seller_id,
        stripe_checkout_session_id: session.id,
        amount_total: amount,
        platform_fee: fee,
        status: "pending"
      })
    });

    return json(200, { url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return json(400, { error: error.message || "Could not start checkout" });
  }
};
