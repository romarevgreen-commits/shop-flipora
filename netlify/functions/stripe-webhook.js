const { stripe, json, rest, required } = require("./_shared");

async function updateOrderByPaymentIntent(paymentIntentId, values) {
  if (!paymentIntentId) return;
  await rest(`orders?stripe_payment_intent_id=eq.${encodeURIComponent(paymentIntentId)}`, {
    method: "PATCH",
    body: JSON.stringify(values)
  });
}

function safeShippingDetails(session) {
  const details = session.shipping_details || session.collected_information?.shipping_details || null;
  const address = details?.address || null;
  if (!address) return { name: null, address: null };
  return {
    name: details.name || null,
    address: {
      line1: address.line1 || null,
      line2: address.line2 || null,
      city: address.city || null,
      state: address.state || null,
      postal_code: address.postal_code || null,
      country: address.country || null
    }
  };
}

async function completeListingPurchase(session) {
  const shipping = safeShippingDetails(session);
  const completed = await rest("rpc/complete_flipora_order", {
    method: "POST",
    body: JSON.stringify({
      p_checkout_session_id: session.id,
      p_payment_intent_id: session.payment_intent,
      p_paid_time: new Date().toISOString(),
      p_shipping_name: shipping.name,
      p_shipping_address: shipping.address
    })
  });

  if (completed === false && session.payment_intent) {
    await stripe().refunds.create({
      payment_intent: session.payment_intent,
      reverse_transfer: true,
      refund_application_fee: true,
      metadata: { reason: "listing_already_sold", checkout_session_id: session.id }
    }, {
      idempotencyKey: `flipora-duplicate-refund-${session.id}`
    });
  }
}

async function handlePaidSession(session) {
  if (session.metadata?.purchase_type === "seller_membership") {
    await rest(`profiles?id=eq.${encodeURIComponent(session.metadata.user_id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        membership_active: true,
        membership_paid_at: new Date().toISOString(),
        membership_checkout_session_id: session.id
      })
    });
    return;
  }

  if (session.metadata?.listing_id) await completeListingPurchase(session);
}

exports.handler = async (event) => {
  try {
    const signature = event.headers["stripe-signature"];
    const payload = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    const stripeEvent = stripe().webhooks.constructEvent(payload, signature, required("STRIPE_WEBHOOK_SECRET"));

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      if (session.payment_status === "paid") await handlePaidSession(session);
    }

    if (stripeEvent.type === "checkout.session.async_payment_succeeded") {
      await handlePaidSession(stripeEvent.data.object);
    }

    if (stripeEvent.type === "checkout.session.expired" || stripeEvent.type === "checkout.session.async_payment_failed") {
      const session = stripeEvent.data.object;
      await rest(`orders?stripe_checkout_session_id=eq.${encodeURIComponent(session.id)}&status=eq.pending`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" })
      });
    }

    if (stripeEvent.type === "charge.refunded") {
      const charge = stripeEvent.data.object;
      const sessions = await stripe().checkout.sessions.list({ payment_intent: charge.payment_intent, limit: 1 });
      const session = sessions.data?.[0];
      if (session?.metadata?.purchase_type === "seller_membership") {
        await rest(`profiles?id=eq.${encodeURIComponent(session.metadata.user_id)}`, {
          method: "PATCH",
          body: JSON.stringify({ membership_active: false })
        });
      } else {
        await updateOrderByPaymentIntent(charge.payment_intent, {
          status: "refunded",
          refunded_at: new Date().toISOString()
        });
      }
    }

    if (stripeEvent.type === "charge.dispute.created") {
      const dispute = stripeEvent.data.object;
      await updateOrderByPaymentIntent(dispute.payment_intent, {
        status: "disputed",
        disputed_at: new Date().toISOString()
      });
    }

    if (stripeEvent.type === "charge.dispute.closed" && stripeEvent.data.object.status === "won") {
      await updateOrderByPaymentIntent(stripeEvent.data.object.payment_intent, { status: "paid" });
    }

    return json(200, { received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return json(400, { error: `Webhook error: ${error.message}` });
  }
};
