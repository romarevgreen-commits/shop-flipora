const { stripe, json, rest, required } = require("./_shared");

exports.handler = async (event) => {
  try {
    const signature = event.headers["stripe-signature"];
    const payload = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    const stripeEvent = stripe().webhooks.constructEvent(payload, signature, required("STRIPE_WEBHOOK_SECRET"));
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      await rest(`orders?stripe_checkout_session_id=eq.${encodeURIComponent(session.id)}`, { method: "PATCH", body: JSON.stringify({ status: "paid", stripe_payment_intent_id: session.payment_intent, paid_at: new Date().toISOString() }) });
      await rest(`listings?id=eq.${encodeURIComponent(session.metadata.listing_id)}`, { method: "PATCH", body: JSON.stringify({ status: "sold" }) });
    }
    if (stripeEvent.type === "charge.refunded") {
      const charge = stripeEvent.data.object;
      await rest(`orders?stripe_payment_intent_id=eq.${encodeURIComponent(charge.payment_intent)}`, { method: "PATCH", body: JSON.stringify({ status: "refunded" }) });
    }
    return json(200, { received: true });
  } catch (error) { return json(400, { error: `Webhook error: ${error.message}` }); }
};

