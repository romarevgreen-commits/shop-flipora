const { required, json } = require('./_shared');

exports.handler = async () => {
  try {
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${required('STRIPE_SECRET_KEY')}` }
    });
    const body = await response.json();
    if (!response.ok) return json(500, { ok: false, error: body?.error?.message || 'Stripe account lookup failed' });
    return json(200, {
      ok: true,
      accountId: body.id,
      businessName: body.business_profile?.name || body.settings?.dashboard?.display_name || null,
      chargesEnabled: Boolean(body.charges_enabled),
      payoutsEnabled: Boolean(body.payouts_enabled),
      country: body.country || null
    });
  } catch (error) {
    return json(500, { ok: false, error: error.message || 'Diagnostic failed' });
  }
};
